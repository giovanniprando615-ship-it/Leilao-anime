import { createGameServer } from './server.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
if (allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN must contain at least one allowed origin.');
}

const gameServer = createGameServer({ allowedOrigins });
gameServer.httpServer.listen(port, () => {
  console.log(`Game server listening on port ${port}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}; shutting down game server.`);
  gameServer.stopCleanup();
  gameServer.io.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
