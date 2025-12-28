import React from 'react';
import { Channel, User } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: number;
  onSelectChannel: (id: number) => void;
  currentUser: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ channels, activeChannelId, onSelectChannel, currentUser }) => {
  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  return (
    <div className="w-64 bg-[#141419] border-l border-white/5 flex flex-col h-full shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-neonPurple to-neonCyan tracking-wide">
          میـت | Meet
        </h1>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Text Channels */}
        <div>
          <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2 flex justify-between items-center group cursor-pointer hover:text-gray-300 transition-colors">
            <span>کانال‌های متنی</span>
            <Icon name="plus" size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </h2>
          <div className="space-y-0.5">
            {textChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center px-2 py-2 rounded-md transition-all duration-200 group ${
                  activeChannelId === channel.id
                    ? 'bg-neonPurple/10 text-neonPurple shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon name="hashtag" size={18} className={`ml-2 ${activeChannelId === channel.id ? 'text-neonPurple' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="truncate font-medium">{channel.name}</span>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="mr-auto bg-neonCyan text-[#0f0f12] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2 flex justify-between items-center group cursor-pointer hover:text-gray-300 transition-colors">
            <span>کانال‌های صوتی</span>
            <Icon name="plus" size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </h2>
          <div className="space-y-1">
            {voiceChannels.map(channel => (
              <div key={channel.id} className="space-y-1">
                 <button
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center px-2 py-2 rounded-md transition-all duration-200 group ${
                    activeChannelId === channel.id
                      ? 'bg-neonCyan/10 text-neonCyan shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <Icon name="volume" size={18} className={`ml-2 ${activeChannelId === channel.id ? 'text-neonCyan' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="truncate font-medium">{channel.name}</span>
                </button>
                {/* Connected Users in Sidebar List (Preview) */}
                {channel.users && channel.users.length > 0 && (
                  <div className="mr-8 space-y-1">
                    {channel.users.map(u => (
                      <div key={u.id} className="flex items-center text-sm text-gray-500 py-0.5">
                        <img src={u.avatar} alt={u.username} className={`w-5 h-5 rounded-full ml-2 border ${u.isSpeaking ? 'border-neonCyan shadow-neonCyan' : 'border-transparent'}`} />
                        <span className={`${u.isSpeaking ? 'text-white font-bold' : ''}`}>{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Controls */}
      <div className="bg-[#0b0b0d] p-3 flex items-center border-t border-white/5">
        <div className="relative group cursor-pointer">
            <img src={currentUser.avatar} alt="Me" className="w-10 h-10 rounded-full border border-white/10" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0b0b0d]"></div>
        </div>
        <div className="mr-2 flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{currentUser.username}</div>
          <div className="text-xs text-gray-500 truncate">آنلاین</div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <Icon name={currentUser.isMuted ? 'microphone-slash' : 'microphone'} size={18} className={currentUser.isMuted ? 'text-red-500' : ''} />
          </button>
          <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
             <Icon name="headphones" size={18} />
          </button>
           <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
             <Icon name="settings" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};