import type { RoomCode } from '@leilao/shared';

export class RoomLock {
  private readonly tails = new Map<RoomCode, Promise<void>>();

  async run<T>(roomCode: RoomCode, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(roomCode) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(roomCode, current);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(roomCode) === current) {
        this.tails.delete(roomCode);
      }
    }
  }
}
