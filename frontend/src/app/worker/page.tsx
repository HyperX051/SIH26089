"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { QRCodeCanvas } from 'qrcode.react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function WorkerDashboard() {
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'JOBS' | 'ACTIVE_JOB' | 'BILLING' | 'WELFARE' | 'PROFILE'>('JOBS');
  
  const [profile, setProfile] = useState<any>(null);
  const [billing, setBilling] = useState<any[]>([]);
  
  // Job States
  const [radius, setRadius] = useState(10);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [jobStatus, setJobStatus] = useState<'IDLE' | 'ACCEPTED' | 'IN_PROGRESS' | 'VERIFYING' | 'PAYMENT_PENDING' | 'PAYMENT_CLAIMED' | 'COMPLETED'>('IDLE');
  
  // Job Execution States
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [uploadingCredential, setUploadingCredential] = useState(false);
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

  const { client, connected } = useStomp();
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeJobDetails, setActiveJobDetails] = useState<any>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token) {
      router.push('/worker/login');
      return;
    }
    
    const fetchActiveJob = async () => {
      try {
        const res = await api.get('/bookings/worker/active', { headers: { Authorization: `Bearer ${token}` }});
        if (res.data.data && res.data.data.length > 0) {
          const activeJob = res.data.data[0];
          setJobStatus(activeJob.status);
          setActiveBookingId(activeJob.booking_id || activeJob.id);
          setActiveJobDetails(activeJob);
        } else {
          setJobStatus('IDLE');
          setActiveBookingId(null);
          setActiveJobDetails(null);
        }
      } catch (err) {
        console.error("Failed to fetch active jobs:", err);
      }
    };

    fetchActiveJob();
  }, [token, router]);

  // Persist job state changes
  useEffect(() => {
    if (jobStatus !== 'IDLE' && activeBookingId && activeJobDetails) {
      localStorage.setItem('worker_jobStatus', jobStatus);
      localStorage.setItem('worker_activeBookingId', activeBookingId);
      localStorage.setItem('worker_activeJobDetails', JSON.stringify(activeJobDetails));
    } else {
      localStorage.removeItem('worker_jobStatus');
      localStorage.removeItem('worker_activeBookingId');
      localStorage.removeItem('worker_activeJobDetails');
    }
  }, [jobStatus, activeBookingId, activeJobDetails]);

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
        } else if (data.event === 'STATUS_CHANGED' && data.payload.status === 'PAYMENT_CLAIMED') {
          setJobStatus('PAYMENT_CLAIMED');
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
        if (billRes.data.data && billRes.data.data.length > 0) {
          setBilling(billRes.data.data);
        } else {
          throw new Error("Empty data");
        }
      } catch (err) {
        console.error(err);
        setBilling([]);
      }
    };
    if (user?.id && token) {
      fetchWorkerData();
    }
  }, [user?.id, token]);

  // Sync radius from profile when loaded
  useEffect(() => {
    if (profile?.serviceRadiusKm) {
      setRadius(Number(profile.serviceRadiusKm));
    }
  }, [profile?.serviceRadiusKm]);

  const acceptGig = async (job: any) => {
    if (acceptingJobId) return; // Prevent double clicks
    setAcceptingJobId(job.booking_id);
    try {
      await api.post(`/bookings/${job.booking_id}/accept`, {}, { headers: { Authorization: `Bearer ${token}` }});
      setActiveBookingId(job.booking_id);
      setActiveJobDetails(job);
      setJobStatus('ACCEPTED');
      setActiveTab('ACTIVE_JOB');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error?.message || "Job is no longer available.");
      // Only remove if it was actually no longer available, not if the worker was just offline
      if (err.response?.data?.error?.message !== "You must be online to accept jobs") {
        setAvailableJobs(prev => prev.filter(j => j.booking_id !== job.booking_id));
      }
    } finally {
      setAcceptingJobId(null);
    }
  };

  const simulateOCR = async (file: File) => {
    try {
      const url = await uploadFile(file);
      setReceiptImage(url as any);
      const res = await api.post('/ai/ocr-receipt', { bookingId: activeBookingId, receiptImageUrl: url }, { headers: { Authorization: `Bearer ${token}` }});
      setOcrData(res.data.data);
    } catch (err) {
      console.error("OCR API failed:", err);
      alert("Failed to process receipt.");
    }
  };

  const handleBeforeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const url = await uploadFile(e.target.files[0]);
      setBeforeImage(url);
    } catch (err) { alert('Upload failed'); }
  };

  const handleAfterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const url = await uploadFile(e.target.files[0]);
      setAfterImage(url);
      const res = await api.post('/ai/verify-repair', { bookingId: activeBookingId, beforeImageUrl: beforeImage, afterImageUrl: url }, { headers: { Authorization: `Bearer ${token}` }});
      const data = res.data.data;
      alert(`AI Audit Complete:\nVerified: ${data.verified}\nConfidence: ${data.confidence_score}\nNotes: ${data.notes}`);
    } catch (err) { alert('Upload failed'); }
  };

  const verifyOTP = async () => {
    try {
      const res = await api.post(`/bookings/${activeBookingId}/verify-otp-complete`, { enteredOtp: otp }, { headers: { Authorization: `Bearer ${token}` }});
      setJobStatus('PAYMENT_PENDING');
      if (res.data?.data?.payment_uri) {
        setActiveJobDetails((prev: any) => ({ ...prev, payment_uri: res.data.data.payment_uri }));
      }
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
    setActiveTab('JOBS');
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/files/upload', formData, { 
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
    });
    return res.data.data.url;
  };

  const handleCredentialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!user?.id) return;
    
    setUploadingCredential(true);
    try {
      const url = await uploadFile(e.target.files[0]);
      const res = await api.post('/workers/profile/submit-kyc', {
        certificateImageUrl: url
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setProfile((prev: any) => ({ ...prev, approval_status: 'PENDING', iti_certified: false }));
      alert(`Document submitted successfully for manual Admin review!`);
    } catch (err) {
      console.error(err);
      alert("Failed to submit credential. Please try again.");
    } finally {
      setUploadingCredential(false);
      e.target.value = '';
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const newStatus = !profile.isAvailable;
    try {
      await api.patch('/workers/profile/availability', { is_available: newStatus }, { headers: { Authorization: `Bearer ${token}` }});
      setProfile({ ...profile, isAvailable: newStatus });
    } catch (err) {
      console.error("Failed to toggle availability", err);
    }
  };

  const updateLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode to get human-readable address
        let addressLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) {
            // Show a shorter version: suburb + city
            const a = data.address;
            const parts = [a?.suburb || a?.neighbourhood, a?.city || a?.town || a?.village].filter(Boolean);
            addressLabel = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 2).join(',').trim();
          }
        } catch {}
        try {
          await api.patch('/workers/profile/details', { latitude, longitude }, { headers: { Authorization: `Bearer ${token}` }});
          setProfile((prev: any) => ({ ...prev, latitude, longitude, locationAddress: addressLabel }));
          alert(`Location updated: ${addressLabel}`);
        } catch (err) {
          console.error('Failed to update location', err);
          alert('Failed to update location on the server.');
        }
      },
      (err) => {
        console.error('Geolocation error', err);
        alert('Failed to get your location. Please check your browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updateServiceRadius = async (newRadius: number) => {
    setRadius(newRadius);
    try {
      await api.patch('/workers/profile/radius', { service_radius_km: newRadius }, { headers: { Authorization: `Bearer ${token}` }});
    } catch (err) {
      console.error('Failed to update radius', err);
    }
  };

  return (
    <div className="min-h-screen bg-card flex font-sans text-foreground selection:bg-black selection:text-white">
      
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 bg-background border-r border-border hidden md:flex flex-col shrink-0 relative z-50">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/worker" className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 flex items-center justify-center bg-background rounded text-foreground font-black tracking-tighter text-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] border border-border">
            FN
          </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground uppercase">Worker</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'JOBS', label: 'Bulletin Board', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            { id: 'ACTIVE_JOB', label: 'Active Job', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { id: 'BILLING', label: 'Past Jobs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { id: 'WELFARE', label: 'Welfare & Benefits', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            { id: 'PROFILE', label: 'Profile & Skills', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-zinc-900 text-white' : 'text-muted-foreground hover:bg-zinc-200 hover:text-foreground'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}></path></svg>
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="bg-card p-4 border border-border">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Status</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${jobStatus === 'IDLE' ? 'bg-green-500 animate-pulse' : 'bg-primary text-primary-foreground'}`}></span>
              <span className="text-sm font-bold text-foreground">{jobStatus === 'IDLE' ? 'Available for Jobs' : 'On Active Job'}</span>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="w-full mt-4 text-xs font-bold text-muted-foreground uppercase hover:text-foreground">Sign Out</button>
        </div>
      </aside>
      
      {/* 2. Main Dashboard Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-card">
        <header className="h-16 flex items-center justify-between px-8 border-b border-border bg-card shrink-0">
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            {activeTab === 'JOBS' ? 'Dispatch Radar' : activeTab === 'ACTIVE_JOB' ? 'Execution Workflow' : activeTab === 'BILLING' ? 'Past Jobs' : activeTab === 'WELFARE' ? 'Cooperative Welfare' : 'Professional Profile'}
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
            <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-full">
              
              {/* Left Panel: Available Gigs & Radar */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                {(!profile?.aadhaar_verified && !profile?.iti_certified) ? (
                  <div className="bg-red-50 p-6 border border-red-200 rounded-3xl shadow-sm flex flex-col gap-4 relative z-10">
                    <h2 className="font-extrabold text-red-600 text-lg flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      Verification Required
                    </h2>
                    <p className="text-red-800 text-sm font-medium">
                      You must upload your identity credentials and receive at least one verified badge before you can view and accept jobs.
                    </p>
                    <button 
                      onClick={() => setActiveTab('PROFILE')} 
                      type="button"
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                      className="bg-red-600 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-xs shadow-sm hover:bg-red-700 transition-colors mt-2 active:scale-95"
                    >
                      Verify Profile Now
                    </button>
                  </div>
                ) : (
                  <>
                    <section className="bg-background p-6 border border-border rounded-3xl shadow-sm">
                      <h2 className="font-extrabold text-foreground mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        Radar Settings
                      </h2>
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground mb-2">
                          <span>Search Radius</span>
                          <span className="text-foreground">{radius} km</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" max="50" 
                          value={radius} 
                          onChange={(e) => setRadius(Number(e.target.value))}
                          onMouseUp={(e) => updateServiceRadius(Number((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => updateServiceRadius(Number((e.target as HTMLInputElement).value))}
                          className="w-full accent-black"
                        />
                      </div>
                      <div className="bg-card p-4 border border-border rounded-xl text-center text-xs font-bold uppercase text-muted-foreground flex items-center justify-center gap-3 shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                        Listening for broadcasts...
                      </div>
                    </section>

                    <section className="flex-1 overflow-y-auto">
                      <h3 className="font-bold text-muted-foreground mb-4 uppercase tracking-wider text-xs">Available Jobs</h3>
                      
                      {(!profile?.iti_certified || !profile?.upi_id) ? (
                        <div className="bg-card p-8 border border-border shadow-sm text-center">
                          <h2 className="text-2xl font-extrabold text-foreground mb-4">Verification Required</h2>
                          <p className="text-muted-foreground text-sm font-medium mb-6">
                            Your profile is incomplete. Please update your UPI ID and verify your trade credentials to start receiving jobs.
                          </p>
                          <button 
                            onClick={() => setActiveTab('PROFILE')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-xl uppercase tracking-wider text-xs transition-colors shadow-sm"
                          >
                            Go to Profile
                          </button>
                        </div>
                      ) : (
                      <div className="space-y-4">
                        {(() => {
                          const wLat = profile?.latitude || 12.9716;
                          const wLng = profile?.longitude || 77.5946;
                          const filteredJobs = availableJobs.filter(job => {
                            if (job.address_text === 'IVR_REQUEST') return true;
                            if (!job.latitude || !job.longitude) return true;
                            const dist = haversineKm(wLat, wLng, job.latitude, job.longitude);
                            return dist <= radius;
                          });

                          if (filteredJobs.length === 0) {
                            return (
                              <div className="bg-background p-8 border border-border rounded-2xl text-center text-muted-foreground text-sm font-medium">
                                No jobs currently available in your area.
                              </div>
                            );
                          }

                          return filteredJobs.map((job, idx) => (
                            <div key={job.booking_id || idx} className="bg-card p-5 border border-border rounded-2xl hover:border-border transition-colors shadow-sm hover:shadow-md">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-foreground text-lg">{job.service_type || 'Service'} Request</h4>
                                  <p className="text-sm text-muted-foreground mt-1">Est. Payout: <span className="text-black font-extrabold">₹{job.estimated_wage}</span></p>
                                </div>
                                {job.address_text === 'IVR_REQUEST' ? (
                                  <span className="bg-primary text-primary-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded shadow-sm">
                                    IVR Booking 📞
                                  </span>
                                ) : (
                                  <span className="bg-primary text-primary-foreground text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                                    New
                                  </span>
                                )}
                              </div>
                              {job.address_text !== 'IVR_REQUEST' && (
                                <div className="bg-background p-3 mb-4 border border-zinc-100 rounded-lg text-xs text-zinc-700">
                                  {job.custom_prompt_text || "No description provided."}
                                </div>
                              )}
                              {job.address_text === 'IVR_REQUEST' && (
                                <div className="bg-card p-3 mb-4 border border-border rounded-lg flex flex-col gap-2 shadow-sm">
                                  <div className="text-sm text-foreground">
                                    <span className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Pincode: </span>
                                    <span className="font-black">{job.pincode}</span>
                                  </div>
                                  {job.customer_phone && (
                                    <a href={`tel:${job.customer_phone}`} className="bg-primary hover:bg-primary/90 text-primary-foreground text-center font-bold text-xs uppercase tracking-wider py-2 rounded-lg transition-colors">
                                      Call Customer: {job.customer_phone}
                                    </a>
                                  )}
                                </div>
                              )}
                              <button 
                                onClick={() => acceptGig(job)}
                                disabled={acceptingJobId === job.booking_id || jobStatus !== 'IDLE'}
                                className={`w-full font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-wider shadow-sm ${acceptingJobId === job.booking_id || jobStatus !== 'IDLE' ? 'bg-zinc-200 text-muted-foreground cursor-not-allowed' : 'bg-zinc-900 hover:bg-primary text-primary-foreground text-white'}`}
                              >
                                {acceptingJobId === job.booking_id ? 'Accepting...' : jobStatus !== 'IDLE' ? 'Finish Active Job First' : 'Accept Job'}
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                      )}
                    </section>
                  </>
                )}
              </div>

              {/* Right Panel: Map */}
              <div className="hidden lg:block w-2/3 bg-background border border-border rounded-3xl relative z-0 overflow-hidden shadow-sm">
                <MapPicker 
                  initialPosition={{ lat: profile?.latitude || 12.9716, lng: profile?.longitude || 77.5946 }}
                  onLocationSelect={() => {}}
                  readOnly
                  radius={radius}
                  jobs={(!profile?.aadhaar_verified && !profile?.iti_certified) ? [] : availableJobs}
                />
              </div>
            </div>
          )}

          {activeTab === 'ACTIVE_JOB' && (
            <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-[calc(100vh-160px)]">
              
              {!activeBookingId ? (
                <div className="w-full flex items-center justify-center bg-card border border-border rounded-3xl p-8 shadow-sm">
                  <div className="text-center">
                    <h2 className="text-2xl font-extrabold text-foreground mb-4">No Active Job</h2>
                    <p className="text-muted-foreground text-sm font-medium mb-6">You don't have any ongoing jobs at the moment.</p>
                    <button 
                      onClick={() => setActiveTab('JOBS')}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-xl uppercase tracking-wider text-xs transition-colors shadow-sm"
                    >
                      Find Jobs on Bulletin Board
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    {(jobStatus !== 'IDLE' && jobStatus !== 'COMPLETED') && (
                      <div className="bg-card p-6 border border-border rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-primary text-primary-foreground text-white flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          </div>
                          <div>
                            <h2 className="font-extrabold text-foreground">{activeJobDetails?.service_type || 'Service'} Request</h2>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Accepted Job</p>
                          </div>
                        </div>
                        
                        <div className="bg-background p-4 border border-border rounded-xl mb-6 shadow-sm">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Location</span>
                            <span className="text-foreground font-bold">
                              {activeJobDetails?.address_text === 'IVR_REQUEST' ? 
                                `Pincode: ${activeJobDetails.pincode}` 
                                : activeJobDetails?.latitude ? 
                                `${haversineKm(profile?.latitude || 12.9716, profile?.longitude || 77.5946, activeJobDetails.latitude, activeJobDetails.longitude).toFixed(1)} km away` 
                                : 'Unknown'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Est. Payout</span><span className="text-black font-extrabold">₹{activeJobDetails?.estimated_wage || '450'}</span></div>
                        </div>

                        {activeJobDetails?.address_text === 'IVR_REQUEST' && activeJobDetails.customer_phone && (
                          <div className="mb-6">
                            <a href={`tel:${activeJobDetails.customer_phone}`} className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 text-xs uppercase tracking-wider rounded-xl transition-colors shadow-sm">
                              Call Customer: {activeJobDetails.customer_phone}
                            </a>
                          </div>
                        )}

                        {jobStatus === 'ACCEPTED' && (
                          <button onClick={() => setJobStatus('IN_PROGRESS')} className="w-full bg-primary text-primary-foreground py-4 text-xs font-bold text-white uppercase tracking-wider transition-colors rounded-xl shadow-md hover:bg-zinc-800">
                            Arrived & Start Job
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-full lg:w-2/3 bg-background border border-border rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-sm">
                    {jobStatus === 'ACCEPTED' && (
                      <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl">
                        <div className="absolute top-4 right-4 z-10">
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&origin=${profile?.latitude || 12.9716},${profile?.longitude || 77.5946}&destination=${activeJobDetails?.latitude || 12.9716},${activeJobDetails?.longitude || 77.5946}`} 
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white hover:bg-zinc-100 text-black px-4 py-2 rounded-xl shadow-lg border border-border font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            Open in Google Maps
                          </a>
                        </div>
                        <MapPicker 
                          initialPosition={{ 
                            lat: profile?.latitude || 12.9716, 
                            lng: profile?.longitude || 77.5946 
                          }} 
                          destinationPosition={{
                            lat: activeJobDetails?.latitude || 12.9716, 
                            lng: activeJobDetails?.longitude || 77.5946 
                          }}
                          onLocationSelect={() => {}}
                        />
                      </div>
                    )}

                    {jobStatus === 'IN_PROGRESS' && (
                      <div className="max-w-2xl mx-auto w-full space-y-6 animate-in slide-in-from-bottom-4">
                        <h2 className="text-2xl font-extrabold text-foreground mb-6">Job Execution Protocol</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <section className="bg-card p-6 border border-border">
                            <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">1. AI Audit</h3>
                            <div className="space-y-3">
                              <label className={`w-full py-4 border border-dashed flex flex-col items-center justify-center font-bold text-sm transition-all cursor-pointer ${beforeImage ? 'border-border bg-primary text-primary-foreground text-white' : 'border-zinc-300 text-muted-foreground hover:bg-background'}`}>
                                {beforeImage ? "Before: Uploaded" : "Upload Before Photo"}
                                <input type="file" className="hidden" onChange={handleBeforeImage} accept="image/*" />
                              </label>
                              <label className={`w-full py-4 border border-dashed flex flex-col items-center justify-center font-bold text-sm transition-all cursor-pointer ${afterImage ? 'border-border bg-primary text-primary-foreground text-white' : 'border-zinc-300 text-muted-foreground hover:bg-background'}`}>
                                {afterImage ? "After: Uploaded" : "Upload After Photo"}
                                <input type="file" className="hidden" onChange={handleAfterImage} accept="image/*" disabled={!beforeImage} />
                              </label>
                            </div>
                          </section>

                          <section className="bg-card p-6 border border-border flex flex-col">
                            <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider">2. Hardware Receipt</h3>
                            <div className="flex-1 flex flex-col justify-center">
                              {!receiptImage ? (
                                <label className="w-full py-8 bg-background flex flex-col items-center justify-center text-foreground font-bold border border-border hover:border-border transition-colors cursor-pointer">
                                  <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                  Scan Bill via OCR
                                  <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) simulateOCR(e.target.files[0]); }} accept="image/*" />
                                </label>
                              ) : (
                                <div className="bg-background h-full p-4 border border-border text-sm">
                                  {ocrData ? (
                                    <div className="h-full flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between text-muted-foreground text-xs mb-3 uppercase tracking-wider"><span>Item</span><span>Price</span></div>
                                        {ocrData.items?.map((i: any, idx: number) => (
                                          <div key={idx} className="flex justify-between font-mono text-foreground mb-1"><span>{i.name}</span><span>₹{i.price}</span></div>
                                        ))}
                                      </div>
                                      <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground">
                                        <span>Total Added</span><span>₹{ocrData.total}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-wider animate-pulse">Running AI OCR...</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </section>
                        </div>

                        <section className="bg-card p-6 border border-border">
                          <div className="mb-4">
                            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">3. Mutual Closure</h3>
                            <p className="text-xs text-muted-foreground font-medium">Ask the customer for their 6-digit closure OTP.</p>
                          </div>
                          <div className="flex gap-4">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="0 0 0 0 0 0"
                              className="flex-1 bg-background border border-border px-6 py-4 text-center tracking-[0.5em] font-mono text-2xl text-foreground focus:border-border focus:outline-none transition-colors"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                            />
                            <button 
                              onClick={verifyOTP}
                              disabled={otp.length !== 6 || !beforeImage || !afterImage}
                              className="px-8 bg-primary text-primary-foreground disabled:bg-zinc-200 disabled:text-muted-foreground/70 text-white font-bold transition-all text-sm uppercase tracking-wider hover:bg-zinc-800"
                            >
                              Verify & Close
                            </button>
                          </div>
                        </section>
                      </div>
                    )}

                    {jobStatus === 'PAYMENT_PENDING' && (
                      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4">
                        <div className="bg-card border border-border p-10 text-center max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,0.15)] animate-in zoom-in-95">
                          <h2 className="text-3xl font-extrabold text-foreground mb-2">Awaiting Payment</h2>
                          <p className="text-muted-foreground text-sm mb-6 font-medium">Please show this QR code to the customer to receive exact payment.</p>
                          
                          {activeJobDetails?.payment_uri && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 inline-block mb-6">
                              <QRCodeCanvas value={activeJobDetails.payment_uri} size={200} level={"H"} />
                            </div>
                          )}

                          <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-wider animate-pulse">Waiting for Customer...</div>
                        </div>
                      </div>
                    )}

                    {jobStatus === 'PAYMENT_CLAIMED' && (
                      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4">
                        <div className="bg-card border border-border p-10 text-center max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,0.15)] animate-in zoom-in-95">
                          <h2 className="text-3xl font-extrabold text-foreground mb-2">Payment Claimed</h2>
                          <p className="text-muted-foreground text-sm mb-8 font-medium">Did you receive ₹{activeJobDetails?.pricing?.total_amount || activeJobDetails?.estimated_wage || '0.00'}?</p>
                          <button 
                            onClick={async () => {
                              try {
                                await api.post(`/bookings/${activeBookingId}/worker-confirm-payment`, {}, { headers: { Authorization: `Bearer ${token}` }});
                                setJobStatus('COMPLETED');
                              } catch (err) { alert('Failed to confirm payment'); }
                            }} 
                            className="w-full bg-zinc-900 text-white py-4 font-bold uppercase tracking-wider transition-colors hover:bg-black rounded-xl"
                          >
                            Confirm Receipt
                          </button>
                        </div>
                      </div>
                    )}

                    {jobStatus === 'COMPLETED' && (
                      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4">
                        <div className="bg-card border border-border p-10 text-center max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,0.15)] animate-in zoom-in-95">
                          <h2 className="text-3xl font-extrabold text-foreground mb-2">Job Completed!</h2>
                          <p className="text-muted-foreground text-sm mb-8 font-medium">Funds have been added to your escrow.</p>
                          
                          <div className="bg-background p-6 text-sm text-zinc-700 font-mono text-left mb-8 border border-border">
                            <div className="flex justify-between mb-3"><span>Base Wage:</span><span className="font-bold text-black">₹{activeJobDetails?.estimated_wage || '450.00'}</span></div>
                            <div className="flex justify-between mb-4 text-muted-foreground"><span>Welfare Deduction:</span><span>-₹22.50</span></div>
                            <div className="border-t border-border pt-4 flex justify-between font-extrabold text-lg text-black"><span>Net Settlement:</span><span>₹{(parseFloat(activeJobDetails?.estimated_wage || '450') - 22.50).toFixed(2)}</span></div>
                          </div>
                          
                          <button 
                            onClick={resetJobState} 
                            className="w-full bg-primary text-primary-foreground py-4 font-bold text-white uppercase tracking-wider transition-colors hover:bg-zinc-800"
                          >
                            Return to Radar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'BILLING' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-extrabold text-foreground mb-8">Past Jobs</h2>
              {billing.length === 0 ? (
                <div className="bg-background border border-border py-16 text-center">
                  <p className="text-muted-foreground text-sm font-medium">No past bookings found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billing.map((b: any) => (
                    <div key={b.id} className="bg-card p-6 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border transition-colors">
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{b.serviceType}</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Completed: {new Date(b.completedAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-foreground">₹{b.totalEarnings}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Base: ₹{b.baseWage} | Mat: ₹{b.materialCost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'WELFARE' && (
            <div className="max-w-4xl">
              <h2 className="text-3xl font-extrabold text-foreground mb-8">Welfare & Insurance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-8 border border-primary/30 shadow-sm rounded-2xl relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 bg-primary/10 w-24 h-24 rounded-full blur-xl"></div>
                  <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">Cooperative Health Insurance</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                    <h3 className="text-4xl font-extrabold text-foreground">Active</h3>
                  </div>
                  <p className="text-lg text-foreground font-medium">Cover: ₹2,00,000</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-8">Valid until: Dec 2026</p>
                  <button className="bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl hover:bg-primary/20 transition-colors w-max">
                    View Policy Card
                  </button>
                </div>
                <div className="grid grid-rows-2 gap-6">
                  <div className="bg-card p-6 border border-border flex flex-col justify-center shadow-sm rounded-2xl">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">Provident Fund (Matched)</p>
                    <h3 className="text-3xl font-extrabold text-foreground">₹14,500<span className="text-lg text-muted-foreground/70">.00</span></h3>
                  </div>
                  <div className="bg-card p-6 border border-border flex flex-col justify-center shadow-sm rounded-2xl">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">Platform Dividend Share</p>
                    <h3 className="text-3xl font-extrabold text-foreground">₹1,250<span className="text-lg text-muted-foreground/70">.00</span></h3>
                    <p className="text-xs font-medium text-muted-foreground mt-1">To be credited Q4 2026</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-4xl">
              <LanguageSwitcher />
              
              <div className="flex items-center justify-between mb-10 pb-10 border-b border-border">
                <div className="flex items-center gap-8">
                  <div className="w-32 h-32 bg-muted border border-border flex items-center justify-center text-5xl overflow-hidden shadow-sm rounded-2xl">
                    {profile?.photoUrl ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8080'}${profile.photoUrl}`} alt="Worker Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-extrabold text-foreground">{user?.name?.[0] || 'W'}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-4xl font-extrabold text-foreground mb-2">{profile?.name || user?.name || "Professional"}</h2>
                    <p className="text-foreground text-lg font-bold flex items-center gap-2">
                      ★ {profile?.rating?.toFixed(1) || "4.9"} / 5.0 Rating
                    </p>
                    <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider mt-2">{profile?.totalJobs || 0} Total Jobs Completed</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Duty Status</p>
                  <button 
                    onClick={toggleAvailability}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${profile?.isAvailable ? 'bg-green-500' : 'bg-zinc-300'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${profile?.isAvailable ? 'translate-x-9' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-sm font-bold uppercase tracking-wider ${profile?.isAvailable ? 'text-green-600' : 'text-zinc-500'}`}>
                    {profile?.isAvailable ? 'Online / Active' : 'Offline / Inactive'}
                  </span>
                </div>
              </div>

              {/* Location & Radius Section */}
              <div className="bg-card border border-border shadow-sm rounded-2xl mb-10 overflow-hidden">
                {/* GPS Row */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 border-b border-border">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-lg font-extrabold text-foreground mb-1">Current GPS Location</h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      {profile?.locationAddress
                        ? profile.locationAddress
                        : profile?.latitude && profile?.longitude
                        ? `${Number(profile.latitude).toFixed(5)}°N, ${Number(profile.longitude).toFixed(5)}°E`
                        : 'Location not set — update GPS to receive nearby jobs.'}
                    </p>
                    {profile?.latitude && profile?.longitude && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {Number(profile.latitude).toFixed(6)}, {Number(profile.longitude).toFixed(6)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={updateLocation}
                    className="flex items-center gap-2 bg-foreground text-background font-bold px-6 py-3 rounded-xl text-sm transition-colors hover:bg-foreground/90 shadow-sm whitespace-nowrap"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Update GPS
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-card p-8 border border-border shadow-sm rounded-2xl">
                  <h3 className="font-extrabold text-foreground mb-6 text-xl">Verified Credentials</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-background p-4 border border-border">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center ${profile?.aadhaar_verified ? 'bg-primary text-primary-foreground text-white' : 'bg-zinc-200 text-muted-foreground'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">Identity Verified</h4>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aadhar / KYC</p>
                        </div>
                      </div>
                      <span className={`${profile?.aadhaar_verified ? 'bg-primary text-primary-foreground text-white' : 'bg-zinc-300 text-zinc-600'} text-[10px] font-bold uppercase tracking-widest px-3 py-1`}>
                        {profile?.aadhaar_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-background p-4 border border-border">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center ${profile?.iti_certified ? 'bg-primary text-primary-foreground text-white' : 'bg-zinc-200 text-muted-foreground'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">Trade Certified</h4>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ITI / NSQF</p>
                        </div>
                      </div>
                      <span className={`${profile?.iti_certified ? 'bg-primary text-primary-foreground text-white' : 'bg-zinc-300 text-zinc-600'} text-[10px] font-bold uppercase tracking-widest px-3 py-1`}>
                        {profile?.iti_certified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-border">
                    {profile?.approval_status === 'PENDING' ? (
                      <div className="w-full border border-dashed flex items-center justify-center border-yellow-300 bg-yellow-50 text-yellow-700 font-bold text-xs uppercase tracking-wider py-4 rounded-xl">
                        Pending Admin Approval
                      </div>
                    ) : (
                      <label className={`w-full border border-dashed flex items-center justify-center border-zinc-300 text-muted-foreground hover:bg-background hover:text-foreground hover:border-border font-bold text-xs uppercase tracking-wider py-4 transition-all cursor-pointer rounded-xl ${uploadingCredential ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploadingCredential ? 'Uploading...' : '+ Upload New Credential / License'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*,.pdf" 
                          disabled={uploadingCredential}
                          onChange={handleCredentialUpload}
                        />
                      </label>
                    )}
                  </div>
                </section>

                <section className="bg-card p-8 border border-border shadow-sm rounded-2xl flex flex-col">
                  <h3 className="font-extrabold text-foreground mb-6 text-xl">Payment Details</h3>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">UPI ID</label>
                    <div className="flex gap-3 mb-6">
                      <input 
                        type="text" 
                        className="flex-1 bg-background border border-border px-4 py-3 text-foreground font-mono transition-colors focus:border-black focus:outline-none" 
                        value={profile?.upi_id || ''}
                        onChange={(e) => setProfile((prev: any) => ({ ...prev, upi_id: e.target.value }))}
                        placeholder="worker@upi" 
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={async () => {
                          try {
                            await api.patch('/workers/profile/details', { upiId: profile?.upi_id }, { headers: { Authorization: `Bearer ${token}` }});
                            alert('UPI ID saved successfully!');
                          } catch(e) {
                            alert('Failed to save UPI ID');
                          }
                        }}
                        disabled={!profile?.upi_id}
                        className="w-full bg-primary hover:bg-zinc-800 text-primary-foreground font-bold py-4 text-xs uppercase tracking-wider rounded-xl transition-colors disabled:bg-zinc-200 disabled:text-zinc-500"
                      >
                        Save Details
                      </button>

                      <label className="w-full py-4 text-center border border-dashed border-zinc-300 text-muted-foreground hover:bg-background font-bold text-xs uppercase tracking-wider transition-all cursor-pointer rounded-xl">
                        Upload QR Image
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            if (!e.target.files?.[0]) return;
                            const fd = new FormData();
                            fd.append('qr', e.target.files[0]);
                            try {
                              const res = await api.post('/auth/parse-qr', fd);
                              if (res.data.data?.upiId) {
                                setProfile((prev: any) => ({ ...prev, upi_id: res.data.data.upiId }));
                                alert('UPI ID extracted from QR!');
                              } else {
                                alert('Could not extract UPI ID. Please enter manually.');
                              }
                            } catch (err) {
                              alert('Failed to parse QR code.');
                            }
                          }}
                        />
                      </label>
                    </div>
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
