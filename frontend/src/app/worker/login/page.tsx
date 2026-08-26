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
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [needsProfile, setNeedsProfile] = useState(false);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      if (!user.name) {
        setNeedsProfile(true);
        setTempToken(token);
        setTempUser(user);
      } else {
        setAuth(token, user);
        router.push("/worker");
      }
    } catch (err: any) {
      console.error(err);
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!photo) {
      setError("Please upload an ID/Photo for verification");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('photo', photo);

      const response = await api.post('/auth/complete-profile', formData, {
        headers: {
          'Authorization': `Bearer ${tempToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedUser = response.data.user;
      setAuth(tempToken!, updatedUser);
      router.push("/worker");
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to complete profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-green-500/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>

      <div className="bg-slate-800/60 backdrop-blur-2xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 z-10">
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">Worker Portal</h1>
              <p className="text-slate-400">Join the cooperative gig network</p>
            </div>

            {!otpSent && !needsProfile ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                {error && <div className="text-red-400 text-sm font-bold text-center">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/50 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-600"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            ) : !needsProfile ? (
              <form onSubmit={handleVerify} className="space-y-4">
                {error && <div className="text-red-400 text-sm font-bold text-center">{error}</div>}
                
                {devOtp && (
                  <div className="mb-4 p-4 rounded-xl bg-slate-900/50 border border-green-500/30 text-center">
                    <p className="text-sm text-green-400 font-bold mb-1">DEV MODE OTP</p>
                    <p className="text-2xl font-mono text-white tracking-[0.5em]">{devOtp}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Enter Verification Code</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/50 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-center tracking-[0.5em] font-mono text-lg placeholder:text-slate-600"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify Identity"}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-slate-400 text-sm hover:text-green-400 transition-colors"
                >
                  Back to Mobile Entry
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                {error && <div className="text-red-400 text-sm font-bold text-center">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/50 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-600"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Upload Verification ID / Photo</label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/50 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-500/20 file:text-green-400 hover:file:bg-green-500/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold py-3 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                >
                  {loading ? "Saving..." : "Complete Setup"}
                </button>
              </form>
            )}

          </div>
      </div>
    </div>
  );
}
