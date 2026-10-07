'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AckResponse,
  AnimeSeries,
  BattleScenario,
  BidPayload,
  ClientToServerEvents,
  CreateRoomResult,
  JoinRoomResult,
  RoomActionPayload,
  RoomCode,
  RoomState,
  ServerToClientEvents,
  SetReadyPayload,
  SetRoomSeriesPayload
} from '@leilao/shared';

const ROOM_CODE_KEY = 'leilao.roomCode';
const PLAYER_ID_KEY = 'leilao.playerId';
const PLAYER_NAME_KEY = 'leilao.playerName';

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type RoomActionName =
  | 'auction:start'
  | 'auction:bid'
  | 'auction:pass'
  | 'auction:restart'
  | 'room:set-series'
  | 'lobby:set-ready'
  | 'battle:start';

function emitWithAck<T>(
  send: (ack: (response: AckResponse<T>) => void) => void
): Promise<AckResponse<T>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('O servidor não respondeu a tempo.')), 8_000);
    send((response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

function saveSession(roomCode: RoomCode, playerId: string, playerName: string): void {
  localStorage.setItem(ROOM_CODE_KEY, roomCode);
  localStorage.setItem(PLAYER_ID_KEY, playerId);
  localStorage.setItem(PLAYER_NAME_KEY, playerName);
}

function clearSession(): void {
  localStorage.removeItem(ROOM_CODE_KEY);
  localStorage.removeItem(PLAYER_ID_KEY);
  localStorage.removeItem(PLAYER_NAME_KEY);
}

export function useRoom() {
  const socketRef = useRef<RoomSocket | null>(null);
  const roomRef = useRef<RoomState | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [recoveryIssue, setRecoveryIssue] = useState(false);
  const [shouldReturnHome, setShouldReturnHome] = useState(false);
  const retryRestoreRef = useRef<(() => void) | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = setTimeout(() => {
      noticeTimeoutRef.current = null;
      setNotice(null);
    }, 4_000);
  }, []);

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001',
      { autoConnect: false }
    ) as RoomSocket;
    socketRef.current = socket;
    let restoreTimeout: ReturnType<typeof setTimeout> | null = null;

    function clearRestoreTimeout(): void {
      if (restoreTimeout) {
        clearTimeout(restoreTimeout);
        restoreTimeout = null;
      }
    }

    function startRestoreTimeout(): void {
      if (restoreTimeout) {
        return;
      }
      setRestoring(true);
      restoreTimeout = setTimeout(() => {
        restoreTimeout = null;
        setRestoring(false);
        setRecoveryIssue(true);
        setError('A reconexão está demorando. Você pode tentar novamente ou voltar ao início.');
      }, 10_000);
    }

    function restoreSavedSession(): void {
      const savedRoomCode = localStorage.getItem(ROOM_CODE_KEY);
      const savedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
      const savedPlayerName = localStorage.getItem(PLAYER_NAME_KEY) ?? 'Jogador';
      if (!savedRoomCode || !savedPlayerId) {
        setRestoring(false);
        setRecoveryIssue(false);
        clearRestoreTimeout();
        return;
      }

      startRestoreTimeout();
      void emitWithAck<JoinRoomResult>((ack) => {
        socket.emit('room:join', {
          roomCode: savedRoomCode,
          playerId: savedPlayerId,
          playerName: savedPlayerName
        }, ack);
      }).then((response) => {
        clearRestoreTimeout();
        setRestoring(false);
        if (!response.ok) {
          clearSession();
          roomRef.current = null;
          playerIdRef.current = null;
          setRoom(null);
          setPlayerId(null);
          setRecoveryIssue(false);
          setShouldReturnHome(true);
          setError(response.error.includes('Sala não encontrada')
            ? 'Essa sala não existe mais. A sessão antiga foi removida.'
            : 'Não foi possível reassumir essa sala. A sessão antiga foi removida.');
          return;
        }
        setRecoveryIssue(false);
        setShouldReturnHome(false);
        playerIdRef.current = response.data?.playerId ?? savedPlayerId;
        setPlayerId(playerIdRef.current);
      }).catch((cause: unknown) => {
        clearRestoreTimeout();
        setRestoring(false);
        setRecoveryIssue(true);
        setError(cause instanceof Error ? cause.message : 'Não foi possível reassumir a sala.');
      });
    }

    retryRestoreRef.current = () => {
      setError(null);
      setRecoveryIssue(false);
      setShouldReturnHome(false);
      if (socket.connected) {
        restoreSavedSession();
      } else {
        startRestoreTimeout();
        socket.connect();
      }
    };

    socket.on('connect', () => {
      setConnected(true);
      setError(null);

      restoreSavedSession();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      if (localStorage.getItem(ROOM_CODE_KEY) && localStorage.getItem(PLAYER_ID_KEY)) {
        startRestoreTimeout();
      }
    });
    socket.on('connect_error', () => {
      setConnected(false);
      setError('Não foi possível conectar ao servidor de jogo.');
    });
    socket.on('room:state', (nextRoom) => {
      const previousRoom = roomRef.current;
      const currentPlayerId = playerIdRef.current;
      if (previousRoom && nextRoom.phase === 'AUCTION' && nextRoom.auction) {
        const previousSaleAt = previousRoom.auction?.lastSale?.resolvedAt;
        const latestSale = nextRoom.auction.lastSale;
        if (latestSale && latestSale.resolvedAt !== previousSaleAt) {
          const characterName = latestSale.characterId.replaceAll('-', ' ');
          showNotice(latestSale.playerId === currentPlayerId
            ? `Você levou ${characterName}!`
            : `${characterName} foi para o adversário.`);
        } else if (
          previousRoom.auction?.currentCharacterId === nextRoom.auction.currentCharacterId
          && previousRoom.auction.leadingPlayerId !== nextRoom.auction.leadingPlayerId
          && nextRoom.auction.leadingPlayerId
        ) {
          showNotice(nextRoom.auction.leadingPlayerId === currentPlayerId
            ? 'Você assumiu a liderança do lote.'
            : 'Seu lance foi superado.');
        }
      }
      const reconnectedPlayer = nextRoom.players.find((player) => (
        player.connected
        && previousRoom?.players.some((previous) => previous.playerId === player.playerId && !previous.connected)
      ));
      if (reconnectedPlayer) {
        showNotice(`${reconnectedPlayer.name} reconectou.`);
      }
      roomRef.current = nextRoom;
      setRoom(nextRoom);
      setRestoring(false);
      setRecoveryIssue(false);
      setShouldReturnHome(false);
      clearRestoreTimeout();
      setServerOffsetMs(nextRoom.serverTime - Date.now());
      setError(null);
    });
    socket.on('room:closed', () => {
      clearSession();
      roomRef.current = null;
      playerIdRef.current = null;
      setRoom(null);
      setPlayerId(null);
      setRecoveryIssue(false);
      setError('Esta sala foi encerrada por inatividade.');
      setShouldReturnHome(true);
    });

    socket.connect();
    if (localStorage.getItem(ROOM_CODE_KEY) && localStorage.getItem(PLAYER_ID_KEY)) {
      startRestoreTimeout();
    }
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      clearRestoreTimeout();
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
      noticeTimeoutRef.current = null;
      retryRestoreRef.current = null;
      socketRef.current = null;
    };
  }, [showNotice]);

  const createRoom = useCallback(async (playerName: string, series: AnimeSeries) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Conecte-se ao servidor antes de criar uma sala.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await emitWithAck<CreateRoomResult>((ack) => {
        socket.emit('room:create', { playerName, series }, ack);
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (!response.data) {
        throw new Error('O servidor não retornou as credenciais da sala.');
      }

      saveSession(response.data.roomCode, response.data.playerId, playerName);
      playerIdRef.current = response.data.playerId;
      setPlayerId(response.data.playerId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a sala.');
    } finally {
      setBusy(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Conecte-se ao servidor antes de entrar em uma sala.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await emitWithAck<JoinRoomResult>((ack) => {
        socket.emit('room:join', { roomCode, playerName }, ack);
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (!response.data) {
        throw new Error('O servidor não retornou o identificador do jogador.');
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      saveSession(normalizedCode, response.data.playerId, playerName);
      playerIdRef.current = response.data.playerId;
      setPlayerId(response.data.playerId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar na sala.');
    } finally {
      setBusy(false);
    }
  }, []);

  const sendAction = useCallback(async (
    action: RoomActionName,
    options: { amountCents?: number; scenario?: BattleScenario; series?: AnimeSeries; ready?: boolean } = {}
  ) => {
    const socket = socketRef.current;
    const currentRoom = roomRef.current;
    const currentPlayerId = playerIdRef.current;
    if (!socket?.connected || !currentRoom || !currentPlayerId) {
      setError('Você não está conectado a uma sala.');
      return;
    }

    const roomAction: RoomActionPayload = {
      roomCode: currentRoom.roomCode,
      playerId: currentPlayerId
    };
    setBusy(true);
    setError(null);
    try {
      const response = await emitWithAck<void>((ack) => {
        if (action === 'auction:bid') {
          const payload: BidPayload = { ...roomAction, amountCents: options.amountCents ?? 0 };
          socket.emit(action, payload, ack);
          return;
        }
        if (action === 'battle:start') {
          socket.emit(action, {
            ...roomAction,
            scenario: options.scenario ?? 'STANDARD'
          }, ack);
          return;
        }
        if (action === 'room:set-series') {
          const payload: SetRoomSeriesPayload = {
            ...roomAction,
            series: options.series ?? 'ONE_PIECE'
          };
          socket.emit(action, payload, ack);
          return;
        }
        if (action === 'lobby:set-ready') {
          const payload: SetReadyPayload = {
            ...roomAction,
            ready: options.ready ?? false
          };
          socket.emit(action, payload, ack);
          return;
        }
        socket.emit(action, roomAction, ack);
      });
      if (!response.ok) {
        setError(response.error);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  }, []);

  const leaveRoom = useCallback(async (): Promise<boolean> => {
    const socket = socketRef.current;
    const currentRoom = roomRef.current;
    const currentPlayerId = playerIdRef.current;
    if (!socket?.connected || !currentRoom || !currentPlayerId) {
      setError('A conexão com a sala foi perdida. A sessão local foi encerrada.');
      clearSession();
      roomRef.current = null;
      playerIdRef.current = null;
      setRoom(null);
      setPlayerId(null);
      return true;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await emitWithAck<void>((ack) => {
        socket.emit('room:leave', {
          roomCode: currentRoom.roomCode,
          playerId: currentPlayerId
        }, ack);
      });
      if (!response.ok) {
        if (response.error.includes('Sala não encontrada') || response.error.includes('não pertence')) {
          clearSession();
          roomRef.current = null;
          playerIdRef.current = null;
          setRoom(null);
          setPlayerId(null);
          setRecoveryIssue(false);
          return true;
        }
        setError(response.error);
        return false;
      }
      clearSession();
      roomRef.current = null;
      playerIdRef.current = null;
      setRoom(null);
      setPlayerId(null);
      setRecoveryIssue(false);
      return true;
    } catch (cause) {
      socket.disconnect();
      clearSession();
      roomRef.current = null;
      playerIdRef.current = null;
      setRoom(null);
      setPlayerId(null);
      setRecoveryIssue(false);
      setError(cause instanceof Error ? cause.message : 'A sessão local foi encerrada sem confirmação do servidor.');
      socket.connect();
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  const returnToHome = useCallback(() => {
    clearSession();
    roomRef.current = null;
    playerIdRef.current = null;
    setRoom(null);
    setPlayerId(null);
    setRecoveryIssue(false);
    setShouldReturnHome(false);
    setError(null);
  }, []);

  const retryRestore = useCallback(() => retryRestoreRef.current?.(), []);

  return {
    room,
    playerId,
    connected,
    serverOffsetMs,
    busy,
    error,
    notice,
    dismissNotice: () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = null;
      }
      setNotice(null);
    },
    restoring,
    recoveryIssue,
    shouldReturnHome,
    createRoom,
    joinRoom,
    leaveRoom,
    returnToHome,
    retryRestore,
    sendAction,
    dismissError: () => setError(null)
  };
}
