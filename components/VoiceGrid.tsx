import React from 'react';
import { User, Channel } from '../types';
import { Icon } from './Icon';

interface VoiceGridProps {
  channel: Channel;
}

export const VoiceGrid: React.FC<VoiceGridProps> = ({ channel }) => {
  const users = channel.users || [];

  return (
    <div className="flex-1 bg-[#0f0f12] p-4 flex flex-col h-full relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-neonPurple/5 to-neonCyan/5 pointer-events-none" />
      
      <div className="relative z-10 mb-6 border-b border-white/5 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Icon name="volume" className="ml-3 text-neonCyan" />
          {channel.name}
          <span className="mr-3 text-sm font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            اتصال همتا به همتا (P2P)
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto relative z-10 p-2">
        {users.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
               <Icon name="volume" size={32} className="text-gray-600" />
            </div>
            <p>کسی در این کانال نیست. اولین نفر باشید!</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`relative aspect-video bg-[#1a1a20] rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-300 group ${
                user.isSpeaking
                  ? 'border-neonCyan shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                  : 'border-white/5 hover:border-white/10'
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className={`w-20 h-20 rounded-full object-cover transition-transform duration-300 ${user.isSpeaking ? 'scale-110' : 'scale-100'}`}
                />
                {user.isMuted && (
                  <div className="absolute -bottom-1 -right-1 bg-[#1a1a20] rounded-full p-1 border border-red-500/50">
                    <Icon name="microphone-slash" size={14} className="text-red-500" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="mt-4 px-3 py-1 bg-black/40 rounded-full backdrop-blur-sm border border-white/5">
                <span className={`text-sm font-medium ${user.isSpeaking ? 'text-neonCyan' : 'text-gray-300'}`}>
                  {user.username}
                </span>
              </div>

              {/* Fake Audio Visualizer Bar */}
              {user.isSpeaking && (
                <div className="absolute bottom-0 left-0 right-0 h-1 flex justify-center items-end gap-0.5 pb-2 opacity-50">
                    <div className="w-1 bg-neonCyan animate-[pulse_0.5s_ease-in-out_infinite] h-3"></div>
                    <div className="w-1 bg-neonCyan animate-[pulse_0.4s_ease-in-out_infinite] h-5"></div>
                    <div className="w-1 bg-neonCyan animate-[pulse_0.6s_ease-in-out_infinite] h-2"></div>
                </div>
              )}
              
              {/* Controls Overlay (On Hover) */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl backdrop-blur-[2px]">
                <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" title="تنظیم صدا">
                   <Icon name="volume" size={20} className="text-white" />
                </button>
                 <button className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" title="پروفایل">
                   <Icon name="settings" size={20} className="text-white" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto pt-4 flex justify-center relative z-10">
        <div className="flex gap-4 p-3 bg-[#1a1a20]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
           <button className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
             <Icon name="video" />
           </button>
           <button className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
             <Icon name="microphone" />
           </button>
           <button className="w-12 h-12 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all">
             <Icon name="microphone-slash" />
           </button>
        </div>
      </div>
    </div>
  );
};