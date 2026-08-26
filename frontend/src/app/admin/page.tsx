"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminApp() {
  const [ledger, setLedger] = useState<{ grossTurnover: string; reserve: string; dividendPool: string } | null>(null);
  const [stats, setStats] = useState<{ activeWorkers: number | null; pendingBookings: number | null; avgDispatchTime: string | null }>({ activeWorkers: null, pendingBookings: null, avgDispatchTime: null });
  const [kycPending, setKycPending] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const { client, connected } = useStomp();
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await api.get('/admin/cooperative/dividend-ledger');
        setLedger({
          grossTurnover: res.data.gross_turnover?.toString() ?? '—',
          reserve: res.data.commission_reserve?.toString() ?? '—',
          dividendPool: res.data.dividend_pool_balance?.toString() ?? '—'
        });
      } catch (err) {
        console.error("Ledger API failed:", err);
        setLedger(null);
      } finally {
        setLoadingLedger(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats({
          activeWorkers: res.data.active_workers ?? null,
          pendingBookings: res.data.pending_bookings ?? null,
          avgDispatchTime: res.data.avg_dispatch_time_seconds != null
            ? `${Math.floor(res.data.avg_dispatch_time_seconds / 60)}m ${res.data.avg_dispatch_time_seconds % 60}s`
            : null
        });
      } catch (err) {
        console.error("Stats API failed:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchKyc = async () => {
      try {
        const res = await api.get('/admin/workers/kyc-pending');
        setKycPending(res.data?.content ?? res.data ?? []);
      } catch (err) {
        console.error("KYC API failed:", err);
      }
    };

    fetchLedger();
    fetchStats();
    fetchKyc();
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

  const StatCard = ({ label, value, loading }: { label: string; value: string | number | null; loading: boolean }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <p className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="h-10 w-24 bg-slate-100 rounded-xl animate-pulse" />
      ) : value != null ? (
        <h3 className="text-4xl font-extrabold text-slate-900">{value}</h3>
      ) : (
        <h3 className="text-2xl font-bold text-slate-400">No data</h3>
      )}
    </div>
  );

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

      {/* Main Content */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Stats Grid — Live from API */}
          <div className="grid grid-cols-3 gap-6">
            <StatCard label="Active Workers" value={stats.activeWorkers} loading={loadingStats} />
            <StatCard label="Pending Bookings" value={stats.pendingBookings} loading={loadingStats} />
            <StatCard label="Avg Dispatch Time" value={stats.avgDispatchTime} loading={loadingStats} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* SOS Incident Desk — Real WebSocket */}
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

            {/* AI Forecast — placeholder until AI endpoint is ready */}
            <section className="bg-white rounded-3xl border border-indigo-100 p-8 relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <h2 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                  <span className="text-indigo-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </span>
                  AI Demand Forecast
                </h2>
                <span className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold px-2 py-1 rounded">Pending Setup</span>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center min-h-[100px] text-center gap-2">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                <p className="text-sm text-slate-400 font-medium">Connect the AI/Bhashini endpoint<br/>to enable demand forecasting.</p>
              </div>
            </section>
          </div>

          {/* Live Dispatch Radar */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col h-[500px] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-900">Live Dispatch Radar</h2>
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-lg">Map integration pending</span>
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-100">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] opacity-10"></div>
              <span className="relative z-10 font-bold bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-slate-600 text-sm">Mapbox integration — configure MAPBOX_TOKEN to enable</span>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Federation Ledger — Live from API */}
          <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]"></div>
            <h2 className="font-bold text-xl mb-8 flex items-center gap-2">
              <span className="text-indigo-400">❖</span> Federation Ledger
            </h2>
            <div className="space-y-6 relative z-10">
              {loadingLedger ? (
                <div className="space-y-4">
                  <div className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                    <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                  </div>
                </div>
              ) : ledger ? (
                <>
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
                </>
              ) : (
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
                  <p className="text-slate-400 text-sm font-medium">Ledger data unavailable</p>
                  <p className="text-slate-500 text-xs mt-1">API endpoint not responding</p>
                </div>
              )}
            </div>
          </section>

          {/* Worker KYC Desk — Live from API */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-900">Worker KYC Desk</h2>
              {kycPending.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">{kycPending.length} Pending</span>
              )}
            </div>
            {kycPending.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-sm text-slate-500 font-medium">No KYC requests pending</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {kycPending.map((worker: any, idx: number) => (
                  <div key={idx} className="p-5 border border-slate-200 rounded-2xl bg-slate-50 hover:bg-white transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{worker.name || `Wrk-${worker.id?.toString().slice(-4)}`}</h3>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">{worker.skill_type || 'Pending skill assignment'}</p>
                      </div>
                      <div className="text-xs font-bold text-slate-400">New</div>
                    </div>
                    <button className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                      Review Documents
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
