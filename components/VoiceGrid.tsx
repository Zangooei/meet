import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { User, Channel } from '../types';
import { Icon } from './Icon';
import { socket } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface VoiceGridProps {
  channel: Channel;
  onOpenDM: (targetId: number) => void;
}

const QUALITY_PRESETS = {
    low: { label: 'صرفه‌جویی (720p)', constraints: { width: 1280, height: 720, frameRate: 15 } },
    high: { label: 'کیفیت بالا (1080p)', constraints: { width: 1920, height: 1080, frameRate: 30 } }
};

export const VoiceGrid: React.FC<VoiceGridProps> = ({ channel, onOpenDM }) => {
  const { user: currentUser } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [spotlightId, setSpotlightId] = useState<number | null>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Record<number, boolean>>({});
  
  // برای رندر مجدد کامپوننت وقتی استریم جدید می‌رسد
  const [, forceUpdate] = useState(0);

  const peerInstance = useRef<Peer | null>(null);
  const myStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const callsRef = useRef<Record<string, any>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const remoteStreams = useRef<Record<number, MediaStream>>({});
  const peerIdMapRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- توابع کمکی ---
  
  const setupAudioAnalysis = (stream: MediaStream, userId: number) => {
      try {
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') ctx.resume();

          if (stream.getAudioTracks().length === 0) return;

          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          
          const checkVolume = () => {
              if (!stream.active) return;
              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(dataArray);
              
              let sum = 0;
              for(let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const average = sum / dataArray.length;

              setSpeakingUsers(prev => {
                  const isSpeaking = average > 15;
                  if (prev[userId] === isSpeaking) return prev;
                  return { ...prev, [userId]: isSpeaking };
              });
              requestAnimationFrame(checkVolume);
          };
          checkVolume();
      } catch (e) { console.error("Audio analysis setup failed", e); }
  };

  const addMediaStream = (peerId: string, stream: MediaStream) => {
      // 1. مدیریت صدا
      if (!audioRefs.current[peerId]) {
          const audio = document.createElement('audio');
          audio.srcObject = stream;
          audio.autoplay = true;
          audio.style.display = 'none';
          // اگر خودمان Deafen هستیم، صدای جدید را هم قطع کن
          audio.muted = isDeafened; 
          
          audio.play().catch(e => console.log("Autoplay blocked:", e));
          document.body.append(audio);
          audioRefs.current[peerId] = audio;
      } else {
          // اگر المنت صدا بود، فقط استریم را آپدیت کن
          audioRefs.current[peerId].srcObject = stream;
          audioRefs.current[peerId].play().catch(() => {});
      }

      // 2. مدیریت ویدیو (برای Spotlight)
      const userId = peerIdMapRef.current[peerId];
      if (userId) {
          remoteStreams.current[userId] = stream;
          setupAudioAnalysis(stream, userId);
          // اجبار به رندر مجدد تا ویدیو ظاهر شود
          forceUpdate(n => n + 1);
      }
  };

  // هندلر مشترک برای تماس‌ها
  const registerCallEvents = (call: any, peerId: string) => {
      call.on('stream', (remoteStream: MediaStream) => {
          addMediaStream(peerId, remoteStream);
      });
      call.on('close', () => {
          if (audioRefs.current[peerId]) {
              audioRefs.current[peerId].remove();
              delete audioRefs.current[peerId];
          }
          const userId = peerIdMapRef.current[peerId];
          if (userId) delete remoteStreams.current[userId];
      });
      callsRef.current[peerId] = call;
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    .then(stream => {
        myStream.current = stream;
        if (currentUser) setupAudioAnalysis(stream, currentUser.id);

        const peer = new Peer(undefined as any, {
            host: '/',
            port: 443,
            path: '/peerjs',
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
            socket.emit('join-voice', { channelId: channel.id, user: currentUser, peerId: id, isMuted, isDeafened });
        });

        peer.on('call', (call) => {
            call.answer(stream); // پاسخ همیشه با صدای میکروفون ماست
            registerCallEvents(call, call.peer);
        });

        socket.on('user-connected', (remotePeerId) => {
            // وقتی کاربر جدید می‌آید، چک می‌کنیم آیا در حال اشتراک‌گذاری هستیم یا نه
            setTimeout(() => connectToNewUser(remotePeerId, stream, peer), 1000);
        });
    })
    .catch(err => console.error("Mic Error:", err));

    socket.on('voice-update', (data: { channelId: number, users: any[] }) => {
        if (data.channelId === channel.id) {
            setConnectedUsers(data.users.map(u => ({ ...u, status: 'online' })));
            const newMap: Record<string, number> = {};
            data.users.forEach(u => { if (u.peerId) newMap[u.peerId] = u.id; });
            peerIdMapRef.current = newMap;
        }
    });

    socket.on('user-disconnected', (peerId) => {
        if (callsRef.current[peerId]) callsRef.current[peerId].close();
    });

    return () => {
        socket.emit('leave-voice');
        socket.off('user-connected');
        socket.off('user-disconnected');
        socket.off('voice-update');
        if (peerInstance.current) peerInstance.current.destroy();
        if (myStream.current) myStream.current.getTracks().forEach(t => t.stop());
        if (screenStream.current) screenStream.current.getTracks().forEach(t => t.stop());
        Object.values(audioRefs.current).forEach(audio => audio.remove());
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [channel.id]);

  // اتصال به کاربر جدید (هوشمند: اگر اسکرین شیر بود، تصویر هم بفرست)
  const connectToNewUser = (remotePeerId: string, baseAudioStream: MediaStream, peer: Peer) => {
      let streamToSend = baseAudioStream;
      
      // اگر در حال اشتراک‌گذاری هستیم، استریم ترکیبی بساز
      if (screenStream.current) {
          streamToSend = new MediaStream([
              ...baseAudioStream.getAudioTracks(),
              ...screenStream.current.getVideoTracks()
          ]);
      }

      const call = peer.call(remotePeerId, streamToSend);
      registerCallEvents(call, remotePeerId);
  };

  const toggleMute = () => {
      if (myStream.current) {
          const track = myStream.current.getAudioTracks()[0];
          track.enabled = !track.enabled;
          setIsMuted(!track.enabled);
          socket.emit('user-toggle-state', { isMuted: !track.enabled, isDeafened });
      }
  };

  const toggleDeafen = () => {
      const newState = !isDeafened;
      Object.values(audioRefs.current).forEach(audio => { audio.muted = newState; });
      setIsDeafened(newState);
      socket.emit('user-toggle-state', { isMuted, isDeafened: newState });
  };

  // --- لاجیک اسکرین شیر (اصلاح شده: تماس مجدد) ---

  const initiateScreenShare = () => {
      if (isScreenSharing) {
          stopScreenShare();
      } else {
          setShowQualityModal(true);
      }
  };

  const stopScreenShare = () => {
      if (screenStream.current) { 
          screenStream.current.getTracks().forEach(t => t.stop()); 
          screenStream.current = null; 
      }
      setIsScreenSharing(false);

      // تماس مجدد با همه (فقط صدا)
      if (myStream.current && peerInstance.current) {
          Object.keys(callsRef.current).forEach(peerId => {
              if (callsRef.current[peerId]) callsRef.current[peerId].close();
              const call = peerInstance.current!.call(peerId, myStream.current!);
              registerCallEvents(call, peerId);
          });
      }
  };

  const startScreenShare = async (qualityKey: 'low' | 'high') => {
      setShowQualityModal(false);
      try {
          const constraints = QUALITY_PRESETS[qualityKey].constraints;
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: constraints, audio: false });
          
          screenStream.current = displayStream;
          setIsScreenSharing(true);
          
          // ساخت استریم ترکیبی (میکروفون + تصویر)
          const mixedStream = new MediaStream();
          if (myStream.current) myStream.current.getAudioTracks().forEach(t => mixedStream.addTrack(t));
          displayStream.getVideoTracks().forEach(t => mixedStream.addTrack(t));

          // تماس مجدد با همه اعضا با استریم جدید
          if (peerInstance.current) {
              Object.keys(callsRef.current).forEach(peerId => {
                  // بستن تماس قبلی (حیاتی برای اعمال تغییرات)
                  if (callsRef.current[peerId]) callsRef.current[peerId].close();
                  
                  // تماس جدید
                  const call = peerInstance.current!.call(peerId, mixedStream);
                  registerCallEvents(call, peerId);
              });
          }

          // هندل کردن دکمه "Stop Sharing" مرورگر
          displayStream.getVideoTracks()[0].onended = () => {
              stopScreenShare();
          };
      } catch (e) { console.error("Screen share failed", e); }
  };

  const handleLeave = () => { window.location.reload(); };
  
  const spotlightUser = connectedUsers.find(u => u.id === spotlightId);
  const otherUsers = connectedUsers.filter(u => u.id !== spotlightId);

  // کامپوننت ویدیو
  const UserVideo = ({ stream }: { stream: MediaStream }) => {
      const videoRef = useRef<HTMLVideoElement>(null);
      useEffect(() => {
          if (videoRef.current && stream) videoRef.current.srcObject = stream;
      }, [stream]);
      return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
  };

  const renderUserCard = (user: User, isSmall = false) => {
      const isMe = String(user.id) === String(currentUser?.id);
      const isSpeaking = speakingUsers[user.id] || false; 

      return (
        <div key={user.id} className={`relative bg-[#1a1a20] rounded-xl flex flex-col items-center justify-center transition-all duration-200 border-2 ${isSmall ? 'w-48 h-32 flex-shrink-0' : 'aspect-video'} hover:bg-[#25252b] group 
            ${isSpeaking ? 'border-neonCyan shadow-[0_0_15px_rgba(6,182,212,0.8)]' : 'border-white/5'}`}>
            
            <div className="relative">
                <img src={user.avatar} className={`${isSmall ? 'w-12 h-12' : 'w-20 h-20'} rounded-full object-cover mb-2 transition-transform ${isSpeaking ? 'scale-110' : ''}`} />
                {user.isMuted && <div className="absolute bottom-0 right-0 bg-[#1a1a20] rounded-full p-1 border border-red-500 text-red-500"><Icon name="microphone" size={14} /></div>}
                {user.isDeafened && <div className="absolute bottom-0 left-0 bg-[#1a1a20] rounded-full p-1 border border-red-500 text-red-500"><Icon name="headphones" size={14} /></div>}
            </div>
            
            <span className="text-white font-bold mt-1 text-sm">{user.username}</span>
            
            {!isMe && (
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm p-2 rounded-full z-20 cursor-pointer hover:bg-black/80 hover:text-neonCyan border border-white/10 shadow-lg">
                    <button onClick={(e) => { e.stopPropagation(); onOpenDM(user.id); }} className="text-white hover:text-neonCyan transition-colors" title="ارسال پیام"><Icon name="message" size={20} /></button>
                </div>
            )}
            
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setSpotlightId(user.id === spotlightId ? null : user.id)} className="text-gray-400 hover:text-white" title="حالت تمرکز"><Icon name="fullscreen" size={18} /></button>
            </div>
        </div>
      );
  };

  return (
    <div className="flex-1 bg-[#0f0f12] p-4 flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neonPurple/5 to-neonCyan/5 pointer-events-none" />
      <div className="relative z-10 mb-4 border-b border-white/5 pb-4 flex justify-between items-center h-16 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center"><Icon name="volume" className="ml-3 text-neonCyan" /> {channel.name}</h2>
      </div>

      {showQualityModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-[#1a1a20] p-6 rounded-2xl border border-neonCyan/30 shadow-2xl w-80 text-center animate-fade-in-up">
                  <h3 className="text-white text-lg font-bold mb-4">کیفیت اشتراک‌گذاری</h3>
                  <div className="space-y-3">
                      <button onClick={() => startScreenShare('low')} className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between text-gray-200 transition-colors"><span>{QUALITY_PRESETS.low.label}</span></button>
                      <button onClick={() => startScreenShare('high')} className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between text-gray-200 transition-colors"><span>{QUALITY_PRESETS.high.label}</span></button>
                  </div>
                  <button onClick={() => setShowQualityModal(false)} className="mt-4 text-sm text-red-400 hover:text-red-300">لغو</button>
              </div>
          </div>
      )}

      <div className="flex-1 min-h-0 relative z-10 mb-4 overflow-y-auto">
          {spotlightId && spotlightUser ? (
              <div className="flex flex-col h-full gap-4">
                  <div className="flex-1 bg-black/40 rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center p-2">
                        {(spotlightUser.id === currentUser?.id && isScreenSharing && screenStream.current) ? (
                            <UserVideo stream={screenStream.current} />
                        ) : (remoteStreams.current[spotlightUser.id] && remoteStreams.current[spotlightUser.id].getVideoTracks().length > 0) ? (
                            <UserVideo stream={remoteStreams.current[spotlightUser.id]} />
                        ) : (
                            <div className="flex flex-col items-center">
                                <img src={spotlightUser.avatar} className="w-32 h-32 rounded-full mb-4 border-4 border-white/10 shadow-2xl" />
                                <span className="text-2xl font-bold text-white">{spotlightUser.username}</span>
                                <button onClick={() => setSpotlightId(null)} className="mt-4 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 text-sm flex items-center gap-2"><Icon name="fullscreen" size={16} /> خروج از تمرکز</button>
                            </div>
                        )}
                  </div>
                  <div className="h-36 flex gap-3 overflow-x-auto pb-2 px-1 items-center shrink-0">
                      {otherUsers.map(user => renderUserCard(user, true))}
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 h-full content-start">
                  {connectedUsers.map(user => renderUserCard(user))}
              </div>
          )}
      </div>

      <div className="mt-auto pt-2 flex flex-col items-center relative z-20 gap-4 shrink-0">
        <div className="flex gap-5 p-4 bg-[#1a1a20]/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl items-center">
           <button onClick={handleLeave} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all transform hover:scale-110 shadow-lg shadow-red-600/40" title="خروج"><Icon name="phone-off" size={28} /></button>
           <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 ${isMuted ? 'bg-red-600 shadow-red-600/50' : 'bg-white/10 hover:bg-white/20'}`} title="میکروفون"><Icon name="microphone" size={24} /></button>
           <button onClick={toggleDeafen} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 ${isDeafened ? 'bg-red-600 shadow-red-600/50' : 'bg-white/10 hover:bg-white/20'}`} title="صدا"><Icon name="headphones" size={24} /></button>
           <div className="w-px h-8 bg-white/20 mx-1"></div>
           <button onClick={initiateScreenShare} className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 ${isScreenSharing ? 'bg-blue-600 shadow-blue-500/50' : 'bg-white/10 hover:bg-white/20'}`} title="اشتراک گذاری صفحه"><Icon name="video" size={24} /></button>
        </div>
      </div>
    </div>
  );
};