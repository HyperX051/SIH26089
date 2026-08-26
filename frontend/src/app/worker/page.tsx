"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';

export default function WorkerApp() {
  const [activeTab, setActiveTab] = useState<'JOBS' | 'BILLING' | 'WELFARE' | 'PROFILE'>('JOBS');
  
  const [profile, setProfile] = useState<any>(null);
  const [billing, setBilling] = useState<any[]>([]);
  
  // Job States
  const [radius, setRadius] = useState(5);
  const [incomingGig, setIncomingGig] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [jobStatus, setJobStatus] = useState<'IDLE' | 'ACCEPTED' | 'IN_PROGRESS' | 'VERIFYING' | 'COMPLETED'>('IDLE');
  
  // Job Execution States
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [otp, setOtp] = useState("");

  const user = useAuthStore(state => state.user);
  const { client, connected } = useStomp();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (client && connected && user?.id) {
      const sub = client.subscribe(`/topic/worker/${user.id}`, (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'GIG_OFFERED' && jobStatus === 'IDLE' && activeTab === 'JOBS') {
          setActiveBookingId(data.payload.booking_id);
          setIncomingGig(true);
          setCountdown(data.payload.timeout_seconds || 45);
        }
      });
      return () => sub.unsubscribe();
    }
  }, [client, connected, user?.id, jobStatus, activeTab]);

  useEffect(() => {
    const fetchWorkerData = async () => {
      try {
        const profRes = await api.get('/workers/profile');
        setProfile(profRes.data.data);
      } catch (err) { console.error(err); }
      
      try {
        const billRes = await api.get('/workers/billing');
        setBilling(billRes.data.data);
      } catch (err) { console.error(err); }
    };
    if (user?.id) {
      fetchWorkerData();
    }
  }, [user?.id]);

  useEffect(() => {
    // Local countdown fallback for demo
    if (incomingGig) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIncomingGig(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [incomingGig]);

  const acceptGig = () => {
    if (client && connected && activeBookingId) {
      client.publish({
        destination: '/app/gig-response',
        body: JSON.stringify({ booking_id: activeBookingId, action: 'ACCEPT' })
      });
    }
    setIncomingGig(false);
    setJobStatus('ACCEPTED');
  };

  const simulateOCR = async () => {
    try {
      // Real API call attempt
      const res = await api.post('/ai/ocr-receipt', { bookingId: activeBookingId, receiptImageUrl: 'mock_url' });
      setOcrData(res.data);
    } catch (err) {
      console.error("OCR API failed:", err);
    }
  };

  const verifyOTP = async () => {
    try {
      await api.post(`/bookings/${activeBookingId}/verify-otp-complete`, { enteredOtp: otp });
      setJobStatus('COMPLETED');
    } catch (err) {
      console.error("OTP API failed:", err);
      alert("Invalid OTP or server error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 flex font-sans">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">Worker Terminal</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('JOBS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'JOBS' ? 'bg-green-500/10 text-green-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Active Gigs
          </button>
          <button 
            onClick={() => setActiveTab('BILLING')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'BILLING' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            Past Billing
          </button>
          <button 
            onClick={() => setActiveTab('WELFARE')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'WELFARE' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            Welfare & Benefits
          </button>
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'PROFILE' ? 'bg-purple-500/10 text-purple-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            Profile & Skills
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <p className="text-xs text-slate-500 font-semibold mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${jobStatus === 'IDLE' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></span>
              <span className="text-sm font-bold text-white">{jobStatus === 'IDLE' ? 'Available' : 'On Job'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Dashboard Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <h1 className="text-xl font-bold text-white tracking-tight">
            {activeTab === 'JOBS' ? 'Dispatch Control' : activeTab === 'BILLING' ? 'Past Billing' : activeTab === 'WELFARE' ? 'Cooperative Welfare' : 'Professional Profile'}
          </h1>
          <button 
            onClick={async () => {
              try {
                await api.post('/safety/sos', {
                  bookingId: activeBookingId,
                  latitude: 12.9716, // dummy or real if added
                  longitude: 77.5946,
                  telemetry: { battery: 75 }
                });
                alert('SOS Alert Triggered! Federation command center notified.');
              } catch (e) {
                console.error(e);
                alert('Failed to trigger SOS');
              }
            }}
            className="bg-red-500/10 text-red-500 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors"
          >
            Emergency SOS
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'JOBS' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              
              {/* Left Panel: Available Gigs & Radar */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                
                {jobStatus === 'IDLE' && (
                  <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      Dispatch Radar
                    </h2>
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Search Radius</span>
                        <span className="text-green-400 font-bold">{radius} km</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="25" 
                        value={radius} 
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="w-full accent-green-500"
                      />
                    </div>
                    <div className="bg-slate-900 rounded-xl p-4 text-center text-sm text-slate-400 border border-slate-800 flex items-center justify-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></span>
                      Listening for federation broadcasts...
                    </div>
                  </section>
                )}

                {(jobStatus !== 'IDLE' && jobStatus !== 'COMPLETED') && (
                  <div className="bg-slate-800 p-6 rounded-2xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      </div>
                      <div>
                        <h2 className="font-bold text-white">Plumbing Request</h2>
                        <p className="text-sm text-slate-400">Customer: Ananya R.</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4">
                      <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">Distance</span><span className="text-white">2.4 km</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Est. Payout</span><span className="text-green-400 font-bold">₹450</span></div>
                    </div>

                    {jobStatus === 'ACCEPTED' && (
                      <button onClick={() => setJobStatus('IN_PROGRESS')} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-colors shadow-lg shadow-blue-600/20">
                        Arrived & Start Job
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel: Execution Workflow / Map */}
              <div className="w-full lg:w-2/3 bg-slate-800/30 rounded-3xl border border-slate-700/50 p-8 flex flex-col relative overflow-hidden">
                
                {jobStatus === 'IDLE' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center opacity-30">
                      <svg className="w-24 h-24 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                      <p className="text-xl font-medium">Map view idle.</p>
                      <p className="text-sm">Waiting for incoming requests...</p>
                    </div>
                  </div>
                )}

                {jobStatus === 'IN_PROGRESS' && (
                  <div className="max-w-2xl mx-auto w-full space-y-6 animate-in slide-in-from-bottom-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Job Execution Protocol</h2>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h3 className="font-bold text-white mb-4">1. AI Audit (Before/After)</h3>
                        <div className="space-y-3">
                          <button 
                            onClick={() => setBeforeImage("captured")}
                            className={`w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center font-bold transition-all ${beforeImage ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                          >
                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {beforeImage ? "Before: Uploaded" : "Capture Before"}
                          </button>
                          <button 
                            onClick={() => setAfterImage("captured")}
                            className={`w-full py-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center font-bold transition-all ${afterImage ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                          >
                            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {afterImage ? "After: Uploaded" : "Capture After"}
                          </button>
                        </div>
                      </section>

                      <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col">
                        <h3 className="font-bold text-white mb-4">2. Hardware Receipt</h3>
                        <div className="flex-1 flex flex-col justify-center">
                          {!receiptImage ? (
                            <button onClick={() => { setReceiptImage("uploaded"); simulateOCR(); }} className="w-full py-8 bg-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-400 font-bold border border-slate-700 hover:border-slate-500 transition-colors">
                              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                              Scan Bill via OCR
                            </button>
                          ) : (
                            <div className="bg-slate-900 h-full p-4 rounded-xl border border-slate-700">
                              {ocrData ? (
                                <div className="h-full flex flex-col justify-between">
                                  <div>
                                    <div className="flex justify-between text-slate-500 text-xs mb-3 uppercase tracking-wider"><span>Item</span><span>Price</span></div>
                                    {ocrData.items.map((i: any, idx: number) => (
                                      <div key={idx} className="flex justify-between font-mono text-sm text-slate-300"><span>{i.name}</span><span>₹{i.price}</span></div>
                                    ))}
                                  </div>
                                  <div className="border-t border-slate-700 pt-3 flex justify-between text-green-400 font-bold">
                                    <span>Total Added</span><span>₹{ocrData.total}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Running AI OCR...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <h3 className="font-bold text-white">3. Mutual Closure</h3>
                          <p className="text-sm text-slate-400">Ask the customer for their 6-digit closure OTP.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="0 0 0 0 0 0"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-6 py-4 text-center tracking-[0.5em] font-mono text-2xl text-white focus:border-green-500 focus:outline-none transition-colors"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                        />
                        <button 
                          onClick={verifyOTP}
                          disabled={otp.length !== 6 || !beforeImage || !afterImage}
                          className="px-8 bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20"
                        >
                          Verify & Close
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {jobStatus === 'COMPLETED' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
                    <div className="bg-slate-800 border border-green-500/50 p-10 rounded-3xl text-center max-w-md w-full shadow-2xl animate-in zoom-in-95">
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Job Completed!</h2>
                      <p className="text-slate-400 mb-8">Funds have been added to your escrow.</p>
                      
                      <div className="bg-slate-900 p-6 rounded-2xl text-sm text-slate-300 font-mono text-left mb-8 border border-slate-700">
                        <div className="flex justify-between mb-3"><span>Base Wage:</span><span className="text-white">₹450.00</span></div>
                        <div className="flex justify-between mb-4 text-slate-500"><span>Welfare Deduction:</span><span>-₹22.50</span></div>
                        <div className="border-t border-slate-700 pt-4 flex justify-between font-bold text-lg text-green-400"><span>Net Settlement:</span><span>₹427.50</span></div>
                      </div>
                      
                      <button 
                        onClick={() => { setJobStatus('IDLE'); setOtp(""); setBeforeImage(null); setAfterImage(null); setReceiptImage(null); setOcrData(null); }} 
                        className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-bold text-white transition-colors"
                      >
                        Return to Radar
                      </button>
                  </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'BILLING' && (
            <div className="max-w-4xl animate-in fade-in">
              <h2 className="text-3xl font-bold text-white mb-8">Past Billing</h2>
              {billing.length === 0 ? (
                <p className="text-slate-400">No past bookings found.</p>
              ) : (
                <div className="space-y-4">
                  {billing.map((b: any) => (
                    <div key={b.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-white text-lg">{b.serviceType}</h3>
                        <p className="text-sm text-slate-400">Completed on: {new Date(b.completedAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">₹{b.totalEarnings}</p>
                        <p className="text-xs text-slate-500">Base: ₹{b.baseWage} | Mat: ₹{b.materialCost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'WELFARE' && (
            <div className="max-w-4xl animate-in fade-in">
              <h2 className="text-3xl font-bold text-white mb-8">Welfare & Insurance</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 text-9xl opacity-10">🛡️</div>
                  <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">Cooperative Health Insurance</p>
                  <h3 className="text-4xl font-extrabold text-white mb-4">Active</h3>
                  <p className="text-lg text-blue-100 font-medium">Cover: ₹2,00,000</p>
                  <p className="text-sm text-blue-300 mt-2">Valid until: Dec 2026</p>
                  <button className="mt-8 bg-white text-blue-700 font-bold py-3 px-6 rounded-xl transition-colors hover:bg-blue-50">
                    View Policy Card
                  </button>
                </div>

                <div className="grid grid-rows-2 gap-6">
                  <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex flex-col justify-center">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Provident Fund (Matched)</p>
                    <h3 className="text-3xl font-bold text-green-400">₹14,500<span className="text-lg text-green-600">.00</span></h3>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex flex-col justify-center">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Platform Dividend Share</p>
                    <h3 className="text-3xl font-bold text-purple-400">₹1,250<span className="text-lg text-purple-600">.00</span></h3>
                    <p className="text-xs text-slate-500 mt-1">To be credited Q4 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-4xl animate-in fade-in">
              <div className="flex items-center gap-8 mb-10">
                <div className="w-32 h-32 bg-slate-800 border-4 border-green-500 rounded-full flex items-center justify-center text-5xl overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  {profile?.photoUrl ? (
                    <img src={`http://localhost:8080${profile.photoUrl}`} alt="Worker Photo" className="w-full h-full object-cover" />
                  ) : (
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Worker" alt="Avatar" />
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-extrabold text-white mb-2">{profile?.name || user?.name || "Professional"}</h2>
                  <p className="text-green-400 text-lg font-bold flex items-center gap-2">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    {profile?.rating?.toFixed(1) || "4.9"} / 5.0 Rating
                  </p>
                  <p className="text-slate-400 font-medium mt-1">{profile?.totalJobs || 0} Total Jobs Completed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <h3 className="font-bold text-white mb-6 text-lg">Verified Skills</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Master Plumber</h4>
                          <p className="text-xs text-slate-400">NCCT Certified</p>
                        </div>
                      </div>
                      <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">Verified</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Basic Electrician</h4>
                          <p className="text-xs text-slate-400">Peer Reviewed</p>
                        </div>
                      </div>
                      <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-500/30">Level 2</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Incoming Gig Modal - Centered Takeover */}
      {incomingGig && jobStatus === 'IDLE' && activeTab === 'JOBS' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-green-500/30 rounded-3xl w-full max-w-md p-8 text-center shadow-[0_0_60px_rgba(34,197,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-[pulse_1s_ease-in-out_infinite]"></div>
            
            <div className="inline-flex bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
              New Request
            </div>
            
            <h3 className="text-3xl font-extrabold mb-2 text-white">Plumbing Fix</h3>
            <p className="text-slate-400 font-medium mb-8">2.4 km away • Est: ₹450</p>
            
            <div className="text-6xl font-mono mb-10 text-white font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              00:{countdown.toString().padStart(2, '0')}
            </div>
            
            <div className="flex gap-4">
              <button className="flex-1 bg-slate-800 text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-700 transition-colors" onClick={() => setIncomingGig(false)}>
                Reject
              </button>
              <button className="flex-[2] bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-bold shadow-lg transition-colors" onClick={acceptGig}>
                Accept Job
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
