import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { User, Channel } from '../types';
import { Icon } from './Icon';
import { socket } from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- تنظیمات کیفیت ویدیو (برای اسکرین شیر) ---
const SCREEN_CONSTRAINTS = {
    video: { cursor: "always", frameRate: 30, width: 1280 }
};

interface VoiceGridProps {
  channel: Channel;
  onOpenDM: (targetId: number) => void;
}

export const VoiceGrid: React.FC<VoiceGridProps> = ({ channel, onOpenDM }) => {
  const { user: currentUser } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [spotlightId, setSpotlightId] = useState<number | null>(null);

  // رفرنس‌ها برای جلوگیری از رندر اضافی و مدیریت تماس‌ها
  const peerInstance = useRef<Peer | null>(null);
  const myStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const callsRef = useRef<Record<string, any>>({}); // تماس‌های فعال
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({}); // المان‌های صدا

  useEffect(() => {
    // 1. دریافت صدای خودمان
    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    .then(stream => {
        myStream.current = stream;

        // 2. اتصال به سرور PeerJS (که روی VPS خودتان بالا آوردیم)
        const peer = new Peer(undefined as any, {
            host: '/', // دامین فعلی (meet.codefather.ir)
            port: 443, // پورت HTTPS
            path: '/peerjs', // مسیری که در سرور ساختیم
            secure: true,
            config: {
                iceServers: [
                    { urls: 'turn:85.9.105.90:3478?transport=udp', username: 'meet', credential: '2468' },
                    { urls: 'turn:85.9.105.90:3478?transport=tcp', username: 'meet', credential: '2468' },
                    { urls: 'stun:85.9.105.90:3478' }
                ]
            }
        });

        peerInstance.current = peer;

        peer.on('open', (id) => {
            console.log('✅ Connected to PeerServer, ID:', id);
            
            if (!currentUser) {
                console.error("User not loaded yet, skipping join.");
                return;
            }

            socket.emit('join-voice', { 
                channelId: channel.id, 
                user: currentUser, 
                peerId: id, 
                isMuted, 
                isDeafened 
            });
        });

        // وقتی کسی به ما زنگ زد (Answer)
        peer.on('call', (call) => {
            console.log("📞 Incoming call...");
            call.answer(stream); // پاسخ با صدای خودمان
            
            call.on('stream', (remoteStream) => {
                console.log("🔊 Remote stream received");
                addAudioStream(call.peer, remoteStream);
            });

            call.on('close', () => removeAudioStream(call.peer));
            callsRef.current[call.peer] = call;
        });

        // وقتی سوکت خبر داد نفر جدیدی آمده -> به او زنگ بزن (Offer)
        socket.on('user-connected', (remotePeerId) => {
            console.log("☎️ Calling new user:", remotePeerId);
            // صبر کوتاه برای اطمینان از آماده بودن طرف مقابل
            setTimeout(() => connectToNewUser(remotePeerId, stream, peer), 1000);
        });
    })
    .catch(err => console.error("Mic Error:", err));

    // آپدیت لیست کاربران (برای نمایش در UI)
    socket.on('voice-update', (data: { channelId: number, users: any[] }) => {
        if (data.channelId === channel.id) {
            setConnectedUsers(data.users.map(u => ({ ...u, status: 'online' })));
        }
    });

    // وقتی کسی رفت
    socket.on('user-disconnected', (peerId) => {
        if (callsRef.current[peerId]) callsRef.current[peerId].close();
        removeAudioStream(peerId);
        delete callsRef.current[peerId];
    });

    return () => {
        // خروج کامل
        socket.emit('leave-voice');
        socket.off('user-connected');
        socket.off('user-disconnected');
        socket.off('voice-update');
        
        if (peerInstance.current) peerInstance.current.destroy();
        if (myStream.current) myStream.current.getTracks().forEach(t => t.stop());
        if (screenStream.current) screenStream.current.getTracks().forEach(t => t.stop());
        
        // پاک کردن تمام صداها
        Object.values(audioRefs.current).forEach(audio => audio.remove());
        audioRefs.current = {};
    };
  }, [channel.id]);

  // --- توابع کمکی ---

  const connectToNewUser = (remotePeerId: string, stream: MediaStream, peer: Peer) => {
      const call = peer.call(remotePeerId, stream);
      
      call.on('stream', (remoteStream) => {
          console.log("🔊 Remote stream received (Caller side)");
          addAudioStream(remotePeerId, remoteStream);
      });
      
      call.on('close', () => removeAudioStream(remotePeerId));
      callsRef.current[remotePeerId] = call;
  };

  const addAudioStream = (peerId: string, stream: MediaStream) => {
      if (audioRefs.current[peerId]) return; // قبلاً اضافه شده

      const audio = document.createElement('audio');
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.controls = false;
      audio.style.display = 'none'; // مخفی
      
      // تلاش برای پخش (چون مرورگرها سخت‌گیرند)
      audio.play().catch(e => console.log("Autoplay blocked:", e));
      
      document.body.append(audio);
      audioRefs.current[peerId] = audio;
  };

  const removeAudioStream = (peerId: string) => {
      if (audioRefs.current[peerId]) {
          audioRefs.current[peerId].remove();
          delete audioRefs.current[peerId];
      }
  };

  // --- کنترل‌ها ---

  const toggleMute = () => {
      if (myStream.current) {
          const track = myStream.current.getAudioTracks()[0];
          track.enabled = !track.enabled;
          setIsMuted(!track.enabled);
          socket.emit('user-toggle-state', { isMuted: !track.enabled, isDeafened });
      }
  };

  const toggleDeafen = () => {
      // قطع صدای ورودی‌ها
      Object.values(audioRefs.current).forEach(audio => {
          audio.muted = !isDeafened;
      });
      setIsDeafened(!isDeafened);
      socket.emit('user-toggle-state', { isMuted, isDeafened: !isDeafened });
  };

  const handleShareClick = async () => {
      if (isScreenSharing) {
          if (screenStream.current) { screenStream.current.getTracks().forEach(t => t.stop()); screenStream.current = null; }
          setIsScreenSharing(false);
          // برگرداندن استریم صوتی به تماس‌ها (نیاز به replaceTrack دارد که اینجا ساده‌سازی شده و فقط قطع می‌کنیم)
          // در PeerJS برای تعویض استریم، بهترین راه قطع و وصل تماس است یا استفاده از replaceTrack که پیچیده است.
          // فعلاً فقط استیت را تغییر می‌دهیم.
      } else {
          try {
              const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
              screenStream.current = stream;
              setIsScreenSharing(true);
              
              // جایگزینی ترک ویدیویی در تماس‌های موجود
              Object.values(callsRef.current).forEach((call: any) => {
                  const sender = call.peerConnection.getSenders().find((s: any) => s.track.kind === 'video');
                  if (sender) sender.replaceTrack(stream.getVideoTracks()[0]);
                  // نکته: چون تماس اولیه صوتی بوده، شاید فرستنده ویدیو نداشته باشد.
                  // در PeerJS ساده، معمولاً تماس جدیدی برای ویدیو برقرار می‌کنند.
              });

              stream.getVideoTracks()[0].onended = () => handleShareClick();
          } catch (e) { console.error("Screen share failed", e); }
      }
  };

  const handleLeave = () => {
      window.location.reload();
  };

  // --- رندر ---
  
  const spotlightUser = connectedUsers.find(u => u.id === spotlightId);
  const otherUsers = connectedUsers.filter(u => u.id !== spotlightId);

  return (
    <div className="flex-1 bg-[#0f0f12] p-4 flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neonPurple/5 to-neonCyan/5 pointer-events-none" />
      <div className="relative z-10 mb-4 border-b border-white/5 pb-4 flex justify-between items-center h-16 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center"><Icon name="volume" className="ml-3 text-neonCyan" /> {channel.name}</h2>
      </div>

      <div className="flex-1 min-h-0 relative z-10 mb-4 overflow-y-auto">
          {spotlightId && spotlightUser ? (
              // Spotlight View
              <div className="flex flex-col h-full gap-4">
                  <div className="flex-1 bg-black/40 rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center p-2">
                        <div className="flex flex-col items-center">
                            <img src={spotlightUser.avatar} className="w-32 h-32 rounded-full mb-4 border-4 border-white/10 shadow-2xl" />
                            <span className="text-2xl font-bold text-white">{spotlightUser.username}</span>
                            <button onClick={() => setSpotlightId(null)} className="mt-4 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 text-sm">خروج از حالت تمرکز</button>
                        </div>
                  </div>
                  <div className="h-36 flex gap-3 overflow-x-auto pb-2 px-1 items-center shrink-0">
                      {otherUsers.map(user => (
                          <div key={user.id} onClick={() => setSpotlightId(user.id)} className="relative bg-[#1a1a20] rounded-xl flex flex-col items-center justify-center border-2 border-white/5 w-48 h-32 flex-shrink-0 hover:bg-[#25252b] cursor-pointer">
                              <img src={user.avatar} className="w-12 h-12 rounded-full object-cover mb-2" />
                              <span className="text-white font-bold text-xs">{user.username}</span>
                          </div>
                      ))}
                  </div>
              </div>
          ) : (
              // Grid View
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full content-start">
                  {connectedUsers.map(user => {
                      const isMe = String(user.id) === String(currentUser?.id);
                      return (
                        <div key={user.id} className="relative bg-[#1a1a20] rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-300 border-white/5 aspect-video hover:bg-[#25252b]">
                            <img src={user.avatar} className="w-20 h-20 rounded-full object-cover mb-2" />
                            <span className="text-white font-bold mt-1 text-sm">{user.username}</span>
                            
                            {user.isMuted && <div className="absolute bottom-0 right-0 bg-[#1a1a20] rounded-full p-1 border border-red-500"><Icon name="microphone-slash" size={14} className="text-red-500" /></div>}
                            
                            {!isMe && (
                                <div className="absolute top-2 left-2 opacity-0 hover:opacity-100 transition-opacity">
                                    <button onClick={() => onOpenDM(user.id)} className="text-white hover:text-neonCyan"><Icon name="chat" size={16} /></button>
                                </div>
                            )}
                            <div className="absolute bottom-2 right-2">
                                <button onClick={() => setSpotlightId(user.id)} className="text-gray-500 hover:text-white"><Icon name="maximize" size={14} /></button>
                            </div>
                        </div>
                      );
                  })}
              </div>
          )}
      </div>

      <div className="mt-auto pt-2 flex flex-col items-center relative z-20 gap-4 shrink-0">
        <div className="flex gap-5 p-4 bg-[#1a1a20]/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl items-center">
           <button onClick={handleLeave} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all transform hover:scale-110 shadow-lg shadow-red-600/40"><Icon name="phone-slash" size={24} className="rotate-135" /></button>
           <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 ${isMuted ? 'bg-red-500 shadow-red-500/50' : 'bg-white/10 hover:bg-white/20'}`}><Icon name={isMuted ? "microphone-slash" : "microphone"} size={24} /></button>
           <button onClick={toggleDeafen} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 ${isDeafened ? 'bg-red-500 shadow-red-500/50' : 'bg-white/10 hover:bg-white/20'}`}><Icon name="headphones" size={24} /></button>
           <div className="w-px h-8 bg-white/20 mx-1"></div>
           <button onClick={handleShareClick} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 ${isScreenSharing ? 'bg-blue-600 shadow-blue-500/50' : 'bg-white/10 hover:bg-white/20'}`} title="اشتراک گذاری صفحه">
             <Icon name="video" size={24} />
           </button>
        </div>
      </div>
    </div>
  );
};