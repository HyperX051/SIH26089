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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate phone: +91[6-9]\d{9} or just simple validation for now
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
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
      setError(err.response?.data?.message || "Failed to connect to authentication server.");
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
      
      // Save to Zustand global store
      const { token, user } = response.data.data;
      setAuth(token, user);
      router.push('/customer');
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Invalid OTP or Server Error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex selection:bg-purple-500/30 font-sans">
      
      {/* Left Side: Branding / Value Prop */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-50 flex-col justify-between p-12">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-400/20 blur-[100px] rounded-full mix-blend-multiply"></div>
        <div className="absolute top-40 right-0 w-80 h-80 bg-blue-400/20 blur-[100px] rounded-full mix-blend-multiply"></div>
        
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">FixNow</span>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Customer Portal
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
            Home repairs, <br/> handled by pros.
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            Join thousands of households relying on our cooperative network for transparent, fast, and high-quality services.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm font-semibold text-slate-500">&copy; 2026 FixNow Platform</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Welcome back</h2>
            <p className="text-slate-500 font-medium">
              {!sessionId ? "Please enter your phone number." : `Enter the OTP sent to ${phone}`}
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-bold">
              {error}
            </div>
          )}
          
          {!sessionId ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+91</span>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210" 
                    className="w-full pl-12 border border-slate-200 bg-slate-50 rounded-2xl px-5 py-4 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl flex justify-center items-center transition-all shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-[0.98] mt-4"
              >
                {loading ? "Sending OTP..." : "Continue"}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              {devOtp && (
                <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-sm text-blue-600 font-bold mb-1">DEV MODE OTP</p>
                  <p className="text-2xl font-mono text-blue-900 tracking-[0.5em]">{devOtp}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">6-Digit OTP</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000" 
                  className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-5 py-4 text-center tracking-[1em] text-2xl text-slate-900 font-mono placeholder:text-slate-300 focus:outline-none focus:border-purple-500 focus:bg-white transition-all shadow-sm"
                />
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl flex justify-center items-center transition-all shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-[0.98] mt-4"
              >
                {loading ? "Verifying..." : "Sign In to Portal"}
              </button>
              
              <div className="text-center mt-4">
                <button type="button" onClick={() => setSessionId(null)} className="text-sm font-bold text-purple-600 hover:text-purple-700">Change Phone Number</button>
              </div>
            </form>
          )}
          
        </div>
      </div>
    </div>
  );
}
