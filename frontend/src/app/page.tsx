"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThermometerSnowflake, SprayCan, Wrench, Zap, Hammer, Paintbrush, Bug, Sparkles, MapPin, Loader2, User as UserIcon, LogOut, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import UPIPayment from '@/components/UPIPayment';
import WorkerBadge from '@/components/WorkerBadge';

const DynamicMapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type BookingStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'COMPLETED' | 'FEEDBACK';

const CATEGORIES = [
  { id: 'AC_REPAIR', name: "AC Repair", icon: <ThermometerSnowflake className="w-8 h-8" />, color: "bg-pink-50 text-pink-500 border-pink-200 hover:bg-pink-500 hover:text-white" },
  { id: 'CLEANING', name: "Cleaning", icon: <SprayCan className="w-8 h-8" />, color: "bg-orange-50 text-orange-500 border-orange-200 hover:bg-orange-500 hover:text-white" },
  { id: 'PLUMBER', name: "Plumbing", icon: <Wrench className="w-8 h-8" />, color: "bg-blue-50 text-blue-500 border-blue-200 hover:bg-blue-500 hover:text-white" },
  { id: 'ELECTRICIAN', name: "Electrician", icon: <Zap className="w-8 h-8" />, color: "bg-yellow-50 text-yellow-500 border-yellow-200 hover:bg-yellow-500 hover:text-white" },
  { id: 'CARPENTER', name: "Carpentry", icon: <Hammer className="w-8 h-8" />, color: "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-500 hover:text-white" },
  { id: 'PAINTER', name: "Painting", icon: <Paintbrush className="w-8 h-8" />, color: "bg-purple-50 text-purple-500 border-purple-200 hover:bg-purple-500 hover:text-white" },
  { id: 'PEST_CONTROL', name: "Pest Control", icon: <Bug className="w-8 h-8" />, color: "bg-emerald-50 text-emerald-500 border-emerald-200 hover:bg-emerald-500 hover:text-white" },
  { id: 'OTHER', name: "View All", icon: <Sparkles className="w-8 h-8" />, color: "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-800 hover:text-white" },
];

