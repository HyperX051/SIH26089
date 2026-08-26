"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const response = await api.post('/auth/admin-login', { email, password });
      const { token, user } = response.data.data;
      setAuth(token, user);
      router.push("/admin");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>

        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Federation Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100 text-center">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Admin Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all bg-slate-50"
              placeholder="admin@cooperative.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Secure Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all bg-slate-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4"
          >
            {loading ? "Authenticating..." : "Authenticate"}
          </button>
        </form>
      </div>
    </div>
  );
}
