import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { VoiceGrid } from './components/VoiceGrid';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api, socket } from './services/api';
import { Channel, Message } from './types';

const MainApp = () => {
  const { user, logout, usersCache } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);

  // تابع باز کردن PV
  const handleOpenDM = async (targetUserId: number) => {
      if (!user) return;
      if (user.id === targetUserId) return; // با خودت نمیشه چت کرد

      try {
          const dmChannel = await api.openDirectMessage(user.id, targetUserId);
          
          // اگر کانال قبلا در لیست نبود، اضافه‌ش کن
          setChannels(prev => {
              if (!prev.find(c => c.id === dmChannel.id)) {
                  return [...prev, dmChannel];
              }
              return prev;
          });

          // برو به اون کانال
          handleSelectChannel(dmChannel.id);
      } catch (e) {
          console.error("Failed to open DM", e);
      }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        const fetchedChannels = await api.getChannels(user.id);
        setChannels(fetchedChannels);
        
        if (fetchedChannels.length > 0) {
          const initialId = fetchedChannels[0].id;
          setActiveChannelId(initialId);
          const msgs = await api.getMessages(initialId);
          setMessages(msgs);
          api.markChannelRead(initialId, user.id);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoadingChannels(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!activeChannelId) return;
    socket.emit('join-text', activeChannelId);

    const handleNewMessage = (msg: Message) => {
      if (activeChannelId === msg.channelId) {
        setMessages(prev => {
           if(prev.some(m => m.id === msg.id)) return prev;
           return [...prev, msg];
        });
        if (user) api.markChannelRead(msg.channelId, user.id);
      } else {
        setChannels(prev => prev.map(c => 
           c.id === msg.channelId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        ));
      }
    };

    // وقتی کسی به ما پیام خصوصی داد، لیست کانال‌ها آپدیت شه
    const handleDMUpdate = async (data: { participants: number[], channelId: number }) => {
        if (user && data.participants.includes(user.id)) {
            const freshChannels = await api.getChannels(user.id);
            setChannels(freshChannels);
        }
    };

    const handleVoiceUpdate = (data: { channelId: number, users: any[] }) => {
      setChannels(prevChannels => prevChannels.map(c => {
        if (c.id === data.channelId) {
          const updatedUsers = data.users.map(u => ({
            id: u.id, username: u.username, avatar: u.avatar, status: 'online',
            isSpeaking: u.isSpeaking || false, isMuted: u.isMuted, isDeafened: u.isDeafened, isScreenSharing: u.isScreenSharing
          }));
          return { ...c, users: updatedUsers };
        }
        return c;
      }));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('voice-update', handleVoiceUpdate);
    socket.on('dm-update', handleDMUpdate);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('voice-update', handleVoiceUpdate);
      socket.off('dm-update', handleDMUpdate);
    };
  }, [activeChannelId, user]);

  const handleSelectChannel = async (id: number) => {
    // چک کنیم کانال وجود دارد (ممکن است تازه اضافه شده باشد)
    // اگر در لیست نبود (باگ لحظه‌ای)، فعلاً کاری نکنیم یا دوباره فچ کنیم
    let targetChannel = channels.find(c => c.id === id);
    
    // اگر کانال جدید (DM) بود و هنوز در استیت نبود، موقتا پیداش کنیم
    if (!targetChannel) {
        const fresh = await api.getChannels(user?.id);
        targetChannel = fresh.find(c => c.id === id);
        if(targetChannel) setChannels(fresh);
    }

    if (!targetChannel) return;

    setActiveChannelId(id);

    if (targetChannel.type === 'text' || targetChannel.type === 'dm') {
      const msgs = await api.getMessages(id);
      setMessages(msgs);
      if (user) {
          api.markChannelRead(id, user.id);
          setChannels(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
      }
    } 
  };

  const handleSendMessage = async (text: string, file?: File) => {
    if (!user) return;
    try {
      await api.sendMessage(text, activeChannelId, user.id, file);
    } catch (e) { console.error("Failed to send", e); }
  };

  if (!user) return null;
  if (isLoadingChannels) return <div className="flex h-screen w-screen items-center justify-center bg-[#0f0f12] text-white">در حال بارگزاری اطلاعات ...</div>;

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f0f12] text-gray-200 font-sans" dir="rtl">
      <Sidebar 
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        currentUser={user}
        usersCache={usersCache} // ارسال لیست یوزرها برای نمایش نام درست در سایدبار
      />
      <main className="flex-1 flex flex-col min-w-0 bg-[#0f0f12] relative z-10">
        <div className="absolute top-4 left-4 z-50">
             <button onClick={logout} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded border border-red-500/20 text-xs transition-colors">خروج</button>
        </div>
        {activeChannel?.type === 'voice' ? (
           <VoiceGrid channel={activeChannel} onOpenDM={handleOpenDM} />
        ) : (
           <ChatArea 
             channel={activeChannel}
             messages={messages}
             users={usersCache}
             onSendMessage={handleSendMessage}
             onOpenDM={handleOpenDM} // ارسال تابع به چت برای کلیک روی آواتارها
           />
        )}
      </main>
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonPurple/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neonCyan/5 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">Loading...</div>;
  return isAuthenticated ? <MainApp /> : <AuthPage />;
};
export default App;