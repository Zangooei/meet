import { Channel, User, Message } from './types';

export const CURRENT_USER: User = {
  id: 1,
  username: 'امیرحسین', // Amirhossein
  avatar: 'https://picsum.photos/id/1005/200/200',
  status: 'online',
  isMuted: false,
  isDeafened: false,
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  { id: 2, username: 'سارا', avatar: 'https://picsum.photos/id/1011/200/200', status: 'idle', isSpeaking: true },
  { id: 3, username: 'محمد', avatar: 'https://picsum.photos/id/1012/200/200', status: 'dnd' },
  { id: 4, username: 'کیارش', avatar: 'https://picsum.photos/id/1025/200/200', status: 'online' },
  { id: 5, username: 'نگار', avatar: 'https://picsum.photos/id/1027/200/200', status: 'offline' },
];

export const INITIAL_CHANNELS: Channel[] = [
  { id: 101, name: 'عمومی', type: 'text', unreadCount: 0 },
  { id: 102, name: 'بازی‌ها', type: 'text', unreadCount: 3 },
  { id: 103, name: 'توسعه‌دهندگان', type: 'text', unreadCount: 0 },
  { id: 201, name: 'لابی صوتی', type: 'voice', users: [MOCK_USERS[1], MOCK_USERS[2]] },
  { id: 202, name: 'موزیک', type: 'voice', users: [] },
  { id: 203, name: 'جلسه فنی', type: 'voice', users: [MOCK_USERS[3]] },
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    content: 'سلام بچه‌ها! چطورید؟',
    userId: 2,
    channelId: 101,
    createdAt: new Date(Date.now() - 10000000).toISOString(),
  },
  {
    id: 2,
    content: 'سلام سارا، خوبیم. پروژه جدید چطور پیش میره؟',
    userId: 1,
    channelId: 101,
    createdAt: new Date(Date.now() - 9000000).toISOString(),
  },
  {
    id: 3,
    content: 'عالیه! تقریبا تمام شده.',
    userId: 2,
    channelId: 101,
    createdAt: new Date(Date.now() - 8000000).toISOString(),
  },
  {
    id: 4,
    content: null,
    fileUrl: 'https://picsum.photos/id/10/800/600',
    fileType: 'image',
    userId: 3,
    channelId: 101,
    createdAt: new Date(Date.now() - 500000).toISOString(),
  },
];