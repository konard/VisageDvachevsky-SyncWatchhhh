/**
 * Room API Service
 * Handles HTTP requests for room management
 */

import api from '../lib/api';

export interface CreateRoomRequest {
  name?: string;
  maxParticipants: 2 | 3 | 4 | 5;
  password?: string;
  playbackControl: 'owner_only' | 'all' | 'selected';
}

export interface Room {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  maxParticipants: number;
  playbackControl: string;
  hasPassword: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface CreateRoomResponse {
  success: boolean;
  data: Room;
}

export class RoomApiService {
  /**
   * Create a new room
   */
  async createRoom(options: CreateRoomRequest): Promise<Room> {
    const { data } = await api.post<CreateRoomResponse>('/api/rooms', options);
    return data.data;
  }

  /**
   * Get room information by code
   */
  async getRoomByCode(code: string): Promise<Room> {
    const { data } = await api.get<CreateRoomResponse>(`/api/rooms/${code}`);
    return data.data;
  }
}

export const roomApiService = new RoomApiService();
