import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from '@leilao/shared';
import { InMemoryRoomStore } from './room-store.js';
import { registerSocketHandlers } from './socket-handlers.js';
import type { RoomStore } from './room-store.js';

export interface GameServerOptions {
  allowedOrigins?: string[];
  roomStore?: RoomStore;
}

export function createGameServer(options: GameServerOptions = {}) {
  const app = express();
  const httpServer = createServer(app);
  const allowedOrigins = options.allowedOrigins ?? ['http://localhost:3000'];
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST']
      }
    }
  );
  const roomStore = options.roomStore ?? new InMemoryRoomStore();
  const stopCleanup = registerSocketHandlers(io, roomStore);

  app.get('/healthz', (_request, response) => {
    response.json({ status: 'ok' });
  });

  return {
    app,
    httpServer,
    io,
    roomStore,
    stopCleanup
  };
}
