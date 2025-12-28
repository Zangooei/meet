import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { VoiceGrid } from './components/VoiceGrid';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Channel, Message } from './types';

// Extend Window interface for PeerJS
declare global {
  interface Window {
    Peer: any;
  }
}

const MainApp = () => {
  const { user, logout, usersCache } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<number>(101);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<number | null>(null);
  const [peer, setPeer] = useState<any>(null);

  // Load Initial Data
  useEffect(() => {
    const fetchData = async () => {
      const fetchedChannels = await api.getChannels();
      setChannels(fetchedChannels);
      
      // Default to first channel
      if (fetchedChannels.length > 0) {
        setActiveChannelId(fetchedChannels[0].id);
        const msgs = await api.getMessages(fetchedChannels[0].id);
        setMessages(msgs);
      }
    };
    fetchData();
  }, []);

  // Poll for messages (Simulating Socket.io 'new-message' event)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (activeChannelId) {
        const msgs = await api.getMessages(activeChannelId);
        // Only update if length changed (simple check for demo)
        setMessages(prev => {
          if (prev.length !== msgs.length) return msgs;
          return prev;
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeChannelId]);

  // Handle Channel Selection
  const handleSelectChannel = async (id: number) => {
    const targetChannel = channels.find(c => c.id === id);
    if (!targetChannel) return;

    setActiveChannelId(id);

    if (targetChannel.type === 'text') {
      const msgs = await api.getMessages(id);
      setMessages(msgs);
    } 
    else if (targetChannel.type === 'voice') {
       if (connectedVoiceChannelId !== id) {
           joinVoiceChannel(id);
       }
    }
  };

  const joinVoiceChannel = (channelId: number) => {
    if (!user) return;

    console.log(`Connecting to voice channel ${channelId} via PeerJS...`);
    setConnectedVoiceChannelId(channelId);

    // --- VPS SELF-HOSTED PEERJS CONFIGURATION ---
    // To use your own VPS, uncomment and update the object below:
    /*
    const peerOptions = {
        host: 'your-vps-ip-address.com',
        port: 9000,
        path: '/myapp',
        secure: true, // true if you have SSL
    };
    */
   
    // For this demo to work immediately without your VPS, we use default cloud:
    const peerOptions = { debug: 2 }; 
    
    const newPeer = new window.Peer(undefined, peerOptions);

    newPeer.on('open', (id: string) => {
      console.log('My peer ID is: ' + id);
    });
    
    newPeer.on('error', (err: any) => {
        console.error("PeerJS Error:", err);
    });
    
    // Simulate user joining in UI state (Optimistic UI)
    setChannels(prev => prev.map(c => {
        // Remove from old
        if (c.id === connectedVoiceChannelId) {
             return { ...c, users: c.users?.filter(u => u.id !== user.id) };
        }
        // Add to new
        if (c.id === channelId) {
            return { ...c, users: [...(c.users || []), { ...user, isSpeaking: false }] };
        }
        return c;
    }));

    setPeer(newPeer);
  };

  const handleSendMessage = async (text: string, file?: File) => {
    if (!user) return;
    try {
      await api.sendMessage(text, activeChannelId, user.id, file);
      // State updates automatically via polling in this architecture, 
      // but for instant feedback we can fetch immediately
      const msgs = await api.getMessages(activeChannelId);
      setMessages(msgs);
    } catch (e) {
      console.error("Failed to send", e);
    }
  };

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

  if (!user || !activeChannel) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f0f12] text-gray-200 font-sans" dir="rtl">
      {/* Sidebar */}
      <Sidebar 
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        currentUser={user}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0f0f12] relative z-10">
        <div className="absolute top-4 left-4 z-50">
             <button onClick={logout} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded border border-red-500/20 text-xs transition-colors">
                 خروج از حساب
             </button>
        </div>

        {activeChannel.type === 'text' ? (
           <ChatArea 
             channel={activeChannel}
             messages={messages}
             users={usersCache}
             onSendMessage={handleSendMessage}
           />
        ) : (
           <VoiceGrid channel={activeChannel} />
        )}
      </main>
      
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonPurple/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neonCyan/5 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};

// Root Component wrapping Auth
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neonCyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <MainApp /> : <AuthPage />;
};

export default App;