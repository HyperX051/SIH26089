"use client";

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
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
      const res = await api.post('/auth/admin-login', { email, password });
      setAuth(res.data.data.token, res.data.data.user);
      router.push('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer text-zinc-900">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-sm">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <span className="font-extrabold text-xl tracking-tight uppercase">FixNow</span>
      </Link>

      <div className="w-full max-w-md bg-white border-2 border-zinc-200 rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Federation Command</h1>
          <p className="text-zinc-500 font-medium text-sm">Authorized personnel only</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-900 mb-2 uppercase tracking-wider">Admin Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl p-4 text-zinc-900 font-mono text-lg focus:outline-none focus:border-zinc-900 focus:bg-white transition-all shadow-sm"
              placeholder="admin@fixnow.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-900 mb-2 uppercase tracking-wider">Access Key</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-xl p-4 text-zinc-900 font-mono text-lg focus:outline-none focus:border-zinc-900 focus:bg-white transition-all shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-colors uppercase tracking-wider shadow-md disabled:bg-zinc-400 mt-4"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
