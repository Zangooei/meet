export interface User {
  id: number;
  username: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
}

export interface Channel {
  id: number;
  name: string;
  type: 'text' | 'voice';
  unreadCount?: number;
  users?: User[]; // For voice channels, list connected users
}

export interface Message {
  id: number;
  content?: string;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'file';
  userId: number;
  channelId: number;
  createdAt: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface RegisterCredentials {
  username: string;
  password?: string;
  avatar?: File;
}