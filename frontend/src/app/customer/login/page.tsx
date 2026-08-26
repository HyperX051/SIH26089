"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function CustomerLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    if (authMode === 'SIGNUP' && !name.trim()) {
      setError("Please enter your name to sign up");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', {
        phone: phone.startsWith('+91') ? phone : `+91${phone}`,
        role: 'CUSTOMER'
      });
      
      setSessionId(response.data.data.session_id);
      if (response.data.data.dev_otp) {
        setDevOtp(response.data.data.dev_otp);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        phone: phone.startsWith('+91') ? phone : `+91${phone}`,
        otp: otp,
        session_id: sessionId
      });
      
      const { token, user } = response.data.data;
      
      if (authMode === 'SIGNUP') {
        // If they are signing up, we need to push the name they entered
        const formData = new FormData();
        formData.append('name', name);
        const profileRes = await api.post('/users/complete-profile', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setAuth(token, profileRes.data.user);
        router.push('/customer');
      } else {
        // LOGIN mode
        if (!user.name) {
          setError("Account not fully registered. Please sign up first.");
          setSessionId(null);
          setOtp("");
        } else {
          setAuth(token, user);
          router.push('/customer');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Invalid OTP or Server Error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/30 blur-[120px] rounded-full pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/30 blur-[120px] rounded-full pointer-events-none mix-blend-multiply"></div>
      
      {/* Left Side: Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-start p-20 relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span className="font-extrabold text-3xl tracking-tight text-slate-900">FixNow</span>
        </div>

        <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
          Your home,<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">perfectly fixed.</span>
        </h1>
        <p className="text-xl text-slate-600 font-medium max-w-lg leading-relaxed">
          Experience premium home services with our vetted cooperative network. Transparent pricing, instant booking, and guaranteed satisfaction.
        </p>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative z-10">
        <div className="w-full max-w-md bg-white/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          
          <div className="flex bg-slate-200/50 p-1 rounded-2xl mb-8">
            <button 
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setAuthMode('LOGIN'); setSessionId(null); setError(""); }}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'SIGNUP' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setAuthMode('SIGNUP'); setSessionId(null); setError(""); }}
            >
              Sign Up
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {authMode === 'LOGIN' ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              {!sessionId ? "Enter your phone number to get started." : `Enter the OTP sent to ${phone}`}
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          
          {!sessionId ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              {authMode === 'SIGNUP' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe" 
                    className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+91</span>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210" 
                    className="w-full pl-14 bg-slate-100/50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex justify-center items-center transition-all shadow-md active:scale-[0.98] mt-2"
              >
                {loading ? "Sending OTP..." : "Continue"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              {devOtp && (
                <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                  <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-widest">Dev Mode OTP</p>
                  <p className="text-3xl font-mono text-blue-900 tracking-[0.3em] font-light">{devOtp}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">6-Digit OTP</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000" 
                  className="w-full border border-slate-200 bg-slate-100/50 rounded-xl px-5 py-4 text-center tracking-[1em] text-2xl text-slate-900 font-mono placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex justify-center items-center transition-all shadow-md active:scale-[0.98] mt-2"
              >
                {loading ? "Verifying..." : (authMode === 'SIGNUP' ? "Create Account" : "Verify & Sign In")}
              </button>
              
              <div className="text-center mt-6">
                <button type="button" onClick={() => setSessionId(null)} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                  Wrong phone number?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
