import React, { useState, useRef, useEffect } from 'react';
import { Channel, Message, User } from '../types';
import { Icon } from './Icon';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  users: User[];
  onSendMessage: (text: string, file?: File) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ channel, messages, users, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const getUser = (id: number) => users.find(u => u.id === id) || users[0];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f12] h-full relative">
      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center px-6 bg-white/[0.02] backdrop-blur-sm z-10">
        <Icon name="hashtag" className="text-gray-400 ml-3" />
        <div>
          <h3 className="font-bold text-white">{channel.name}</h3>
          <p className="text-xs text-gray-500">توضیحات کانال در اینجا قرار می‌گیرد</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => {
          const user = getUser(msg.userId);
          const isMe = msg.userId === 1; // Assuming ID 1 is current user
          const isSequence = idx > 0 && messages[idx - 1].userId === msg.userId;

          return (
            <div key={msg.id} className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} group items-start hover:bg-white/[0.01] -mx-4 px-4 py-1 transition-colors`}>
              {!isSequence ? (
                <img src={user.avatar} alt={user.username} className={`w-10 h-10 rounded-full mt-1 ${isMe ? 'ml-3' : 'ml-3'}`} />
              ) : (
                <div className="w-10 ml-3"></div>
              )}
              
              <div className={`flex-1 min-w-0 ${isMe ? 'text-left' : 'text-right'}`}>
                {!isSequence && (
                  <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-neonPurple cursor-pointer hover:underline">{user.username}</span>
                    <span className="text-[10px] text-gray-600">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                
                <div className={`text-gray-200 leading-relaxed whitespace-pre-wrap ${isMe ? 'text-left' : ''}`}>
                  {msg.content}
                </div>

                {/* File Attachment */}
                {msg.fileUrl && (
                  <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-white/10">
                    {msg.fileType === 'image' && (
                      <img src={msg.fileUrl} alt="attachment" className="w-full h-auto" />
                    )}
                    {msg.fileType === 'video' && (
                        <div className="bg-black aspect-video flex items-center justify-center">
                            <Icon name="video" className="text-gray-500"/>
                        </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 px-6 bg-[#0f0f12]">
        <div className="relative bg-[#1a1a20] rounded-lg shadow-lg border border-white/5 focus-within:border-neonPurple/50 focus-within:ring-1 focus-within:ring-neonPurple/50 transition-all">
          
          {/* File Upload Button */}
          <div className="absolute top-0 bottom-0 right-0 flex items-center pr-3">
             <button className="text-gray-400 hover:text-gray-200 transition-colors p-1 bg-white/5 rounded-full">
                <Icon name="plus" size={16} />
             </button>
          </div>

          <form onSubmit={handleSend} className="w-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`پیام به #${channel.name}`}
              className="w-full bg-transparent text-gray-200 p-4 pr-12 pl-12 focus:outline-none placeholder-gray-600 h-14"
            />
            <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-neonCyan transition-colors"
                disabled={!inputValue.trim()}
            >
                <Icon name="send" size={20} className={inputValue.trim() ? "text-neonCyan" : ""} />
            </button>
          </form>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-gray-700">
                شما در حال تایپ در کانال {channel.name} هستید. (Socket.io Connected)
            </p>
        </div>
      </div>
    </div>
  );
};