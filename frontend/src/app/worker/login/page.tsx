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
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', { phone, role: 'WORKER' });
      setSessionId(response.data.session_id);
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
      const response = await api.post('/auth/verify-otp', { phone, otp, session_id: sessionId });
      setAuth(response.data.token, response.data.user);
      router.push("/worker");
    } catch (err: any) {
      console.error(err);
      setError("Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Simulation: Registration sent to local Cooperative Society for manual verification.");
    setIsRegistering(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-green-500/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>

      <div className="bg-slate-800/60 backdrop-blur-2xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 z-10">
        
        {isRegistering ? (
          <div>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">Worker Registration</h1>
              <p className="text-slate-400 text-sm">Join the Cooperative Society</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Aadhaar Number</label>
                <input type="text" required className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/50 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="0000 0000 0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">NCCT Certificate ID</label>
                <input type="text" required className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-900/50 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="NCCT-2026-XXXX" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all mt-2">
                Submit for Verification
              </button>
              <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-slate-400 text-sm hover:text-white transition-colors mt-2">
                Back to Login
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">Worker Portal</h1>
              <p className="text-slate-400">Join the cooperative gig network</p>
            </div>

            {!otpSent ? (
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
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                {error && <div className="text-red-400 text-sm font-bold text-center">{error}</div>}
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
            )}

            <div className="mt-8 pt-6 border-t border-slate-700 text-center">
              <p className="text-slate-400 text-sm">Not registered with a Cooperative yet?</p>
              <button 
                onClick={() => setIsRegistering(true)}
                className="mt-2 text-green-400 hover:text-green-300 font-semibold text-sm transition-colors"
              >
                Register as Service Provider &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
