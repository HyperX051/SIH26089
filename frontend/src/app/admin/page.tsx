"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminApp() {
  const [ledger, setLedger] = useState({ grossTurnover: "4.5L", reserve: "22.5K", dividendPool: "18.0K" });
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const { client, connected } = useStomp();
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    // Fetch Ledger
    const fetchLedger = async () => {
      try {
        const res = await api.get('/admin/cooperative/dividend-ledger');
        setLedger({
          grossTurnover: res.data.gross_turnover.toString(),
          reserve: res.data.commission_reserve.toString(),
          dividendPool: res.data.dividend_pool_balance.toString()
        });
      } catch(err) {
        console.error("Ledger API failed, using mock data");
      }
    };
    fetchLedger();
  }, []);

  useEffect(() => {
    if (client && connected && token) {
      const sub = client.subscribe('/topic/admin/sos', (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'SOS_ALERT') {
          setSosAlerts(prev => [data.payload, ...prev]);
        }
      });
      return () => sub.unsubscribe();
    }
  }, [client, connected, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-purple-500/30">
      
      {/* Top Navbar */}
      <header className="bg-white text-slate-800 px-8 h-16 flex justify-between items-center shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Federation Command</h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Live Stream</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" />
          </div>
        </div>
      </header>

      {/* Main Content (Full Width) */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        
        {/* Left Column (Main Maps & Stats) spans 8 cols */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Active Workers</p>
              <h3 className="text-4xl font-extrabold text-slate-900">84</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Pending Bookings</p>
              <h3 className="text-4xl font-extrabold text-slate-900">12</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">Avg Dispatch Time</p>
              <h3 className="text-4xl font-extrabold text-slate-900">1m 45s</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <section className="bg-white rounded-3xl border border-red-200 p-8 relative overflow-hidden shadow-sm">
              <div className="absolute -right-10 -top-10 text-red-50 opacity-50 transform rotate-12">
                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              </div>
              
              <h2 className="font-bold text-xl text-red-600 mb-4 flex items-center gap-3 relative z-10">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                SOS Incident Desk
              </h2>
              {sosAlerts.length > 0 ? (
                <div className="space-y-3 relative z-10 max-h-[200px] overflow-y-auto">
                  {sosAlerts.map((alert, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded-xl flex flex-col">
                      <span className="text-red-700 font-bold text-sm">Emergency Alert: Booking {alert.booking_id}</span>
                      <span className="text-red-500 text-xs mt-1">Location: {alert.latitude}, {alert.longitude}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-red-100 p-5 rounded-2xl text-sm text-slate-600 font-medium relative z-10">
                  No active incidents. Listening for <code className="bg-red-50 px-2 py-0.5 rounded text-red-600 mx-1">SOS_ALERT</code> events.
                </div>
              )}
            </section>

            {/* AI Demand Forecasting */}
            <section className="bg-white rounded-3xl border border-indigo-100 p-8 relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                  <span className="text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </span> 
                  AI Forecast
                </h2>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold px-2 py-1 rounded">Active</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-700 mb-2">Tomorrow: <span className="text-orange-500">Heatwave</span></p>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl text-xs mb-4 border border-slate-100">
                  <span className="text-xl">📈</span>
                  <p className="text-slate-600 font-medium">300% expected surge in <strong>AC Repair</strong> requests.</p>
                </div>
                <button className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-800 transition-colors">
                  Auto-Allocate (+20%)
                </button>
              </div>
            </section>
          </div>

          <section className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col h-[500px] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-900">Live Dispatch Radar</h2>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-700 outline-none">
                <option>Chennai Circle</option>
                <option>Coimbatore Circle</option>
              </select>
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-100">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] opacity-10"></div>
              {/* Simulated Map Elements */}
              <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse"></div>
              <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
              <div className="absolute bottom-1/4 left-1/2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
              <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl"></div>
              <span className="relative z-10 font-bold bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-slate-600 text-sm">Interactive Mapbox Interface</span>
            </div>
          </section>
        </div>

        {/* Right Column (Ledger & KYC) spans 4 cols */}
        <div className="lg:col-span-4 space-y-8">
          
          <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div>
            
            <h2 className="font-bold text-xl mb-8 flex items-center gap-2">
              <span className="text-indigo-400">❖</span> Federation Ledger
            </h2>
            
            <div className="space-y-6 relative z-10">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Gross Turnover</p>
                <p className="text-4xl font-extrabold font-mono">₹{ledger.grossTurnover}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Reserve (5%)</p>
                  <p className="text-xl font-bold font-mono text-indigo-300">₹{ledger.reserve}</p>
                </div>
                <div className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20">
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Dividend Pool</p>
                  <p className="text-xl font-bold font-mono text-emerald-400">₹{ledger.dividendPool}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-900">Worker KYC Desk</h2>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">1 Pending</span>
            </div>
            
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-white transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Wrk-9921: Ramesh</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">NCCT Electrician Certificate</p>
                </div>
                <div className="text-xs font-bold text-slate-400">2m ago</div>
              </div>
              
              <div className="flex gap-2 mb-6 flex-wrap">
                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                  🤖 AI Conf: 94%
                </span>
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                  ✓ DB Match
                </span>
              </div>
              
              <button className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                Review Documents
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
