import { User, Message, Channel, LoginCredentials, RegisterCredentials, AuthResponse } from '../types';
import { INITIAL_CHANNELS, INITIAL_MESSAGES, MOCK_USERS } from '../constants';

// --- MOCK DATABASE (LocalStorage) ---
const DB_KEYS = {
  USERS: 'meet_users',
  CHANNELS: 'meet_channels',
  MESSAGES: 'meet_messages',
  CURRENT_USER_ID: 'meet_current_user_id',
  TOKEN: 'meet_auth_token'
};

// Initialize Mock DB if empty
const initDB = () => {
  if (!localStorage.getItem(DB_KEYS.USERS)) {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem(DB_KEYS.CHANNELS)) {
    localStorage.setItem(DB_KEYS.CHANNELS, JSON.stringify(INITIAL_CHANNELS));
  }
  if (!localStorage.getItem(DB_KEYS.MESSAGES)) {
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
  }
};

initDB();

// Helper: Simulate Network Delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: File to Base64 (Simulating File Upload to Server)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const api = {
  // --- AUTH ENDPOINTS ---
  
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    await delay(800);
    const users: User[] = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
    
    // In a real backend, we would hash/check password
    const user = users.find(u => u.username === credentials.username);
    
    if (!user) {
      throw new Error('نام کاربری یا رمز عبور اشتباه است');
    }

    const token = `mock_jwt_token_${user.id}_${Date.now()}`;
    localStorage.setItem(DB_KEYS.TOKEN, token);
    localStorage.setItem(DB_KEYS.CURRENT_USER_ID, String(user.id));
    
    return { user, token };
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    await delay(1500);
    const users: User[] = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
    
    if (users.find(u => u.username === credentials.username)) {
      throw new Error('این نام کاربری قبلاً گرفته شده است');
    }

    let avatarUrl = 'https://picsum.photos/200'; // Default
    if (credentials.avatar) {
      avatarUrl = await fileToBase64(credentials.avatar);
    }

    const newUser: User = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username: credentials.username,
      avatar: avatarUrl,
      status: 'online',
      isMuted: false,
      isDeafened: false
    };

    users.push(newUser);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    
    const token = `mock_jwt_token_${newUser.id}_${Date.now()}`;
    localStorage.setItem(DB_KEYS.TOKEN, token);
    localStorage.setItem(DB_KEYS.CURRENT_USER_ID, String(newUser.id));

    return { user: newUser, token };
  },

  logout: async () => {
    localStorage.removeItem(DB_KEYS.TOKEN);
    localStorage.removeItem(DB_KEYS.CURRENT_USER_ID);
  },

  checkSession: async (): Promise<User | null> => {
    await delay(500);
    const token = localStorage.getItem(DB_KEYS.TOKEN);
    const userId = localStorage.getItem(DB_KEYS.CURRENT_USER_ID);
    
    if (!token || !userId) return null;

    const users: User[] = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
    const user = users.find(u => u.id === Number(userId));
    
    return user || null;
  },

  // --- DATA ENDPOINTS ---

  getChannels: async (): Promise<Channel[]> => {
    return JSON.parse(localStorage.getItem(DB_KEYS.CHANNELS) || '[]');
  },

  getMessages: async (channelId: number): Promise<Message[]> => {
    const allMessages: Message[] = JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]');
    return allMessages.filter(m => m.channelId === channelId);
  },

  sendMessage: async (content: string, channelId: number, userId: number, file?: File): Promise<Message> => {
    await delay(300);
    const allMessages: Message[] = JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]');
    
    let fileUrl = undefined;
    let fileType: any = undefined;

    if (file) {
      fileUrl = await fileToBase64(file);
      fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
    }

    const newMessage: Message = {
      id: allMessages.length + 1,
      content,
      channelId,
      userId,
      fileUrl,
      fileType,
      createdAt: new Date().toISOString()
    };

    allMessages.push(newMessage);
    localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(allMessages));
    
    return newMessage;
  },
  
  getUsers: async (): Promise<User[]> => {
    return JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  }
};