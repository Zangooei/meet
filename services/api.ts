import { io, Socket } from 'socket.io-client';
import { User, Message, Channel, LoginCredentials, RegisterCredentials, AuthResponse } from '../types';

const API_URL = '/api'; 
export const socket = io("https://meet.codefather.ir", {
  transports: ["websocket"], // این خط حیاتیه
  upgrade: false
});

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const api = {
  login: async (creds: LoginCredentials): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds) });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    localStorage.setItem('meet_token', data.token);
    localStorage.setItem('meet_user', JSON.stringify(data.user));
    return data;
  },

  register: async (creds: RegisterCredentials): Promise<AuthResponse> => {
    let avatarBase64 = undefined;
    if (creds.avatar && creds.avatar instanceof File) avatarBase64 = await fileToBase64(creds.avatar);
    const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: creds.username, password: creds.password, avatar: avatarBase64 }) });
    if (!res.ok) throw new Error('Register failed');
    const data = await res.json();
    localStorage.setItem('meet_token', data.token);
    localStorage.setItem('meet_user', JSON.stringify(data.user));
    return data;
  },

  logout: () => { localStorage.removeItem('meet_token'); localStorage.removeItem('meet_user'); socket.disconnect(); window.location.reload(); },
  
  checkSession: async (): Promise<User | null> => {
    const stored = localStorage.getItem('meet_user');
    if (stored) { socket.connect(); return JSON.parse(stored); }
    return null;
  },

  updateProfile: async (userId: number, status?: string, bio?: string) => {
      await fetch(`${API_URL}/users/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, status, bio }) });
  },

  getChannels: async (userId?: number): Promise<Channel[]> => {
    const res = await fetch(userId ? `${API_URL}/channels?userId=${userId}` : `${API_URL}/channels`);
    return res.json();
  },

  markChannelRead: async (channelId: number, userId: number) => {
    await fetch(`${API_URL}/channels/${channelId}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
  },

  openDirectMessage: async (myId: number, targetId: number): Promise<Channel> => {
    const res = await fetch(`${API_URL}/dm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ myId, targetId }) });
    return res.json();
  },

  getMessages: async (channelId: number): Promise<Message[]> => {
    const res = await fetch(`${API_URL}/messages/${channelId}`);
    return res.json();
  },

  uploadFile: async (file: File): Promise<{ url: string, filename: string, mimetype: string, size: number }> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
  },

  sendMessage: async (content: string, channelId: number, userId: number, file?: File, replyToId?: number): Promise<Message> => {
    let attachment = undefined;
    if (file) {
        try {
            const up = await api.uploadFile(file);
            let type: any = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else if (file.type.startsWith('video/')) type = 'video';
            attachment = { type, url: up.url, name: up.filename, size: up.size };
        } catch (e) { console.error("Upload error", e); throw e; }
    }
    const res = await fetch(`${API_URL}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, channelId, userId, attachment, replyToId }) });
    return res.json();
  },

  editMessage: async (id: number, content: string) => {
      await fetch(`${API_URL}/messages/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
  },

  deleteMessage: async (id: number) => {
      await fetch(`${API_URL}/messages/${id}`, { method: 'DELETE' });
  },

  getUsers: async (): Promise<User[]> => { const res = await fetch(`${API_URL}/users`); return res.json(); }
};