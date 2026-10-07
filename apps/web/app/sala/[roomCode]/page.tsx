'use client';

import { useParams } from 'next/navigation';
import GameApp from '../../game-app';

export default function RoomPage() {
  const params = useParams<{ roomCode: string }>();
  return <GameApp initialRoomCode={params.roomCode} />;
}
