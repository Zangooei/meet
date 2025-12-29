export interface User {
  id: number;
  username: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  bio?: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
}

export interface Message {
  id: number;
  content: string;
  channelId: number;
  userId: number;
  createdAt: string;
  isEdited?: boolean;
  replyTo?: Message;
  attachment?: {
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    name?: string;
    size?: number;
  };
}

export interface Channel {
  id: number;
  name: string;
  type: 'text' | 'voice' | 'dm';
  users?: User[];
  unreadCount?: number;
  participants?: number[];
}

export interface LoginCredentials { username: string; password: string; }
export interface RegisterCredentials { username: string; password: string; avatar?: File; }
export interface AuthResponse { user: User; token: string; }