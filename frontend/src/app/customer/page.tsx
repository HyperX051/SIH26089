"use client";

import { useState, useEffect, useCallback } from 'react';
import { Wrench, Zap, Hammer, Paintbrush, ThermometerSnowflake, Droplet, Tv, Sparkles, Bug, Car, MapPin, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';

type BookingStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'COMPLETED' | 'FEEDBACK';

export default function CustomerApp() {
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('IDLE');
  const [selectedDomain, setSelectedDomain] = useState('maintenance');
  const [selectedService, setSelectedService] = useState('plumber');
  const [problemDescription, setProblemDescription] = useState('');
  const [sosActive, setSosActive] = useState(false);
  const [rating, setRating] = useState(0);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Location state
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const { client, connected } = useStomp();
  const user = useAuthStore(state => state.user);

  // Auto-fetch location from browser when the component loads
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
        // Reverse geocode using nominatim (free, no API key)
        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          address = data.display_name || address;
        } catch {
          // fallback to coordinates
        }
        setLocation({ latitude, longitude, address });
        setLocationLoading(false);
      },
      (err) => {
        setLocationError('Location permission denied. Please allow location access.');
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
    if (!problemDescription.trim()) {
      alert('Please describe the problem before booking.');
      return;
    }
    
    if (!location) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            address = data.display_name || address;
          } catch {}
          
          const newLocation = { latitude, longitude, address };
          setLocation(newLocation);
          setLocationLoading(false);
          
          submitBooking(newLocation);
        },
        (err) => {
          setLocationError('Location permission denied. Please allow location access.');
          setLocationLoading(false);
          alert('Location permission is required to book a service.');
        },
        { timeout: 10000 }
      );
      return;
    }

    submitBooking(location);
  };

  const submitBooking = async (loc: any) => {
    setBookingStatus('SEARCHING');
    try {
      const serviceTypeMapping: Record<string, string> = {
        'Plumbing': 'PLUMBER',
        'Electrical': 'ELECTRICIAN',
        'Carpentry': 'CARPENTER',
        'Painting': 'PAINTER'
      };
      const apiServiceType = serviceTypeMapping[selectedService] || 'OTHER';

      const response = await api.post('/bookings', {
        serviceType: apiServiceType,
        categoryType: selectedDomain === 'Quick Fix' ? 'PREDEFINED' : 'CUSTOM',
        bookingType: 'INSTANT',
        customPromptText: problemDescription.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        pincode: "560001", // Default pincode for now
        addressText: loc.address || "Current Location"
      });
      setBookingId(response.data.booking_id || response.data.data?.id); // adjust based on actual API response
    } catch (err) {
      console.error("Failed to create booking:", err);
      setBookingStatus('IDLE');
      alert("Failed to create booking");
    }
  };

  const handleSOS = async () => {
    setSosActive(true);
    try {
      await api.post('/safety/sos', {
        bookingId: bookingId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        telemetry: { battery: 80 }
      });
    } catch (err) {
      console.error("SOS API failed:", err);
    }
  };

  const handleSimulateCompletion = async () => {
    try {
      await api.post(`/bookings/${bookingId}/verify-otp-complete`, { enteredOtp: "482910" });
    } catch (err) {
      console.error(err);
    }
    setBookingStatus('COMPLETED');
  };

  const handlePayment = () => {
    setTimeout(() => { setBookingStatus('FEEDBACK'); }, 1500);
  };

  const domains = [
    { id: 'maintenance', label: 'Home Maintenance' },
    { id: 'appliances', label: 'Appliance Servicing' },
    { id: 'cleaning', label: 'Deep Cleaning' },
    { id: 'auto', label: 'Auto Mechanics' }
  ];

  const servicesByDomain: Record<string, { id: string; icon: JSX.Element; label: string }[]> = {
    maintenance: [
      { id: 'plumber', icon: <Wrench className="w-8 h-8" />, label: 'Plumber' },
      { id: 'electrician', icon: <Zap className="w-8 h-8" />, label: 'Electrician' },
      { id: 'carpenter', icon: <Hammer className="w-8 h-8" />, label: 'Carpenter' },
      { id: 'painter', icon: <Paintbrush className="w-8 h-8" />, label: 'Painter' }
    ],
    appliances: [
      { id: 'ac_repair', icon: <ThermometerSnowflake className="w-8 h-8" />, label: 'AC Repair' },
      { id: 'washing_machine', icon: <Droplet className="w-8 h-8" />, label: 'Washing Mach.' },
      { id: 'tv_repair', icon: <Tv className="w-8 h-8" />, label: 'TV Repair' }
    ],
    cleaning: [
      { id: 'home_clean', icon: <Sparkles className="w-8 h-8" />, label: 'Full Home' },
      { id: 'pest_control', icon: <Bug className="w-8 h-8" />, label: 'Pest Control' }
    ],
    auto: [
      { id: 'car_repair', icon: <Car className="w-8 h-8" />, label: 'Car Repair' }
    ]
  };

  const currentServices = servicesByDomain[selectedDomain] || [];

  return (
    <div className="min-h-screen bg-[#fafafc] flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">FixNow</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 text-slate-900 font-bold text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-semibold text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            Past Bookings
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-semibold text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            Profile & Billing
          </button>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-500 text-xs">
              {user?.name ? user.name[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user?.name || 'Customer'}</p>
              <p className="text-xs font-medium text-slate-400">Member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header — live location */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/70 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/50 hidden md:flex">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Book a Service</h1>
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-sm font-semibold text-slate-600 max-w-xs truncate">
            {locationLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span>Fetching your location...</span>
              </>
            ) : locationError ? (
              <>
                <MapPin className="w-4 h-4 text-red-400" />
                <span className="text-red-500 truncate">Location unavailable</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-purple-500" />
                <span className="truncate">{location?.address ?? 'Unknown location'}</span>
              </>
            )}
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">What do you need help with?</h2>
            <p className="text-slate-500 font-medium">Select a category, choose a service, and describe the problem.</p>
          </div>

          <div className="space-y-8">
            {/* Category */}
            <section>
              <label className="block text-sm font-bold text-slate-700 mb-3">Service Category</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {domains.map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDomain(d.id);
                      setSelectedService(servicesByDomain[d.id][0].id);
                      setProblemDescription('');
                    }}
                    className={`px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedDomain === d.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Specific Task */}
            <section>
              <label className="block text-sm font-bold text-slate-700 mb-3">Specific Task</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {currentServices.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s.id); setProblemDescription(''); }}
                    className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all duration-300 ${selectedService === s.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-md ring-2 ring-indigo-600/20' : 'bg-white border-slate-100 text-slate-600 hover:shadow-md'}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${selectedService === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}>
                      {s.icon}
                    </div>
                    <span className="text-sm font-bold text-center leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Problem Description + Location — appears after selecting service */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Describe the Problem
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder={`E.g. "My ${currentServices.find(s => s.id === selectedService)?.label ?? 'service'} is not working since yesterday morning. There's a leaking pipe in the bathroom."`}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
                />
                <p className="text-xs text-slate-400 mt-1 font-medium">{problemDescription.length}/500 characters</p>
              </div>

              {/* Auto-fetched location */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  Your Location
                </label>
                <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all
                  ${locationError ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  {locationLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
                      <span className="text-slate-500">Detecting your location...</span>
                    </>
                  ) : locationError ? (
                    <>
                      <span className="flex-1">{locationError}</span>
                      <button onClick={fetchLocation} className="text-xs font-bold text-purple-600 hover:text-purple-700 shrink-0">
                        Retry
                      </button>
                    </>
                  ) : location ? (
                    <>
                      <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="flex-1 truncate">{location.address}</span>
                      <button onClick={fetchLocation} className="text-xs font-bold text-purple-600 hover:text-purple-700 shrink-0">
                        Refresh
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-slate-500">Location not shared yet</span>
                      <button onClick={fetchLocation} className="text-xs font-bold text-purple-600 hover:text-purple-700 shrink-0">
                        Share Location
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Book Button */}
            {bookingStatus === 'IDLE' && (
              <div className="pt-2">
                <button
                  onClick={handleBookService}
                  disabled={!problemDescription.trim() || locationLoading}
                  className="w-full md:w-auto px-10 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Find Worker Instantly
                </button>
                {!problemDescription.trim() && (
                  <p className="text-xs text-slate-400 font-medium mt-2">Please describe your problem to continue</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Panel: Active Request */}
      <aside className="w-full md:w-96 bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-40 relative">
        <header className="h-16 flex items-center px-6 border-b border-slate-100 bg-white">
          <h2 className="font-bold text-slate-800 tracking-tight">Active Request</h2>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">

          {bookingStatus === 'IDLE' && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <p className="text-slate-500 font-medium text-sm max-w-[200px]">Select a service and describe your problem to begin.</p>
            </div>
          )}

          {bookingStatus === 'SEARCHING' && (
            <div className="flex flex-col items-center justify-center h-full py-10 animate-in fade-in">
              <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-ping"></div>
                <div className="absolute inset-2 border-4 border-indigo-300 rounded-full animate-pulse"></div>
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Searching Nearby...</h3>
              <p className="text-sm text-slate-500 text-center mt-2">Contacting top-rated cooperative workers within a 5km radius.</p>
              {problemDescription && (
                <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 text-left w-full">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Your Request</p>
                  <p className="text-sm text-slate-700 font-medium">{problemDescription}</p>
                </div>
              )}
            </div>
          )}

          {bookingStatus === 'ACCEPTED' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center overflow-hidden">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Worker" className="w-10 h-10" alt="Worker" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-0.5">Assigned Professional</p>
                      <h3 className="font-extrabold text-slate-800 leading-tight">Worker Assigned</h3>
                      <p className="text-xs text-slate-500 font-medium">NCCT Certified</p>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 mb-1 uppercase tracking-widest font-bold text-center">Closure OTP</p>
                  <div className="text-3xl font-mono font-bold tracking-[0.2em] text-center text-emerald-900">482910</div>
                  <p className="text-[10px] text-center mt-1 text-emerald-600 font-medium">Share this ONLY when the job is done.</p>
                </div>
              </div>
              <button onClick={handleSimulateCompletion} className="w-full bg-slate-200 text-slate-600 py-3 rounded-xl text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">
                [Dev] Simulate Completion
              </button>
              <button onClick={handleSOS} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm border border-red-200 hover:bg-red-100 transition-colors">
                SOS / Emergency Help
              </button>
            </div>
          )}

          {bookingStatus === 'COMPLETED' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Digital Invoice</h3>
                <p className="text-sm text-slate-500 font-medium">Job completed successfully.</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500 text-center mb-4 font-medium">Final invoice will be generated from the backend after payment.</p>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm uppercase tracking-wide">Total Payable</span>
                  <span className="font-mono font-bold text-xl text-slate-900">Calculated by server</span>
                </div>
              </div>
              <button onClick={handlePayment} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <span>Pay securely</span>
              </button>
            </div>
          )}

          {bookingStatus === 'FEEDBACK' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Payment Successful</h3>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left">
                <h4 className="font-bold text-slate-800 mb-3 text-center text-sm">Rate your professional</h4>
                <div className="flex justify-center gap-1 mb-5">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setRating(star)} className={`text-3xl transition-colors ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
                  ))}
                </div>
                <textarea placeholder="Leave a review..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white resize-none h-24 mb-4 transition-all"></textarea>
                <button onClick={() => { setBookingStatus('IDLE'); setRating(0); setProblemDescription(''); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800">
                  Submit Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* SOS Modal */}
      {sosActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-slate-200">
            <div className="bg-red-600 text-white p-6 text-center animate-[pulse_1s_ease-in-out_infinite]">
              <h2 className="text-2xl font-black uppercase tracking-widest">SOS Triggered</h2>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-slate-700 font-medium text-sm">Your live location has been shared with emergency services and the Federation Command Center.</p>
              <button onClick={() => setSosActive(false)} className="mt-4 w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 text-sm">
                Cancel / False Alarm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
