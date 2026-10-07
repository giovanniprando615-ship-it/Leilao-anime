import type { RoomCode, RoomState } from '@leilao/shared';

export type StoredRoom = Omit<RoomState, 'serverTime'> & {
  lastActivityAt: number;
};

export interface RoomStore {
  get(roomCode: RoomCode): Promise<StoredRoom | null>;
  save(room: StoredRoom): Promise<void>;
  delete(roomCode: RoomCode): Promise<void>;
  list(): Promise<StoredRoom[]>;
  deleteIfInactive(roomCode: RoomCode, inactiveBefore: number): Promise<StoredRoom | null>;
}

export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<RoomCode, StoredRoom>();

  async get(roomCode: RoomCode): Promise<StoredRoom | null> {
    const room = this.rooms.get(roomCode);
    return room ? structuredClone(room) : null;
  }

  async save(room: StoredRoom): Promise<void> {
    this.rooms.set(room.roomCode, structuredClone(room));
  }

  async delete(roomCode: RoomCode): Promise<void> {
    this.rooms.delete(roomCode);
  }

  async list(): Promise<StoredRoom[]> {
    return Array.from(this.rooms.values(), (room) => structuredClone(room));
  }

  async deleteIfInactive(roomCode: RoomCode, inactiveBefore: number): Promise<StoredRoom | null> {
    const room = this.rooms.get(roomCode);
    if (!room || room.lastActivityAt > inactiveBefore) {
      return null;
    }

    this.rooms.delete(roomCode);
    return structuredClone(room);
  }
}
