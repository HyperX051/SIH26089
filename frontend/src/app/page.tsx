"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThermometerSnowflake, SprayCan, Wrench, Zap, Hammer, Paintbrush, Bug, Sparkles, MapPin, Loader2, LogOut, CheckCircle, Car, MonitorSmartphone, ShieldCheck, FileText, BrainCircuit } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import UPIPayment from '@/components/UPIPayment';

const DynamicMapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type BookingStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'COMPLETED' | 'FEEDBACK';

const CATEGORIES = [
  { id: 'AC_REPAIR', name: "AC Repair", icon: <ThermometerSnowflake className="w-6 h-6" /> },
  { id: 'CLEANING', name: "Deep Cleaning", icon: <SprayCan className="w-6 h-6" /> },
  { id: 'PLUMBER', name: "Plumbing", icon: <Wrench className="w-6 h-6" /> },
  { id: 'ELECTRICIAN', name: "Electrician", icon: <Zap className="w-6 h-6" /> },
  { id: 'CARPENTER', name: "Carpentry", icon: <Hammer className="w-6 h-6" /> },
  { id: 'PAINTER', name: "Painting", icon: <Paintbrush className="w-6 h-6" /> },
  { id: 'PEST_CONTROL', name: "Pest Control", icon: <Bug className="w-6 h-6" /> },
  { id: 'CAR_MECHANIC', name: "Car Mechanic", icon: <Car className="w-6 h-6" /> },
  { id: 'APPLIANCE', name: "Appliances", icon: <MonitorSmartphone className="w-6 h-6" /> },
  { id: 'ROOFING', name: "Roofing", icon: <ShieldCheck className="w-6 h-6" /> },
  { id: 'HANDYMAN', name: "Handyman", icon: <Wrench className="w-6 h-6" /> },
  { id: 'OTHER', name: "View All", icon: <Sparkles className="w-6 h-6" /> },
];

