import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

export const AuthPage: React.FC = () => {
  const { login, register, isLoading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('لطفا نام کاربری و رمز عبور را وارد کنید');
      return;
    }

    try {
      if (isRegistering) {
        await register({ username, password, avatar: avatar || undefined });
      } else {
        await login({ username, password });
      }
    } catch (err: any) {
      setError(err.message || 'خطایی رخ داد');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f12] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-neonPurple/10 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-neonCyan/10 rounded-full blur-[150px]"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-neonPurple to-neonCyan mb-2">
            میـت | Meet
          </h1>
          <p className="text-gray-400">
            {isRegistering ? 'ایجاد حساب کاربری جدید' : 'ورود به حساب کاربری'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {isRegistering && (
            <div className="flex justify-center">
              <div className="relative group cursor-pointer">
                <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center overflow-hidden bg-[#1a1a20] transition-colors ${avatarPreview ? 'border-neonCyan' : 'border-dashed border-gray-600 hover:border-neonPurple'}`}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="plus" size={32} className="text-gray-500" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="absolute -bottom-1 -right-1 bg-neonPurple rounded-full p-1 shadow-lg">
                  <Icon name="settings" size={12} className="text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 absolute transform translate-y-24">انتخاب آواتار (اختیاری)</p>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 mr-1">نام کاربری</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1a1a20] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neonPurple focus:ring-1 focus:ring-neonPurple transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 mr-1">رمز عبور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a20] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neonPurple focus:ring-1 focus:ring-neonPurple transition-all"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-neonPurple to-neonCyan text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'در حال پردازش...' : (isRegistering ? 'ثبت نام' : 'ورود')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setAvatar(null);
              setAvatarPreview(null);
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isRegistering ? 'حساب دارید؟ وارد شوید' : 'حساب ندارید؟ ثبت نام کنید'}
          </button>
        </div>
      </div>
    </div>
  );
};