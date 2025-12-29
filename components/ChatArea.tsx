import React, { useState, useRef, useEffect } from 'react';
import { Channel, Message, User } from '../types';
import { Icon } from './Icon';
import { api } from '../services/api';

const messageSound = new Audio('/sounds/message.mp3');

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  users: User[];
  onSendMessage: (text: string, file?: File, replyToId?: number) => void;
  onOpenDM?: (targetId: number) => void;
}

const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${mb.toFixed(2)} MB`;
};

const MusicPlayer = ({ src, name, size }: any) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlay = () => { if (audioRef.current) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); } };
    const handleTimeUpdate = () => { if (audioRef.current) { setCurrentTime(audioRef.current.currentTime); setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); } };
    const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };
    const handleSeek = (e: any) => { const val = parseFloat(e.target.value); if (audioRef.current) { audioRef.current.currentTime = (val / 100) * duration; setProgress(val); } };
    const formatTime = (time: number) => { if (isNaN(time)) return "0:00"; const min = Math.floor(time / 60); const sec = Math.floor(time % 60); return `${min}:${sec < 10 ? '0' : ''}${sec}`; };

    return (
        <div className="mt-2 w-full max-w-[380px] bg-[#2f3136] p-3 rounded-lg border border-[#202225] select-none shadow-sm group">
            <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => {setIsPlaying(false); setProgress(0);}} />
            <div className="flex items-start gap-3 mb-2">
                <div className="bg-indigo-500/20 p-2.5 rounded text-indigo-400"><Icon name="music" size={24} /></div>
                <div className="flex flex-col min-w-0 overflow-hidden"><a href={src} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#00b0f4] hover:underline truncate">{name}</a><span className="text-xs text-gray-400">{formatSize(size)}</span></div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="w-8 h-8 flex items-center justify-center text-gray-200 hover:text-white transition-colors shrink-0">{isPlaying ? <Icon name="pause" size={20} /> : <Icon name="play" size={20} />}</button>
                <span className="text-xs text-gray-400 font-mono w-9 text-right">{formatTime(currentTime)}</span>
                <div className="relative flex-1 h-1.5 bg-[#4f545c] rounded-full group cursor-pointer mx-2"><div className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div><input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /></div>
                <span className="text-xs text-gray-400 font-mono w-9">{formatTime(duration)}</span>
            </div>
        </div>
    );
};

const MEMES = ["https://media.tenor.com/2nZ470191W4AAAAM/coding-programming.gif", "https://media.tenor.com/HMV97_w8M-oAAAAM/cat-typing.gif", "https://media.tenor.com/l5_u4J0x2QYAAAAM/doge-meme.gif"];
const EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "😭", "😡", "👍", "👎", "🔥", "❤️", "💩", "🎉", "👀", "🚀"];

export const ChatArea: React.FC<ChatAreaProps> = ({ channel, messages, users, onSendMessage, onOpenDM }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'emoji' | 'meme'>('emoji');
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > prevMessagesLength.current) {
        messageSound.play().catch(() => {});
    }
    prevMessagesLength.current = messages.length;
  }, [messages, selectedFile]);

  const getUser = (id: number) => users.find(u => u.id === id) || { id: -1, username: 'کاربر ناشناس', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=unknown' } as User;

  const handleSend = () => {
    if (editingMessage) {
        if (!inputText.trim()) return;
        api.editMessage(editingMessage.id, inputText);
        setEditingMessage(null);
        setInputText('');
    } else {
        if (!inputText.trim() && !selectedFile) return;
        onSendMessage(inputText, selectedFile || undefined, replyingTo?.id);
        setInputText(''); setSelectedFile(null); setReplyingTo(null);
    }
    setShowEmojiPicker(false);
  };

  const startEdit = (msg: Message) => {
      setEditingMessage(msg); setInputText(msg.content); setReplyingTo(null); fileInputRef.current?.focus();
  };
  const deleteMsg = (id: number) => { if (confirm('آیا مطمئنید که می‌خواهید پیام را حذف کنید؟')) api.deleteMessage(id); };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]); };
  const handlePaste = (e: React.ClipboardEvent) => { if (e.clipboardData.files && e.clipboardData.files[0]) setSelectedFile(e.clipboardData.files[0]); };

  const sendMeme = async (url: string) => {
      try { const response = await fetch(url); const blob = await response.blob(); const file = new File([blob], "meme.gif", { type: "image/gif" }); onSendMessage("", file); setShowEmojiPicker(false); } catch (e) { console.error("Meme Error", e); }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onPaste={handlePaste}>
      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center px-6 bg-white/5 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
            <Icon name={channel.type === 'text' ? 'hashtag' : (channel.type === 'dm' ? 'smile' : 'volume')} className="text-gray-400" size={24} />
            <div>
                <h3 className="font-bold text-white text-lg">{channel.name}</h3>
                {channel.type === 'dm' && <span className="text-xs text-gray-500">گفتگوی خصوصی</span>}
            </div>
        </div>
      </div>

      {isDragging && (<div className="absolute inset-0 bg-neonCyan/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-neonCyan border-dashed m-4 rounded-3xl"><div className="text-white text-2xl font-bold animate-bounce flex flex-col items-center"><Icon name="upload" size={48} className="mb-4" /> فایل را اینجا رها کنید</div></div>)}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.map((msg, idx) => {
          const user = getUser(msg.userId);
          const time = new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={idx} className={`group flex gap-4 animate-fade-in-up hover:bg-white/5 p-2 rounded-lg -mx-2 transition-colors relative`}>
              <div className="cursor-pointer hover:opacity-80" onClick={() => onOpenDM && onOpenDM(user.id)}>
                  <img src={user.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-white cursor-pointer hover:underline hover:text-neonCyan" onClick={() => onOpenDM && onOpenDM(user.id)}>{user.username}</span>
                  <span className="text-xs text-gray-500">{time}</span>
                </div>

                {msg.replyTo && (
                    <div className="flex items-center gap-2 mb-1 opacity-70">
                        <div className="w-8 border-t-2 border-l-2 border-gray-500 rounded-tl-lg h-3 mt-2"></div>
                        <div className="bg-[#1a1a20] px-2 py-0.5 rounded text-xs text-gray-400 flex items-center gap-1 truncate max-w-xs cursor-pointer hover:text-white">
                            <span className="font-bold">@{getUser(msg.replyTo.userId).username}:</span>
                            {msg.replyTo.content || 'فایل ضمیمه'}
                        </div>
                    </div>
                )}
                
                {msg.content && <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{msg.content} {msg.isEdited && <span className="text-[10px] text-gray-500">(ویرایش شده)</span>}</p>}
                
                {msg.attachment && (
                    <div>
                        {msg.attachment.type === 'image' ? (
                            <img src={msg.attachment.url} className="mt-2 max-w-sm max-h-80 rounded-xl border border-white/10 shadow-lg cursor-pointer hover:scale-[1.01] transition-transform" onClick={() => window.open(msg.attachment?.url, '_blank')} />
                        ) : msg.attachment.type === 'audio' ? (
                            <MusicPlayer src={msg.attachment.url} name={msg.attachment.name || 'فایل صوتی'} size={msg.attachment.size} />
                        ) : msg.attachment.type === 'video' ? (
                            <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black"><video src={msg.attachment.url} controls className="w-full max-h-80 object-contain" /></div>
                        ) : (
                            <a href={msg.attachment.url} download={msg.attachment.name} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-[#2f3136] p-3 rounded-lg border border-[#202225] hover:bg-[#36393f] transition-colors w-fit mt-2">
                                <div className="bg-neonPurple/20 p-2 rounded text-neonPurple"><Icon name="file" size={24} /></div>
                                <div className="flex flex-col"><span className="text-sm font-bold text-white truncate max-w-[200px]">{msg.attachment.name}</span><span className="text-xs text-gray-400">{formatSize(msg.attachment.size)}</span></div>
                                <Icon name="upload" size={16} className="text-gray-400 ml-2" />
                            </a>
                        )}
                    </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="absolute top-2 left-2 bg-[#1a1a20] rounded shadow-lg border border-white/10 flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setReplyingTo(msg)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white" title="پاسخ"><Icon name="reply" size={14} /></button>
                  <button onClick={() => startEdit(msg)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white" title="ویرایش"><Icon name="edit" size={14} /></button>
                  <button onClick={() => deleteMsg(msg.id)} className="p-1.5 hover:bg-white/10 text-red-400 hover:text-red-500" title="حذف"><Icon name="trash" size={14} /></button>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0b0b0d] shrink-0 relative">
          {replyingTo && (
              <div className="flex items-center justify-between bg-[#1a1a20] p-2 rounded-t-lg border-x border-t border-white/10 text-sm text-gray-300">
                  <span>پاسخ به <b>{getUser(replyingTo.userId).username}</b></span>
                  <button onClick={() => setReplyingTo(null)} className="hover:text-white"><Icon name="close" size={14} /></button>
              </div>
          )}
          {editingMessage && (
              <div className="flex items-center justify-between bg-[#1a1a20] p-2 rounded-t-lg border-x border-t border-white/10 text-sm text-neonCyan">
                  <span>در حال ویرایش پیام...</span>
                  <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="hover:text-white"><Icon name="close" size={14} /></button>
              </div>
          )}

          {showEmojiPicker && ( <div className="absolute bottom-20 right-4 w-72 bg-[#1a1a20] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in-up"> <div className="flex border-b border-white/10"> <button onClick={() => setActiveTab('emoji')} className={`flex-1 py-2 text-sm font-bold transition-colors ${activeTab === 'emoji' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>ایموجی</button> <button onClick={() => setActiveTab('meme')} className={`flex-1 py-2 text-sm font-bold transition-colors ${activeTab === 'meme' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>میم</button> </div> <div className="h-64 overflow-y-auto p-2 scrollbar-thin"> {activeTab === 'emoji' ? ( <div className="grid grid-cols-6 gap-2"> {EMOJIS.map(emoji => (<button key={emoji} onClick={() => setInputText(prev => prev + emoji)} className="text-2xl hover:bg-white/10 rounded p-1 transition-colors">{emoji}</button>))} </div> ) : ( <div className="grid grid-cols-2 gap-2"> {MEMES.map(src => (<img key={src} src={src} className="w-full h-auto rounded hover:opacity-80 cursor-pointer transition-opacity" onClick={() => sendMeme(src)} />))} </div> )} </div> </div> )}
          {selectedFile && ( <div className="absolute bottom-full left-4 mb-2 bg-[#1a1a20] p-3 rounded-xl border border-white/10 flex items-center gap-3 shadow-xl animate-fade-in-up"> {selectedFile.type.startsWith('image/') ? ( <img src={URL.createObjectURL(selectedFile)} className="w-12 h-12 rounded object-cover border border-white/10" /> ) : ( <Icon name="file" size={32} className="text-gray-400" /> )} <div className="flex flex-col"> <span className="text-sm text-white font-bold truncate max-w-[150px]">{selectedFile.name}</span> <span className="text-xs text-gray-500">آماده ارسال</span> </div> <button onClick={() => setSelectedFile(null)} className="bg-red-500/20 text-red-500 p-1.5 rounded-full hover:bg-red-500/30 transition-colors mr-2"><Icon name="close" size={14} /></button> </div> )}

          <div className={`bg-[#1a1a20] flex items-center p-2 border border-white/5 focus-within:border-neonCyan/50 transition-colors shadow-inner ${replyingTo || editingMessage ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Icon name="plus" size={20} /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder={selectedFile ? "توضیحات (اختیاری)..." : `پیام بنویسید...`} className="flex-1 bg-transparent text-white px-4 py-2 focus:outline-none placeholder-gray-500" />
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-full transition-colors mr-1 ${showEmojiPicker ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-yellow-400 hover:bg-white/10'}`}><Icon name="smile" size={24} /></button>
            {(inputText || selectedFile) && (<button onClick={handleSend} className="p-2 bg-neonCyan text-black rounded-lg hover:bg-cyan-300 transition-all mr-2 animate-fade-in"><Icon name="send" size={20} /></button>)}
          </div>
      </div>
    </div>
  );
};