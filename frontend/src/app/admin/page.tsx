"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

export default function AdminApp() {
  const [ledger, setLedger] = useState<{ grossTurnover: string; reserve: string; dividendPool: string } | null>(null);
  const [stats, setStats] = useState<{ activeWorkers: number | null; totalBookings: number | null; avgDispatchTime: string | null }>({ activeWorkers: null, totalBookings: null, avgDispatchTime: null });
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [kycPending, setKycPending] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [liveBookings, setLiveBookings] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [modalType, setModalType] = useState<'workers' | 'bookings' | 'sos' | 'ledger' | null>(null);
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const { client, connected } = useStomp();
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await api.get('/admin/cooperative/dividend-ledger');
        const payload = res.data.data;
        setLedger({
          grossTurnover: payload?.gross_turnover?.toString() ?? '—',
          reserve: payload?.commission_reserve?.toString() ?? '—',
          dividendPool: payload?.dividend_pool_balance?.toString() ?? '—'
        });
      } catch (err) {
        console.error("Ledger API failed:", err);
      } finally {
        setLoadingLedger(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        const payload = res.data.data;
        setStats({
          activeWorkers: payload?.active_workers ?? null,
          totalBookings: payload?.total_bookings ?? null,
          avgDispatchTime: payload?.avg_dispatch_time_seconds != null
            ? `${Math.floor(payload.avg_dispatch_time_seconds / 60)}m ${payload.avg_dispatch_time_seconds % 60}s`
            : null
        });
      } catch (err) {
        console.error("Stats API failed:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchDistribution = async () => {
      try {
        const res = await api.get('/admin/stats/distribution');
        setDistribution(res.data.data || {});
      } catch (err) {
        console.error("Distribution API failed", err);
      }
    };

    const fetchKyc = async () => {
      try {
        const res = await api.get('/admin/workers/kyc-pending');
        const list = res.data?.content ?? res.data ?? [];
        if (list.length > 0) {
          setKycPending(list);
        } else {
          throw new Error("Empty KYC list");
        }
      } catch (err) {
        console.error("KYC API failed:", err);
      }
    };

    const fetchLiveBookings = async () => {
      try {
        const res = await api.get('/admin/bookings/live');
        setLiveBookings(res.data.data || []);
      } catch (err) {
        console.error("Live bookings API failed:", err);
      }
    };

    const fetchSosAlerts = async () => {
      try {
        const res = await api.get('/admin/sos');
        const allAlerts = res.data.data || [];
        // Only show OPEN alerts in the summary card
        const openAlerts = allAlerts.filter((a: any) => a.status === 'OPEN');
        setSosAlerts(openAlerts);
      } catch (err) {
        console.error("SOS API failed:", err);
      }
    };

    fetchLedger();
    fetchStats();
    fetchDistribution();
    fetchKyc();
    fetchLiveBookings();
    fetchSosAlerts();
  }, []);

  // Listen to SOS Alerts and Global Stats updates
  useEffect(() => {
    if (client && connected) {
      const sosSub = client.subscribe('/topic/admin/sos', (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'SOS_ALERT') {
          setSosAlerts(prev => [data.payload, ...prev]);
        }
      });
      
      const statsSub = client.subscribe('/topic/admin/stats', (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'ADMIN_STATS_UPDATE') {
          // Re-fetch stats to get fresh worker availability count
          api.get('/admin/stats').then(res => {
            const payload = res.data.data;
            setStats(prev => ({
              ...prev,
              activeWorkers: payload?.active_workers ?? null,
              totalBookings: payload?.total_bookings ?? null
            }));
          });
        }
      });

      return () => {
        sosSub.unsubscribe();
        statsSub.unsubscribe();
      };
    }
  }, [client, connected]);

  const openModal = async (type: 'workers' | 'bookings' | 'sos' | 'ledger') => {
    setModalType(type);
    setModalLoading(true);
    setModalData([]);
    try {
      let endpoint = '';
      if (type === 'workers') endpoint = '/admin/workers/active';
      if (type === 'bookings') endpoint = '/admin/bookings';
      if (type === 'sos') endpoint = '/admin/sos';
      if (type === 'ledger') endpoint = '/admin/cooperative/ledger-breakdown';
      
      const res = await api.get(endpoint);
      setModalData(res.data.data || []);
    } catch (err) {
      console.error("Failed to load modal data", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleResolveSos = async (id: string) => {
    try {
      await api.post(`/admin/sos/${id}/resolve`);
      // Update local modalData state
      setModalData(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
      // Update summary card state to remove it
      setSosAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to resolve SOS", err);
    }
  };

  const StatCard = ({ label, value, loading, onClick }: { label: string; value: string | number | null; loading: boolean; onClick?: () => void }) => (
    <div 
      onClick={onClick}
      className={`bg-card p-6 border border-border rounded-3xl transition-all ${onClick ? 'cursor-pointer hover:-translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]' : 'shadow-[4px_4px_0px_rgba(0,0,0,1)]'}`}
    >
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
        <Link href="/admin" className="flex items-center gap-3 cursor-pointer">
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
            <StatCard label="Active Workers" value={stats.activeWorkers} loading={loadingStats} onClick={() => openModal('workers')} />
            <StatCard label="Total Bookings" value={stats.totalBookings} loading={loadingStats} onClick={() => openModal('bookings')} />
            <StatCard label="Avg Dispatch Time" value={stats.avgDispatchTime ? `${stats.avgDispatchTime}s` : null} loading={loadingStats} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SOS Incidents */}
            <section 
              className="bg-card border-2 border-red-500 p-8 shadow-[6px_6px_0px_rgba(239,68,68,1)] rounded-3xl relative overflow-hidden cursor-pointer hover:shadow-[8px_8px_0px_rgba(239,68,68,1)] hover:-translate-y-1 transition-all"
              onClick={() => openModal('sos')}
            >
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

            {/* Service Demand Breakdown */}
            <section className="bg-card border border-border rounded-3xl p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <h2 className="font-extrabold text-xl text-foreground flex items-center gap-2 uppercase tracking-tight">
                  Demand Breakdown
                </h2>
                <span className="bg-primary text-primary-foreground text-white text-[10px] uppercase font-bold px-2 py-1 tracking-widest">Live</span>
              </div>
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                {Object.keys(distribution).length > 0 ? (
                  Object.entries(distribution).sort((a, b) => b[1] - a[1]).map(([service, count], idx) => {
                    const total = Object.values(distribution).reduce((acc, val) => acc + val, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>{service}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    No data available
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Live Dispatch Radar */}
          <section className="bg-card border border-border rounded-3xl p-8 flex flex-col h-[400px] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-extrabold text-xl text-foreground uppercase tracking-tight">Global Dispatch Map</h2>
              <span className="bg-green-100 text-green-800 text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-sm">Live</span>
            </div>
            <div className="flex-1 bg-background border border-border rounded-2xl relative overflow-hidden z-0">
              <MapPicker 
                initialPosition={{ lat: 12.9716, lng: 77.5946 }} 
                onLocationSelect={() => {}} 
                markers={[
                  ...liveBookings.map(b => ({
                    id: b.booking_id,
                    lat: b.latitude,
                    lng: b.longitude,
                    type: 'BOOKING' as const
                  })),
                  ...sosAlerts.map((s, idx) => ({
                    id: `sos-${idx}`,
                    lat: s.latitude,
                    lng: s.longitude,
                    type: 'SOS' as const
                  }))
                ]}
              />
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Federation Ledger */}
          <section 
            className="bg-card border border-primary/30 p-8 shadow-sm rounded-3xl relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openModal('ledger')}
          >
            <div className="absolute -right-10 -top-10 bg-primary/10 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="font-extrabold text-xl mb-8 flex items-center gap-2 uppercase tracking-tight text-foreground relative z-10 hover:text-primary transition-colors">
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

      {/* Modal Overlay */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalType(null)}></div>
          <div className="bg-card w-full max-w-4xl max-h-[80vh] flex flex-col relative z-10 rounded-3xl border border-border shadow-2xl overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/30">
              <h2 className="text-2xl font-extrabold uppercase tracking-tight">
                {modalType === 'workers' && 'Active Workers'}
                {modalType === 'bookings' && 'Total Bookings'}
                {modalType === 'sos' && 'SOS Alerts'}
                {modalType === 'ledger' && 'Federation Ledger Breakdown'}
              </h2>
              <button 
                onClick={() => setModalType(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-zinc-200 hover:text-black transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex justify-center items-center h-40">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider animate-pulse">Loading data...</span>
                </div>
              ) : modalData.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <span className="text-muted-foreground font-bold uppercase tracking-wider">No data found</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider text-xs">
                      <tr>
                        {modalType === 'workers' && (
                          <>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Rating</th>
                            <th className="px-4 py-3">Total Jobs</th>
                          </>
                        )}
                        {modalType === 'bookings' && (
                          <>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Service</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Customer</th>
                            <th className="px-4 py-3">Worker</th>
                            <th className="px-4 py-3">Date</th>
                          </>
                        )}
                        {modalType === 'sos' && (
                          <>
                            <th className="px-4 py-3">Booking ID</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Actions</th>
                          </>
                        )}
                        {modalType === 'ledger' && (
                          <>
                            <th className="px-4 py-3">Booking ID</th>
                            <th className="px-4 py-3">Service</th>
                            <th className="px-4 py-3">Worker</th>
                            <th className="px-4 py-3">Turnover (₹)</th>
                            <th className="px-4 py-3 text-red-600">Commission (₹)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium">
                      {modalData.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          {modalType === 'workers' && (
                            <>
                              <td className="px-4 py-4">{row.name}</td>
                              <td className="px-4 py-4 font-mono text-xs">{row.phone}</td>
                              <td className="px-4 py-4">{row.rating} ⭐</td>
                              <td className="px-4 py-4">{row.total_jobs}</td>
                            </>
                          )}
                          {modalType === 'bookings' && (
                            <>
                              <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{row.id.split('-')[0]}...</td>
                              <td className="px-4 py-4">{row.service_type}</td>
                              <td className="px-4 py-4">
                                <span className="bg-zinc-100 border border-zinc-200 text-zinc-800 px-2 py-1 rounded-sm text-[10px] uppercase font-bold">{row.status}</span>
                              </td>
                              <td className="px-4 py-4">{row.customer_name}</td>
                              <td className="px-4 py-4">{row.worker_name}</td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                            </>
                          )}
                          {modalType === 'sos' && (
                            <>
                              <td className="px-4 py-4 font-mono text-xs text-red-600">{row.booking_id.split('-')[0]}...</td>
                              <td className="px-4 py-4">{row.user_name}</td>
                              <td className="px-4 py-4 font-mono text-xs">{row.user_phone}</td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold ${row.status === 'OPEN' ? 'bg-red-100 border-red-200 text-red-800' : 'bg-green-100 border-green-200 text-green-800'} border`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                              <td className="px-4 py-4 flex gap-2">
                                {row.status === 'OPEN' && (
                                  <button
                                    onClick={() => handleResolveSos(row.id)}
                                    className="bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                  >
                                    Resolve
                                  </button>
                                )}
                                <a 
                                  href="tel:100" 
                                  className="bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Dial 100
                                </a>
                                <a 
                                  href={`https://maps.google.com/?q=${row.latitude},${row.longitude}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Maps
                                </a>
                              </td>
                            </>
                          )}
                          {modalType === 'ledger' && (
                            <>
                              <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{row.booking_id.split('-')[0]}...</td>
                              <td className="px-4 py-4">{row.service_type}</td>
                              <td className="px-4 py-4">{row.worker_name}</td>
                              <td className="px-4 py-4 text-green-700">₹{row.total_turnover}</td>
                              <td className="px-4 py-4 text-red-600 font-bold">-₹{row.commission_deducted}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
