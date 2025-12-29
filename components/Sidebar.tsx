import React, { useState } from 'react';
import { Channel, User } from '../types';
import { Icon } from './Icon';
import { api } from '../services/api';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: number;
  onSelectChannel: (id: number) => void;
  currentUser: User;
  usersCache: User[];
}

export const Sidebar: React.FC<SidebarProps> = ({ channels, activeChannelId, onSelectChannel, currentUser, usersCache }) => {
  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');
  const dmChannels = channels.filter(c => c.type === 'dm');

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newBio, setNewBio] = useState(currentUser.bio || '');
  const [newStatus, setNewStatus] = useState(currentUser.status);

  const handleSaveProfile = async () => {
      await api.updateProfile(currentUser.id, newStatus, newBio);
      setShowProfileModal(false);
  };

  const getDMInfo = (channel: Channel) => {
      const otherId = channel.participants?.find(id => id !== currentUser.id);
      const otherUser = usersCache.find(u => u.id === otherId);
      return { name: otherUser ? otherUser.username : 'کاربر حذف شده', avatar: otherUser ? otherUser.avatar : '' };
  };

  return (
    <div className="w-64 bg-[#141419] border-l border-white/5 flex flex-col h-full shadow-xl z-20">
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-neonPurple to-neonCyan tracking-wide">میـت | Meet</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {dmChannels.length > 0 && (
            <div>
            <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2">پیام‌های خصوصی</h2>
            <div className="space-y-0.5">
                {dmChannels.map(channel => {
                    const info = getDMInfo(channel);
                    return (
                        <button key={channel.id} onClick={() => onSelectChannel(channel.id)} className={`w-full flex items-center px-2 py-2 rounded-md transition-all duration-200 group ${activeChannelId === channel.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                            <img src={info.avatar} className="w-6 h-6 rounded-full ml-2" />
                            <span className="truncate font-medium">{info.name}</span>
                            {(channel.unreadCount || 0) > 0 && (<div className="mr-auto bg-neonCyan text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{channel.unreadCount}</div>)}
                        </button>
                    );
                })}
            </div>
            </div>
        )}

        <div>
          <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2 flex justify-between group cursor-pointer hover:text-gray-300">
             <span>کانال‌های متنی</span>
             <Icon name="plus" size={14} className="opacity-0 group-hover:opacity-100" />
          </h2>
          <div className="space-y-0.5">
            {textChannels.map(channel => (
              <button key={channel.id} onClick={() => onSelectChannel(channel.id)} className={`w-full flex items-center px-2 py-2 rounded-md transition-all duration-200 group ${activeChannelId === channel.id ? 'bg-neonPurple/10 text-neonPurple shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                <Icon name="hashtag" size={18} className={`ml-2 ${activeChannelId === channel.id ? 'text-neonPurple' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="truncate font-medium">{channel.name}</span>
                {(channel.unreadCount || 0) > 0 && (<div className="mr-auto bg-neonCyan text-black text-[11px] font-extrabold h-5 w-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]">{channel.unreadCount}</div>)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-2">کانال‌های صوتی</h2>
          <div className="space-y-1">
            {voiceChannels.map(channel => (
              <div key={channel.id} className="space-y-1">
                 <button onClick={() => onSelectChannel(channel.id)} className={`w-full flex items-center px-2 py-2 rounded-md transition-all duration-200 group ${activeChannelId === channel.id ? 'bg-neonCyan/10 text-neonCyan shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                  <Icon name="volume" size={18} className={`ml-2 ${activeChannelId === channel.id ? 'text-neonCyan' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="truncate font-medium">{channel.name}</span>
                </button>
                {channel.users && channel.users.length > 0 && (
                  <div className="mr-8 space-y-1">
                    {channel.users.map(u => (
                      <div key={u.id} className="flex items-center text-sm text-gray-500 py-0.5">
                        <img src={u.avatar} className={`w-5 h-5 rounded-full ml-2 border ${u.isSpeaking ? 'border-neonCyan shadow-neonCyan' : 'border-transparent'}`} />
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

      <div className="bg-[#0b0b0d] p-3 flex items-center border-t border-white/5">
        <div className="relative group cursor-pointer" onClick={() => setShowProfileModal(true)}>
            <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-white/10" />
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0b0b0d] ${currentUser.status === 'online' ? 'bg-green-500' : currentUser.status === 'idle' ? 'bg-yellow-500' : currentUser.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
        </div>
        <div className="mr-2 flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{currentUser.username}</div>
          <div className="text-xs text-gray-500 truncate">{currentUser.bio || 'بدون بیوگرافی'}</div>
        </div>
        <button onClick={() => setShowProfileModal(true)} className="ml-auto p-2 text-gray-400 hover:text-white"><Icon name="settings" size={18} /></button>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a20] p-6 rounded-2xl w-full max-w-sm border border-white/10 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">تنظیمات پروفایل</h3>
                <label className="block text-gray-400 text-xs mb-1">وضعیت</label>
                <div className="flex gap-2 mb-4">
                    {['online', 'idle', 'dnd', 'offline'].map(s => (
                        <button key={s} onClick={() => setNewStatus(s as any)} className={`w-8 h-8 rounded-full border-2 transition-all ${newStatus === s ? 'border-white scale-110' : 'border-transparent opacity-50'} ${s === 'online' ? 'bg-green-500' : s === 'idle' ? 'bg-yellow-500' : s === 'dnd' ? 'bg-red-500' : 'bg-gray-500'}`} />
                    ))}
                </div>
                <label className="block text-gray-400 text-xs mb-1">بیوگرافی</label>
                <textarea value={newBio} onChange={e => setNewBio(e.target.value)} className="w-full bg-black/30 rounded-lg p-2 text-white text-sm border border-white/10 focus:border-neonCyan outline-none h-24 resize-none" placeholder="چیزی درباره خود بنویسید..." />
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-white px-3 py-1">لغو</button>
                    <button onClick={handleSaveProfile} className="bg-neonCyan text-black font-bold px-4 py-1.5 rounded-lg hover:bg-cyan-300">ذخیره</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};