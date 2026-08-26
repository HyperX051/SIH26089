"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

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
    <div className="bg-card p-6 border border-border rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
      <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
      ) : value != null ? (
        <h3 className="text-4xl font-extrabold text-foreground">{value}</h3>
      ) : (
        <h3 className="text-2xl font-bold text-muted-foreground/70">No data</h3>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-card flex flex-col font-sans text-foreground">
      
      {/* Top Navbar */}
      <header className="bg-card text-foreground px-8 h-16 flex justify-between items-center border-b border-border sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center text-white font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight uppercase">Admin</h1>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Live Stream</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-muted border border-zinc-300 flex items-center justify-center font-bold text-muted-foreground shadow-sm">
            A
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-[1400px] mx-auto">
        
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Active Workers" value={stats.activeWorkers} loading={loadingStats} />
            <StatCard label="Pending Bookings" value={stats.pendingBookings} loading={loadingStats} />
            <StatCard label="Avg Dispatch Time" value={stats.avgDispatchTime} loading={loadingStats} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SOS Incident Desk */}
            <section className="bg-card border border-red-500 rounded-3xl p-8 shadow-[4px_4px_0px_rgba(239,68,68,1)] relative overflow-hidden">
              <h2 className="font-extrabold text-xl text-red-600 mb-4 flex items-center gap-3 relative z-10 uppercase tracking-tight">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 bg-red-500"></span>
                </span>
                SOS Incidents
              </h2>
              {sosAlerts.length > 0 ? (
                <div className="space-y-3 relative z-10 max-h-[200px] overflow-y-auto">
                  {sosAlerts.map((alert, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col shadow-sm">
                      <span className="text-red-700 font-bold text-sm">Emergency Alert: Booking {alert.booking_id}</span>
                      <span className="text-red-500 text-xs mt-1 font-medium">Location: {alert.latitude}, {alert.longitude}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-background border border-border rounded-xl p-5 text-sm text-zinc-600 font-bold relative z-10 uppercase tracking-wider shadow-sm">
                  No active incidents. Listening for SOS_ALERT.
                </div>
              )}
            </section>

            {/* AI Forecast */}
            <section className="bg-card border border-border rounded-3xl p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <h2 className="font-extrabold text-xl text-foreground flex items-center gap-2 uppercase tracking-tight">
                  AI Forecast
                </h2>
                <span className="bg-primary text-primary-foreground text-white text-[10px] uppercase font-bold px-2 py-1 tracking-widest">Pending</span>
              </div>
              <div className="bg-background p-5 border border-border rounded-xl flex flex-col items-center justify-center min-h-[100px] text-center gap-2 shadow-sm">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Connect AI to enable demand forecasting.</p>
              </div>
            </section>
          </div>

          {/* Live Dispatch Radar */}
          <section className="bg-card border border-border rounded-3xl p-8 flex flex-col h-[400px] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-extrabold text-xl text-foreground uppercase tracking-tight">Global Dispatch Map</h2>
              <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 uppercase tracking-wider">Map pending</span>
            </div>
            <div className="flex-1 bg-background flex items-center justify-center border border-border rounded-2xl">
              <span className="font-bold bg-card px-4 py-2 border border-border text-black text-xs uppercase tracking-wider">Configure MAPBOX_TOKEN to enable</span>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Federation Ledger */}
          <section className="bg-card border border-primary/30 p-8 shadow-sm rounded-3xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 bg-primary/10 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="font-extrabold text-xl mb-8 flex items-center gap-2 uppercase tracking-tight text-foreground relative z-10">
              Federation Ledger
            </h2>
            <div className="space-y-6 relative z-10">
              {loadingLedger ? (
                <div className="space-y-4">
                  <div className="h-16 bg-muted rounded-2xl animate-pulse border border-border" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-muted rounded-2xl animate-pulse border border-border" />
                    <div className="h-20 bg-muted rounded-2xl animate-pulse border border-border" />
                  </div>
                </div>
              ) : ledger ? (
                <>
                  <div className="bg-background p-5 border border-border rounded-2xl">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">Gross Turnover</p>
                    <p className="text-4xl font-extrabold font-mono text-foreground">₹{ledger.grossTurnover}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background rounded-2xl p-5 border border-border">
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">Reserve (5%)</p>
                      <p className="text-xl font-bold font-mono text-foreground">₹{ledger.reserve}</p>
                    </div>
                    <div className="bg-primary/10 text-primary rounded-2xl p-5 border border-primary/20 shadow-sm">
                      <p className="text-primary text-xs font-bold uppercase tracking-wider mb-2">Dividend Pool</p>
                      <p className="text-xl font-extrabold font-mono">₹{ledger.dividendPool}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-background rounded-2xl p-6 border border-border text-center shadow-sm">
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Ledger data unavailable</p>
                </div>
              )}
            </div>
          </section>

          {/* Worker KYC Desk */}
          <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-extrabold text-xl text-foreground uppercase tracking-tight">KYC / Onboarding</h2>
              {kycPending.length > 0 && (
                <span className="bg-primary text-primary-foreground text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest">{kycPending.length} Pending</span>
              )}
            </div>
            {kycPending.length === 0 ? (
              <div className="p-6 text-center bg-background border border-border rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">No KYC requests pending</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {kycPending.map((worker: any, idx: number) => (
                  <div key={idx} className="p-5 border border-border rounded-2xl bg-card hover:border-border hover:shadow-md transition-all flex flex-col gap-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-extrabold text-foreground text-lg">{worker.name || `Wrk-${worker.id?.toString().slice(-4)}`}</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{worker.skill_type || 'Pending assignment'}</p>
                      </div>
                    </div>
                    <button className="w-full bg-muted hover:bg-primary text-primary-foreground hover:text-white border border-border rounded-xl text-zinc-700 py-3 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm">
                      Review Docs
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