export default function Home() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { client, connected } = useStomp();
  
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('IDLE');
  const [problemDescription, setProblemDescription] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  const [rating, setRating] = useState(0);

  // AI Assessment State
  const [aiAssessing, setAiAssessing] = useState(false);
  const [aiAssessment, setAiAssessment] = useState<any>(null);

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

  const handleAiAssess = async () => {
    if (!problemDescription.trim()) return;
    setAiAssessing(true);
    try {
      const res = await api.post('/ai/assess-problem', { problemDescription });
      setAiAssessment(res.data.data);
    } catch (e) {
      console.error(e);
      alert("AI Assessment failed.");
    } finally {
      setAiAssessing(false);
    }
  };

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
        addressText: location.address || "Current Location",
        // we can pass aiAssessment data if backend supported it, but we'll leave it local for now
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
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
      
      {/* Navbar - Monochrome */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {setSelectedService(null); setBookingStatus('IDLE'); setAiAssessment(null);}}>
            <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-zinc-900 uppercase">FixNow</span>
          </div>

          <div className="flex items-center gap-6">
            {!token ? (
              <>
                <Link href="/worker/login" className="hidden md:block text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                  Join as Professional
                </Link>
                <Link href="/customer/login" className="flex items-center justify-center h-10 px-6 bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors">
                  Sign In
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link href="/customer" className="hidden md:block text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
                  Past Bookings
                </Link>
                <div className="flex items-center gap-3 border border-zinc-200 pl-1 pr-4 py-1 rounded-full">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold text-xs uppercase">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <span className="font-semibold text-sm text-zinc-800">{user?.name || 'Customer'}</span>
                  <button onClick={() => { logout(); router.push('/'); }} className="ml-2 text-zinc-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-28 pb-20 px-6 max-w-[1200px] mx-auto min-h-[calc(100vh-64px)]">
        
        {/* State: IDLE (Category Selection) */}
        {!selectedService && bookingStatus === 'IDLE' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-16">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-4 leading-tight">
                Professional Services.<br />
                <span className="text-zinc-400">Zero Friction.</span>
              </h1>
              <p className="text-lg text-zinc-500 font-medium max-w-xl">
                Select a service category to broadcast your requirement to our verified, independent professional network.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                  className="group p-6 border border-zinc-200 hover:border-zinc-900 bg-zinc-50/50 hover:bg-white transition-all flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="mb-3 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                    {service.icon}
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-700 group-hover:text-zinc-900">{service.name}</h3>
                </button>
              ))}
            </div>

            {/* Trust Badges - Minimal */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-zinc-200 pt-16">
              <div>
                <CheckCircle className="w-6 h-6 text-zinc-900 mb-4" />
                <h4 className="font-bold text-zinc-900 mb-2">Verified Credentials</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">Every professional uploads government IDs and trade certifications securely verified by AI.</p>
              </div>
              <div>
                <Zap className="w-6 h-6 text-zinc-900 mb-4" />
                <h4 className="font-bold text-zinc-900 mb-2">Instant Broadcast</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">We don't schedule. We broadcast your request to the nearest available workers instantly.</p>
              </div>
              <div>
                <FileText className="w-6 h-6 text-zinc-900 mb-4" />
                <h4 className="font-bold text-zinc-900 mb-2">Transparent Pricing</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">Pay the worker directly upon completion. No hidden aggregator commission fees.</p>
              </div>
            </div>
          </div>
        )}

        {/* State: Booking Form (IDLE with Service Selected) */}
        {selectedService && bookingStatus === 'IDLE' && (
          <div className="max-w-2xl mx-auto border border-zinc-200 bg-white p-8 md:p-10 animate-in slide-in-from-bottom-4">
            <button onClick={() => { setSelectedService(null); setAiAssessment(null); }} className="text-xs font-bold text-zinc-500 hover:text-zinc-900 mb-8 uppercase tracking-wider flex items-center gap-2">
              &larr; Back to Services
            </button>
            
            <div className="mb-10 pb-6 border-b border-zinc-100">
              <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">Book: {CATEGORIES.find(c => c.id === selectedService)?.name}</h2>
              <p className="text-zinc-500 text-sm">Provide details so professionals can accurately accept your job.</p>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-3 uppercase tracking-wider">Problem Description</label>
                <div className="relative">
                  <textarea
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    className="w-full bg-zinc-50 border border-zinc-200 p-4 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 focus:bg-white transition-all resize-none"
                  />
                  <button 
                    onClick={handleAiAssess}
                    disabled={!problemDescription.trim() || aiAssessing}
                    className="absolute bottom-3 right-3 flex items-center gap-2 bg-zinc-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    {aiAssessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                    AI Assess
                  </button>
                </div>
                
                {/* AI Assessment Result */}
                {aiAssessment && (
                  <div className="mt-4 p-4 border border-zinc-200 bg-zinc-50 animate-in fade-in">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-zinc-900" /> AI Assessment
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-zinc-500 mb-1">Estimated Cost</span>
                        <span className="font-bold text-zinc-900">{aiAssessment.estimated_cost_range}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Urgency</span>
                        <span className={`font-bold ${aiAssessment.urgency === 'High' || aiAssessment.urgency === 'Critical' ? 'text-red-600' : 'text-zinc-900'}`}>{aiAssessment.urgency}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-zinc-500 mb-1">Recommended Tools</span>
                        <span className="font-medium text-zinc-700">{aiAssessment.recommended_tools?.join(", ") || "Standard Tools"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                  Service Location
                </label>
                <div className="border border-zinc-200 mb-3 h-[250px] bg-zinc-50">
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
                
                <div className="flex items-center justify-between border border-zinc-200 p-4 bg-zinc-50 text-sm">
                  <div className="flex items-center gap-3 truncate">
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400 shrink-0" />
                    ) : location ? (
                      <MapPin className="w-4 h-4 text-zinc-900 shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                    <span className="font-medium text-zinc-700 truncate">
                      {locationLoading ? "Detecting location..." : location ? location.address : "Please pin your location"}
                    </span>
                  </div>
                  <button onClick={fetchLocation} className="text-xs font-bold text-zinc-900 hover:underline shrink-0 ml-4 uppercase tracking-wider">
                    Auto Detect
                  </button>
                </div>
              </div>

              <button
                onClick={handleBookService}
                disabled={!problemDescription.trim() || locationLoading || !location}
                className="w-full bg-zinc-900 hover:bg-black disabled:bg-zinc-300 disabled:text-zinc-500 text-white py-4 font-bold text-sm tracking-wide uppercase transition-colors"
              >
                Broadcast Job
              </button>
            </div>
          </div>
        )}

        {/* Status: SEARCHING */}
        {bookingStatus === 'SEARCHING' && (
          <div className="max-w-xl mx-auto border border-zinc-200 p-12 text-center bg-white animate-in zoom-in-95">
            <Loader2 className="w-12 h-12 animate-spin text-zinc-900 mx-auto mb-6" />
            <h2 className="text-2xl font-extrabold text-zinc-900 mb-3">Broadcasting...</h2>
            <p className="text-zinc-500 text-sm mb-8">Your request is currently live on the Worker Bulletin Board. Waiting for a professional to accept.</p>
            <div className="bg-zinc-50 p-4 border border-zinc-200 text-left">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Details</p>
              <p className="text-zinc-700 text-sm font-medium">{problemDescription}</p>
            </div>
          </div>
        )}

        {/* Status: ACCEPTED */}
        {bookingStatus === 'ACCEPTED' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-8">
            <div className="border border-zinc-200 bg-white p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">Worker Assigned</h2>
              <p className="text-zinc-500 text-sm mb-8">A professional has claimed your job and is en route.</p>
              
              <div className="flex items-center gap-4 border border-zinc-200 bg-zinc-50 p-4 mb-8 text-left">
                <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-500">PRO</div>
                <div>
                  <h3 className="font-bold text-zinc-900">Independent Professional</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-zinc-900 text-white px-2 py-0.5 uppercase tracking-wider font-bold">Verified Credentials</span>
                  </div>
                </div>
              </div>

              <div className="border border-zinc-200 bg-zinc-50 p-6">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Closure OTP</p>
                <div className="text-4xl font-mono font-bold tracking-[0.2em] text-zinc-900">482910</div>
                <p className="text-xs text-zinc-500 mt-2">Provide this only when the job is completed to your satisfaction.</p>
              </div>
            </div>
            
            <button onClick={handleSimulateCompletion} className="w-full text-xs font-bold text-zinc-400 hover:text-zinc-900 py-2 uppercase tracking-wider transition-colors">
              [Dev] Simulate Completion
            </button>
          </div>
        )}

        {/* Status: COMPLETED */}
        {bookingStatus === 'COMPLETED' && (
          <div className="max-w-lg mx-auto space-y-6 animate-in zoom-in-95">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-zinc-900 mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold text-zinc-900">Job Complete</h2>
              <p className="text-zinc-500 mt-2">Please settle the payment via UPI directly to the professional.</p>
            </div>
            
            {/* Using existing UPIPayment component, but it might have pink colors. Since we can't edit it here directly easily, we'll wrap it and proceed. */}
            <div className="border border-zinc-200 bg-white p-6">
              <UPIPayment 
                amount={aiAssessment ? parseInt(aiAssessment.estimated_cost_range.replace(/\D/g,'').substring(0,3)) || 450 : 450} 
                workerName="Independent Professional"
                onPaymentSuccess={() => setBookingStatus('FEEDBACK')}
              />
            </div>
          </div>
        )}

        {/* Status: FEEDBACK */}
        {bookingStatus === 'FEEDBACK' && (
          <div className="max-w-lg mx-auto border border-zinc-200 bg-white p-10 text-center animate-in slide-in-from-bottom-8">
            <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">Rate Service</h2>
            <p className="text-zinc-500 text-sm mb-8">Help maintain the platform's quality standards.</p>
            
            <div className="flex justify-center gap-1 mb-8">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`text-4xl transition-all ${rating >= star ? 'text-zinc-900' : 'text-zinc-200 hover:text-zinc-400'}`}>
                  ★
                </button>
              ))}
            </div>
            
            <textarea placeholder="Optional feedback..." className="w-full bg-zinc-50 border border-zinc-200 p-4 text-zinc-900 text-sm focus:outline-none focus:border-zinc-900 resize-none h-24 mb-6"></textarea>
            
            <button onClick={() => { setBookingStatus('IDLE'); setRating(0); setProblemDescription(''); setSelectedService(null); setAiAssessment(null); }} className="w-full bg-zinc-900 text-white py-4 font-bold text-sm uppercase tracking-wider hover:bg-black transition-colors">
              Submit & Close
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
