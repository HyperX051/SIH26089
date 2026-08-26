"use client";

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function WorkerLogin() {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'REGISTER') {
        const res = await api.post('/auth/register', { phone, password, role: 'WORKER' });
        setAuth(res.data.data.token, res.data.data.user);
        router.push('/worker');
      } else {
        const res = await api.post('/auth/login', { phone, password });
        setAuth(res.data.data.token, res.data.data.user);
        router.push('/worker');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer text-white">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <span className="font-extrabold text-xl tracking-tight uppercase">FixNow</span>
      </Link>

      <div className="w-full max-w-md bg-zinc-900 border-2 border-zinc-700 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">Professional Portal</h1>
          <p className="text-zinc-400 font-medium text-sm">Join the elite network</p>
        </div>

        <div className="flex bg-black p-1 rounded-xl mb-8 border border-zinc-800">
          <button 
            onClick={() => setMode('LOGIN')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-white'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => setMode('REGISTER')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'REGISTER' ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500 hover:text-white'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-xl text-red-400 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">Mobile Number</label>
            <input 
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-black border-2 border-zinc-700 rounded-xl p-4 text-white font-mono text-lg focus:outline-none focus:border-white focus:bg-zinc-800 transition-all shadow-sm"
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border-2 border-zinc-700 rounded-xl p-4 text-white font-mono text-lg focus:outline-none focus:border-white focus:bg-zinc-800 transition-all shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-4 rounded-xl transition-colors uppercase tracking-wider shadow-md disabled:bg-zinc-600 disabled:text-zinc-400"
          >
            {loading ? 'Processing...' : (mode === 'LOGIN' ? 'Sign In' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
}
