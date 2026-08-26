"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function WorkerLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [phone, setPhone] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [certificate, setCertificate] = useState<File | null>(null);
  
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    if (authMode === 'SIGNUP') {
      if (!name.trim()) {
        setError("Please enter your name");
        return;
      }
      if (!photo) {
        setError("Please upload an ID/Photo");
        return;
      }
      if (!certificate) {
        setError("Please upload your certification document");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { phone: phone.startsWith('+91') ? phone : `+91${phone}`, role: 'WORKER' });
      setSessionId(response.data.data.session_id);
      if (response.data.data.dev_otp) {
        setDevOtp(response.data.data.dev_otp);
      }
      setOtpSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { phone: phone.startsWith('+91') ? phone : `+91${phone}`, otp, session_id: sessionId });
      const { token, user } = response.data.data;
      
      if (authMode === 'SIGNUP') {
        const formData = new FormData();
        formData.append('name', name);
        if (photo) formData.append('photo', photo);
        if (certificate) formData.append('certificate', certificate);

        const profileRes = await api.post('/users/complete-profile', formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setAuth(token, profileRes.data.user);
        router.push("/worker");
      } else {
        if (!user.name) {
          setError("Account not fully registered. Please sign up first.");
          setOtpSent(false);
          setOtp("");
        } else {
          setAuth(token, user);
          router.push("/worker");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Invalid OTP or Server Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090b14] p-6 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>

      <div className="bg-[#111424]/80 backdrop-blur-3xl p-10 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/5 z-10 relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-500 opacity-50"></div>

        <div>
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2 tracking-tight">Worker Portal</h1>
            <p className="text-slate-400 font-medium">Join the elite gig network</p>
          </div>

          <div className="flex bg-[#090b14] p-1 rounded-2xl mb-8 border border-white/5">
            <button 
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'LOGIN' ? 'bg-[#1e233b] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => { setAuthMode('LOGIN'); setOtpSent(false); setError(""); }}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'SIGNUP' ? 'bg-[#1e233b] text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => { setAuthMode('SIGNUP'); setOtpSent(false); setError(""); }}
            >
              Sign Up
            </button>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold p-3 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}
              
              {authMode === 'SIGNUP' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 rounded-xl border border-white/10 bg-[#090b14] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600 font-medium"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                      className="w-full px-5 py-3 rounded-xl border border-white/10 bg-[#090b14] text-white focus:outline-none focus:border-emerald-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Certification Document</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setCertificate(e.target.files ? e.target.files[0] : null)}
                      className="w-full px-5 py-3 rounded-xl border border-white/10 bg-[#090b14] text-white focus:outline-none focus:border-emerald-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+91</span>
                  <input
                    type="tel"
                    className="w-full pl-14 pr-5 py-4 rounded-xl border border-white/10 bg-[#090b14] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600 font-medium"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {loading ? "Processing..." : "Continue"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold p-3 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {error}
                </div>
              )}
              
              {devOtp && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500"></div>
                  <p className="text-xs text-emerald-400 font-bold mb-1 uppercase tracking-widest">DEV MODE OTP</p>
                  <p className="text-3xl font-mono text-white tracking-[0.3em] font-light">{devOtp}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">6-Digit Code</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 rounded-xl border border-white/10 bg-[#090b14] text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-center tracking-[1em] font-mono text-2xl placeholder:text-slate-600"
                  placeholder="------"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {loading ? "Verifying..." : (authMode === 'SIGNUP' ? "Complete Registration" : "Sign In")}
              </button>
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
                >
                  Change phone number?
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
