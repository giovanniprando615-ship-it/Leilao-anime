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
  ServerToClientEvents
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

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3001',
      { autoConnect: false }
    ) as RoomSocket;
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);

      const savedRoomCode = localStorage.getItem(ROOM_CODE_KEY);
      const savedPlayerId = localStorage.getItem(PLAYER_ID_KEY);
      const savedPlayerName = localStorage.getItem(PLAYER_NAME_KEY) ?? 'Jogador';
      if (!savedRoomCode || !savedPlayerId) {
        return;
      }

      void emitWithAck<JoinRoomResult>((ack) => {
        socket.emit('room:join', {
          roomCode: savedRoomCode,
          playerId: savedPlayerId,
          playerName: savedPlayerName
        }, ack);
      }).then((response) => {
        if (!response.ok) {
          clearSession();
          roomRef.current = null;
          playerIdRef.current = null;
          setRoom(null);
          setPlayerId(null);
          setError(response.error);
          return;
        }
        playerIdRef.current = response.data?.playerId ?? savedPlayerId;
        setPlayerId(playerIdRef.current);
      }).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Não foi possível reassumir a sala.');
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => {
      setConnected(false);
      setError('Não foi possível conectar ao servidor de jogo.');
    });
    socket.on('room:state', (nextRoom) => {
      roomRef.current = nextRoom;
      setRoom(nextRoom);
      setServerOffsetMs(nextRoom.serverTime - Date.now());
      setError(null);
    });
    socket.on('room:closed', () => {
      clearSession();
      roomRef.current = null;
      playerIdRef.current = null;
      setRoom(null);
      setPlayerId(null);
      setError('Esta sala foi encerrada por inatividade.');
    });

    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

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
    options: { amountCents?: number; scenario?: BattleScenario } = {}
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

  return {
    room,
    playerId,
    connected,
    serverOffsetMs,
    busy,
    error,
    createRoom,
    joinRoom,
    sendAction,
    dismissError: () => setError(null)
  };
}
