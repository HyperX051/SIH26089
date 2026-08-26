"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WorkerApp() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'JOBS' | 'BILLING' | 'WELFARE' | 'PROFILE'>('JOBS');
  
  const [profile, setProfile] = useState<any>(null);
  const [billing, setBilling] = useState<any[]>([]);
  
  // Job States
  const [radius, setRadius] = useState(10);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [jobStatus, setJobStatus] = useState<'IDLE' | 'ACCEPTED' | 'IN_PROGRESS' | 'VERIFYING' | 'COMPLETED'>('IDLE');
  
  // Job Execution States
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [otp, setOtp] = useState("");

  const { client, connected } = useStomp();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeJobDetails, setActiveJobDetails] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      router.push('/worker/login');
      return;
    }
  }, [token, router]);

  // Bulletin Board: Fetch Available Jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/bookings/available', { headers: { Authorization: `Bearer ${token}` }});
        setAvailableJobs(res.data.data || []);
      } catch (e) {
        console.error("Failed to fetch available jobs", e);
      }
    };
    if (activeTab === 'JOBS' && jobStatus === 'IDLE') {
      fetchJobs();
      const interval = setInterval(fetchJobs, 15000); // Poll every 15s to keep list fresh
      return () => clearInterval(interval);
    }
  }, [activeTab, jobStatus, token]);

  // Listen to Global /topic/jobs
  useEffect(() => {
    if (client && connected && jobStatus === 'IDLE') {
      const sub = client.subscribe(`/topic/jobs`, (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'NEW_JOB_AVAILABLE') {
          setAvailableJobs(prev => [data.payload, ...prev.filter(j => j.booking_id !== data.payload.booking_id)]);
        }
      });
      return () => sub.unsubscribe();
    }
  }, [client, connected, jobStatus]);

  // Listen to Active Booking Status
  useEffect(() => {
    if (client && connected && activeBookingId) {
      const sub = client.subscribe(`/topic/booking/${activeBookingId}`, (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'STATUS_CHANGED' && data.payload.status === 'CANCELLED') {
          alert("The customer has cancelled this booking.");
          resetJobState();
        }
      });
      return () => sub.unsubscribe();
    }
  }, [client, connected, activeBookingId]);

  useEffect(() => {
    const fetchWorkerData = async () => {
      try {
        const profRes = await api.get('/workers/profile', { headers: { Authorization: `Bearer ${token}` }});
        setProfile(profRes.data.data);
      } catch (err) { console.error(err); }
      
      try {
        const billRes = await api.get('/workers/billing', { headers: { Authorization: `Bearer ${token}` }});
        setBilling(billRes.data.data || []);
      } catch (err) { console.error(err); }
    };
    if (user?.id && token) {
      fetchWorkerData();
    }
  }, [user?.id, token]);

  const acceptGig = async (job: any) => {
    try {
      await api.post(`/bookings/${job.booking_id}/accept`, {}, { headers: { Authorization: `Bearer ${token}` }});
      setActiveBookingId(job.booking_id);
      setActiveJobDetails(job);
      setJobStatus('ACCEPTED');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Job is no longer available.");
      setAvailableJobs(prev => prev.filter(j => j.booking_id !== job.booking_id));
    }
  };

  const simulateOCR = async () => {
    try {
      const res = await api.post('/ai/ocr-receipt', { bookingId: activeBookingId, receiptImageUrl: 'mock_url' }, { headers: { Authorization: `Bearer ${token}` }});
      setOcrData(res.data.data);
    } catch (err) {
      console.error("OCR API failed:", err);
    }
  };

  const verifyOTP = async () => {
    try {
      await api.post(`/bookings/${activeBookingId}/verify-otp-complete`, { enteredOtp: otp }, { headers: { Authorization: `Bearer ${token}` }});
      setJobStatus('COMPLETED');
    } catch (err) {
      console.error("OTP API failed:", err);
      alert("Invalid OTP or server error");
    }
  };

  const resetJobState = () => {
    setJobStatus('IDLE');
    setActiveBookingId(null);
    setActiveJobDetails(null);
    setOtp("");
    setBeforeImage(null);
    setAfterImage(null);
    setReceiptImage(null);
    setOcrData(null);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex font-sans">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-zinc-50 border-r border-zinc-200 hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-zinc-200">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-zinc-900 uppercase">Worker</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'JOBS', label: 'Bulletin Board', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            { id: 'BILLING', label: 'Past Billing', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { id: 'WELFARE', label: 'Welfare & Benefits', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { id: 'PROFILE', label: 'Profile & Skills', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}></path></svg>
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-200">
          <div className="bg-white p-4 border border-zinc-200">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2">Status</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${jobStatus === 'IDLE' ? 'bg-green-500 animate-pulse' : 'bg-black'}`}></span>
              <span className="text-sm font-bold text-zinc-900">{jobStatus === 'IDLE' ? 'Available for Jobs' : 'On Active Job'}</span>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="w-full mt-4 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-900">Sign Out</button>
        </div>
      </aside>
      
      {/* 2. Main Dashboard Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-200 bg-white shrink-0">
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {activeTab === 'JOBS' ? 'Dispatch Radar' : activeTab === 'BILLING' ? 'Past Billing' : activeTab === 'WELFARE' ? 'Cooperative Welfare' : 'Professional Profile'}
          </h1>
          {jobStatus !== 'IDLE' && jobStatus !== 'COMPLETED' && (
            <button 
              onClick={async () => {
                try {
                  await api.post('/safety/sos', { bookingId: activeBookingId, latitude: 0, longitude: 0, telemetry: {} });
                  alert('SOS Alert Triggered! Authorities notified.');
                } catch (e) {
                  alert('Failed to trigger SOS');
                }
              }}
              className="border border-red-200 bg-red-50 text-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
            >
              Emergency SOS
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          
          {activeTab === 'JOBS' && (
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              
              {/* Left Panel: Available Gigs & Radar */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                
                {jobStatus === 'IDLE' && (
                  <>
                    <section className="bg-zinc-50 p-6 border border-zinc-200">
                      <h2 className="font-extrabold text-zinc-900 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        Radar Settings
                      </h2>
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold uppercase text-zinc-500 mb-2">
                          <span>Search Radius</span>
                          <span className="text-zinc-900">{radius} km</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" max="50" 
                          value={radius} 
                          onChange={(e) => setRadius(Number(e.target.value))}
                          className="w-full accent-black"
                        />
                      </div>
                      <div className="bg-white p-4 border border-zinc-200 text-center text-xs font-bold uppercase text-zinc-500 flex items-center justify-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        Listening for broadcasts...
                      </div>
                    </section>

                    <section className="flex-1 overflow-y-auto">
                      <h3 className="font-bold text-zinc-500 mb-4 uppercase tracking-wider text-xs">Available Jobs ({availableJobs.length})</h3>
                      <div className="space-y-4">
                        {availableJobs.length === 0 ? (
                          <div className="bg-zinc-50 p-8 border border-zinc-200 text-center text-zinc-500 text-sm font-medium">
                            No jobs currently available in your area.
                          </div>
                        ) : (
                          availableJobs.map((job, idx) => (
                            <div key={job.booking_id || idx} className="bg-white p-5 border border-zinc-200 hover:border-black transition-colors">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-zinc-900 text-lg">{job.service_type || 'Service'} Request</h4>
                                  <p className="text-sm text-zinc-500 mt-1">Est. Payout: <span className="text-black font-extrabold">₹{job.estimated_wage}</span></p>
                                </div>
                                <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                                  New
                                </span>
                              </div>
                              <div className="bg-zinc-50 p-3 mb-4 border border-zinc-100 text-xs text-zinc-700">
                                {job.custom_prompt_text || "No description provided."}
                              </div>
                              <button 
                                onClick={() => acceptGig(job)}
                                className="w-full bg-zinc-900 hover:bg-black text-white font-bold py-3 transition-colors text-sm uppercase tracking-wider"
                              >
                                Accept Job
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                )}

                {(jobStatus !== 'IDLE' && jobStatus !== 'COMPLETED') && (
                  <div className="bg-white p-6 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      </div>
                      <div>
                        <h2 className="font-extrabold text-zinc-900">{activeJobDetails?.service_type || 'Service'} Request</h2>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Accepted Job</p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 p-4 border border-zinc-200 mb-6">
                      <div className="flex justify-between text-sm mb-2"><span className="text-zinc-500">Distance</span><span className="text-zinc-900 font-bold">Calculating...</span></div>
                      <div className="flex justify-between text-sm"><span className="text-zinc-500">Est. Payout</span><span className="text-black font-extrabold">₹{activeJobDetails?.estimated_wage || '450'}</span></div>
                    </div>

                    {jobStatus === 'ACCEPTED' && (
                      <button onClick={() => setJobStatus('IN_PROGRESS')} className="w-full bg-black py-4 text-xs font-bold text-white uppercase tracking-wider transition-colors hover:bg-zinc-800">
                        Arrived & Start Job
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel: Execution Workflow */}
              <div className="w-full lg:w-2/3 bg-zinc-50 border border-zinc-200 p-8 flex flex-col relative overflow-hidden">
                
                {jobStatus === 'IDLE' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-zinc-400">
                      <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                      <p className="text-lg font-bold">Map View Active</p>
                      <p className="text-sm">Select a job from the Radar to begin.</p>
                    </div>
                  </div>
                )}

                {jobStatus === 'IN_PROGRESS' && (
                  <div className="max-w-2xl mx-auto w-full space-y-6 animate-in slide-in-from-bottom-4">
                    <h2 className="text-2xl font-extrabold text-zinc-900 mb-6">Job Execution Protocol</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="bg-white p-6 border border-zinc-200">
                        <h3 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider">1. AI Audit</h3>
                        <div className="space-y-3">
                          <button 
                            onClick={() => setBeforeImage("captured")}
                            className={`w-full py-4 border-2 border-dashed flex flex-col items-center justify-center font-bold text-sm transition-all ${beforeImage ? 'border-black bg-black text-white' : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50'}`}
                          >
                            {beforeImage ? "Before: Uploaded" : "Capture Before Photo"}
                          </button>
                          <button 
                            onClick={() => setAfterImage("captured")}
                            className={`w-full py-4 border-2 border-dashed flex flex-col items-center justify-center font-bold text-sm transition-all ${afterImage ? 'border-black bg-black text-white' : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50'}`}
                          >
                            {afterImage ? "After: Uploaded" : "Capture After Photo"}
                          </button>
                        </div>
                      </section>

                      <section className="bg-white p-6 border border-zinc-200 flex flex-col">
                        <h3 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wider">2. Hardware Receipt</h3>
                        <div className="flex-1 flex flex-col justify-center">
                          {!receiptImage ? (
                            <button onClick={() => { setReceiptImage("uploaded"); simulateOCR(); }} className="w-full py-8 bg-zinc-50 flex flex-col items-center justify-center text-zinc-900 font-bold border border-zinc-200 hover:border-black transition-colors">
                              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                              Scan Bill via OCR
                            </button>
                          ) : (
                            <div className="bg-zinc-50 h-full p-4 border border-zinc-200 text-sm">
                              {ocrData ? (
                                <div className="h-full flex flex-col justify-between">
                                  <div>
                                    <div className="flex justify-between text-zinc-500 text-xs mb-3 uppercase tracking-wider"><span>Item</span><span>Price</span></div>
                                    {ocrData.items?.map((i: any, idx: number) => (
                                      <div key={idx} className="flex justify-between font-mono text-zinc-900 mb-1"><span>{i.name}</span><span>₹{i.price}</span></div>
                                    ))}
                                  </div>
                                  <div className="border-t border-zinc-200 pt-3 flex justify-between font-bold text-zinc-900">
                                    <span>Total Added</span><span>₹{ocrData.total}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-bold uppercase tracking-wider animate-pulse">Running AI OCR...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>

                    <section className="bg-white p-6 border border-zinc-200">
                      <div className="mb-4">
                        <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-wider">3. Mutual Closure</h3>
                        <p className="text-xs text-zinc-500 font-medium">Ask the customer for their 6-digit closure OTP.</p>
                      </div>
                      <div className="flex gap-4">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="0 0 0 0 0 0"
                          className="flex-1 bg-zinc-50 border border-zinc-200 px-6 py-4 text-center tracking-[0.5em] font-mono text-2xl text-zinc-900 focus:border-black focus:outline-none transition-colors"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                        />
                        <button 
                          onClick={verifyOTP}
                          disabled={otp.length !== 6 || !beforeImage || !afterImage}
                          className="px-8 bg-black disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold transition-all text-sm uppercase tracking-wider hover:bg-zinc-800"
                        >
                          Verify & Close
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {jobStatus === 'COMPLETED' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10 p-4">
                    <div className="bg-white border-2 border-black p-10 text-center max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] animate-in zoom-in-95">
                      <h2 className="text-3xl font-extrabold text-zinc-900 mb-2">Job Completed!</h2>
                      <p className="text-zinc-500 text-sm mb-8 font-medium">Funds have been added to your escrow.</p>
                      
                      <div className="bg-zinc-50 p-6 text-sm text-zinc-700 font-mono text-left mb-8 border border-zinc-200">
                        <div className="flex justify-between mb-3"><span>Base Wage:</span><span className="font-bold text-black">₹{activeJobDetails?.estimated_wage || '450.00'}</span></div>
                        <div className="flex justify-between mb-4 text-zinc-500"><span>Welfare Deduction:</span><span>-₹22.50</span></div>
                        <div className="border-t border-zinc-200 pt-4 flex justify-between font-extrabold text-lg text-black"><span>Net Settlement:</span><span>₹{(parseFloat(activeJobDetails?.estimated_wage || '450') - 22.50).toFixed(2)}</span></div>
                      </div>
                      
                      <button 
                        onClick={resetJobState} 
                        className="w-full bg-black py-4 font-bold text-white uppercase tracking-wider transition-colors hover:bg-zinc-800"
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
            <div className="max-w-4xl">
              <h2 className="text-3xl font-extrabold text-zinc-900 mb-8">Past Billing</h2>
              {billing.length === 0 ? (
                <div className="bg-zinc-50 border border-zinc-200 py-16 text-center">
                  <p className="text-zinc-500 text-sm font-medium">No past bookings found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billing.map((b: any) => (
                    <div key={b.id} className="bg-white p-6 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-black transition-colors">
                      <div>
                        <h3 className="font-bold text-zinc-900 text-lg">{b.serviceType}</h3>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-1">Completed: {new Date(b.completedAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-zinc-900">₹{b.totalEarnings}</p>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Base: ₹{b.baseWage} | Mat: ₹{b.materialCost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'WELFARE' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-extrabold text-zinc-900 mb-8">Welfare & Insurance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black text-white p-8 border border-zinc-800 shadow-[8px_8px_0px_rgba(228,228,231,1)]">
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Cooperative Health Insurance</p>
                  <h3 className="text-4xl font-extrabold mb-4">Active</h3>
                  <p className="text-lg text-zinc-300 font-medium">Cover: ₹2,00,000</p>
                  <p className="text-sm text-zinc-500 mt-2">Valid until: Dec 2026</p>
                  <button className="mt-8 bg-white text-black font-bold text-xs uppercase tracking-wider py-3 px-6 hover:bg-zinc-200 transition-colors">
                    View Policy Card
                  </button>
                </div>
                <div className="grid grid-rows-2 gap-6">
                  <div className="bg-white p-6 border border-zinc-200 flex flex-col justify-center shadow-[4px_4px_0px_rgba(228,228,231,1)]">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Provident Fund (Matched)</p>
                    <h3 className="text-3xl font-extrabold text-zinc-900">₹14,500<span className="text-lg text-zinc-400">.00</span></h3>
                  </div>
                  <div className="bg-white p-6 border border-zinc-200 flex flex-col justify-center shadow-[4px_4px_0px_rgba(228,228,231,1)]">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Platform Dividend Share</p>
                    <h3 className="text-3xl font-extrabold text-zinc-900">₹1,250<span className="text-lg text-zinc-400">.00</span></h3>
                    <p className="text-xs font-medium text-zinc-500 mt-1">To be credited Q4 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-4xl">
              <div className="flex items-center gap-8 mb-10 pb-10 border-b border-zinc-200">
                <div className="w-32 h-32 bg-zinc-100 border border-zinc-200 flex items-center justify-center text-5xl overflow-hidden shadow-[8px_8px_0px_rgba(228,228,231,1)]">
                  {profile?.photoUrl ? (
                    <img src={`http://localhost:8080${profile.photoUrl}`} alt="Worker Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-extrabold text-zinc-900">{user?.name?.[0] || 'W'}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-extrabold text-zinc-900 mb-2">{profile?.name || user?.name || "Professional"}</h2>
                  <p className="text-zinc-900 text-lg font-bold flex items-center gap-2">
                    ★ {profile?.rating?.toFixed(1) || "4.9"} / 5.0 Rating
                  </p>
                  <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider mt-2">{profile?.totalJobs || 0} Total Jobs Completed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-8 border border-zinc-200 shadow-[4px_4px_0px_rgba(228,228,231,1)]">
                  <h3 className="font-extrabold text-zinc-900 mb-6 text-xl">Verified Credentials</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">Identity Verified</h4>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Aadhar / KYC</p>
                        </div>
                      </div>
                      <span className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">Verified</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900">Trade Certified</h4>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">ITI / NSQF</p>
                        </div>
                      </div>
                      <span className="bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">Verified</span>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-zinc-200">
                    <button className="w-full border-2 border-dashed border-zinc-300 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 hover:border-black font-bold text-xs uppercase tracking-wider py-4 transition-all">
                      + Upload New Credential / License
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