export default function Home() {
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  const { client, connected } = useStomp();
  
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('IDLE');
  const [problemDescription, setProblemDescription] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  const [rating, setRating] = useState(0);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          address = data.display_name || address;
        } catch {}
        setLocation({ latitude, longitude, address });
        setLocationLoading(false);
      },
      (err) => {
        setLocationError('Location permission denied.');
        setLocationLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (client && connected && bookingId) {
      const sub = client.subscribe(`/topic/booking/${bookingId}`, (message) => {
        const data = JSON.parse(message.body);
        if (data.event === 'STATUS_CHANGED') {
          setBookingStatus(data.payload.status);
        }
      });
      return () => sub.unsubscribe();
    }
  }, [client, connected, bookingId]);

  const handleBookService = async () => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    if (!problemDescription.trim() || !selectedService) {
      alert('Please describe the problem before booking.');
      return;
    }
    
    if (!location) {
      fetchLocation();
      alert('Please allow or select location before booking.');
      return;
    }

    setBookingStatus('SEARCHING');
    try {
      const response = await api.post('/bookings', {
        serviceType: selectedService,
        categoryType: 'CUSTOM',
        bookingType: 'INSTANT',
        customPromptText: problemDescription.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        pincode: "560001",
        addressText: location.address || "Current Location"
      });
      setBookingId(response.data.booking_id || response.data.data?.id);
    } catch (err) {
      console.error("Failed to create booking:", err);
      setBookingStatus('IDLE');
      alert("Failed to create booking");
    }
  };

  const handleSimulateCompletion = async () => {
    try {
      await api.post(`/bookings/${bookingId}/verify-otp-complete`, { enteredOtp: "482910" });
    } catch (err) {}
    setBookingStatus('COMPLETED');
  };

  return (
    <div className="min-h-screen bg-[#FDF2F8] font-sans text-slate-900 selection:bg-pink-500/30">
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-pink-100 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setSelectedService(null); setBookingStatus('IDLE');}}>
            <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">FixNow</span>
          </div>

          <div className="flex items-center gap-4">
            {!token ? (
              <>
                <Link href="/worker/login" className="hidden md:flex items-center text-sm font-bold text-slate-500 hover:text-pink-600 transition-colors">
                  Join as Professional
                </Link>
                <Link href="/customer/login" className="flex items-center justify-center h-11 px-8 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-pink-500 hover:scale-105 transition-all duration-300 shadow-md">
                  Sign In
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/customer" className="hidden md:flex items-center text-sm font-bold text-slate-600 hover:text-pink-600 transition-colors">
                  Past Bookings
                </Link>
                <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-full px-4 py-1.5 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-black text-xs">
                    {user?.name?.[0].toUpperCase() || 'U'}
                  </div>
                  <span className="font-bold text-sm text-slate-800">{user?.name || 'Customer'}</span>
                  <button onClick={() => { clearAuth(); router.push('/'); }} className="ml-2 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-28 pb-20 px-6 max-w-[1200px] mx-auto min-h-[calc(100vh-80px)]">
        
        {/* State: IDLE (Category Selection) */}
        {!selectedService && bookingStatus === 'IDLE' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12 relative z-10">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Your home,<br className="hidden md:block" /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">perfectly fixed.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 font-medium max-w-2xl mx-auto">
                Select a service below to instantly connect with verified independent professionals. Transparent pricing, no middleman.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
              {CATEGORIES.map((service) => (
                <button 
                  key={service.id}
                  onClick={() => {
                    if (!token) {
                      router.push('/customer/login');
                      return;
                    }
                    setSelectedService(service.id);
                  }}
                  className={`group p-8 rounded-[2rem] border-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(236,72,153,0.15)] hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center cursor-pointer ${service.color}`}
                >
                  <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <h3 className="font-black text-lg">{service.name}</h3>
                </button>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto border-t border-pink-100 pt-16">
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-pink-500 shadow-sm border border-pink-100">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-900 mb-2">Verified Experts</h4>
                <p className="text-slate-500 font-medium text-sm">Background-checked independent professionals.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-orange-500 shadow-sm border border-orange-100">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-900 mb-2">Instant Broadcast</h4>
                <p className="text-slate-500 font-medium text-sm">Your request reaches all nearby workers instantly.</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                  <Wrench className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-900 mb-2">Transparent Pricing</h4>
                <p className="text-slate-500 font-medium text-sm">Pay directly to the worker when the job is done.</p>
              </div>
            </div>
          </div>
        )}

        {/* State: Booking Form (IDLE with Service Selected) */}
        {selectedService && bookingStatus === 'IDLE' && (
          <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_40px_rgba(236,72,153,0.08)] border border-pink-100 animate-in zoom-in-95 duration-300">
            <button onClick={() => setSelectedService(null)} className="text-sm font-bold text-pink-500 hover:text-pink-600 mb-8 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Back to Services
            </button>
            
            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-2xl flex items-center justify-center">
                {CATEGORIES.find(c => c.id === selectedService)?.icon}
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900">Book a {CATEGORIES.find(c => c.id === selectedService)?.name}</h2>
                <p className="text-slate-500 font-medium">Fill in the details below to broadcast your request.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-wider">Describe the Issue</label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="E.g. Leaking pipe under the sink, needs immediate fixing."
                  rows={4}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-medium focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-500" />
                  Service Location
                </label>
                <div className="rounded-3xl overflow-hidden border-2 border-slate-100 mb-4 h-[300px]">
                  <DynamicMapPicker 
                    initialPosition={location ? { lat: location.latitude, lng: location.longitude } : null}
                    onLocationSelect={async (lat, lng) => {
                      setLocationLoading(true);
                      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                        const data = await res.json();
                        address = data.display_name || address;
                      } catch {}
                      setLocation({ latitude: lat, longitude: lng, address });
                      setLocationLoading(false);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-3 truncate">
                    {locationLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400 shrink-0" />
                    ) : location ? (
                      <MapPin className="w-5 h-5 text-pink-500 shrink-0" />
                    ) : (
                      <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <span className="font-medium text-slate-700 truncate">
                      {locationLoading ? "Detecting location..." : location ? location.address : "Please select your location"}
                    </span>
                  </div>
                  <button onClick={fetchLocation} className="text-sm font-black text-pink-500 hover:text-pink-600 shrink-0 ml-4">
                    Auto Detect
                  </button>
                </div>
              </div>

              <button
                onClick={handleBookService}
                disabled={!problemDescription.trim() || locationLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-lg shadow-[0_8px_20px_rgba(236,72,153,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
              >
                Broadcast Request
              </button>
            </div>
          </div>
        )}

        {/* Status: SEARCHING */}
        {bookingStatus === 'SEARCHING' && (
          <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] p-12 text-center shadow-[0_8px_40px_rgba(236,72,153,0.08)] border border-pink-100 animate-in zoom-in-95 duration-500">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 border-4 border-pink-100 rounded-full animate-ping"></div>
              <div className="absolute inset-4 border-4 border-pink-200 rounded-full animate-pulse"></div>
              <div className="absolute inset-8 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Finding Professionals...</h2>
            <p className="text-slate-500 font-medium text-lg mb-8">Your request has been broadcasted to all nearby workers on the FixNow Bulletin Board. Waiting for someone to accept.</p>
            <div className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Request Details</p>
              <p className="text-slate-700 font-bold">{problemDescription}</p>
            </div>
          </div>
        )}

        {/* Status: ACCEPTED */}
        {bookingStatus === 'ACCEPTED' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-[0_8px_40px_rgba(16,185,129,0.1)] border-2 border-emerald-100">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Worker Assigned!</h2>
              <p className="text-slate-500 font-medium mb-8">A professional has accepted your request and is on the way.</p>
              
              <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 text-left">
                <div className="w-16 h-16 rounded-full bg-slate-200 border-4 border-white shadow-sm overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pro" alt="Pro" className="w-full h-full" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900">Independent Professional</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-100 text-blue-700 text-xs font-black px-2 py-1 rounded-md">VERIFIED</span>
                    <span className="text-slate-500 font-bold text-sm">★ 4.8</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-3xl p-6 border-2 border-emerald-100">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Closure OTP</p>
                <div className="text-5xl font-mono font-black tracking-[0.2em] text-emerald-900">482910</div>
                <p className="text-sm text-emerald-700 font-medium mt-3">Share this with the worker ONLY when the job is completed.</p>
              </div>
            </div>
            
            <button onClick={handleSimulateCompletion} className="w-full bg-slate-200 text-slate-500 hover:text-slate-700 py-4 rounded-2xl font-black transition-colors">
              [Dev] Simulate Completion
            </button>
          </div>
        )}

        {/* Status: COMPLETED */}
        {bookingStatus === 'COMPLETED' && (
          <div className="max-w-lg mx-auto space-y-6 animate-in zoom-in-95">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Job Completed</h2>
              <p className="text-slate-500 font-medium text-lg mt-2">Please settle the payment directly.</p>
            </div>
            
            <UPIPayment 
              amount={450.00} 
              workerName="Independent Professional"
              onPaymentSuccess={() => setBookingStatus('FEEDBACK')}
            />
          </div>
        )}

        {/* Status: FEEDBACK */}
        {bookingStatus === 'FEEDBACK' && (
          <div className="max-w-lg mx-auto bg-white rounded-[2.5rem] p-10 text-center shadow-[0_8px_40px_rgba(236,72,153,0.08)] border border-pink-100 animate-in slide-in-from-bottom-8">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Rate your Pro</h2>
            <p className="text-slate-500 font-medium mb-8">Your feedback helps maintain our quality standards.</p>
            
            <div className="flex justify-center gap-2 mb-8">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`text-5xl transition-all hover:scale-110 ${rating >= star ? 'text-amber-400 drop-shadow-md' : 'text-slate-200'}`}>
                  ★
                </button>
              ))}
            </div>
            
            <textarea placeholder="Leave a review..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-slate-800 font-medium focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 resize-none h-32 mb-6 transition-all"></textarea>
            
            <button onClick={() => { setBookingStatus('IDLE'); setRating(0); setProblemDescription(''); setSelectedService(null); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl active:scale-[0.98] transition-all">
              Submit & Return Home
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
