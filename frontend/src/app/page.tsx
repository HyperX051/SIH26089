"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThermometerSnowflake, SprayCan, Wrench, Zap, Hammer, Paintbrush, Bug, Sparkles, MapPin, Loader2, LogOut, CheckCircle, Car, MonitorSmartphone, ShieldCheck, FileText, BrainCircuit, Moon, Sun, Camera, CalendarClock } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useStomp } from '@/hooks/useStomp';
import { useAuthStore } from '@/store/useAuthStore';
import UPIPayment from '@/components/UPIPayment';
import { useTheme } from 'next-themes';

const DynamicMapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type BookingStatus = 'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'COMPLETED' | 'FEEDBACK';

const CATEGORIES = [
  { id: 'AC_REPAIR', name: "AC Repair", icon: <ThermometerSnowflake className="w-6 h-6" />, basePrice: 399 },
  { id: 'CLEANING', name: "Deep Cleaning", icon: <SprayCan className="w-6 h-6" />, basePrice: 799 },
  { id: 'PLUMBER', name: "Plumbing", icon: <Wrench className="w-6 h-6" />, basePrice: 199 },
  { id: 'ELECTRICIAN', name: "Electrician", icon: <Zap className="w-6 h-6" />, basePrice: 199 },
  { id: 'CARPENTER', name: "Carpentry", icon: <Hammer className="w-6 h-6" />, basePrice: 199 },
  { id: 'PAINTER', name: "Painting", icon: <Paintbrush className="w-6 h-6" />, basePrice: 299 },
  { id: 'PEST_CONTROL', name: "Pest Control", icon: <Bug className="w-6 h-6" />, basePrice: 499 },
  { id: 'CAR_MECHANIC', name: "Car Mechanic", icon: <Car className="w-6 h-6" />, basePrice: 299 },
  { id: 'APPLIANCE', name: "Appliances", icon: <MonitorSmartphone className="w-6 h-6" />, basePrice: 199 },
  { id: 'ROOFING', name: "Roofing", icon: <ShieldCheck className="w-6 h-6" />, basePrice: 299 },
  { id: 'HANDYMAN', name: "Handyman", icon: <Wrench className="w-6 h-6" />, basePrice: 199 },
  { id: 'LAPTOP_REPAIR', name: "Laptop Repair", icon: <MonitorSmartphone className="w-6 h-6" />, basePrice: 299 },
  { id: 'WASHING_MACHINE', name: "Washing Machine", icon: <Zap className="w-6 h-6" />, basePrice: 199 },
  { id: 'REFRIGERATOR', name: "Refrigerator", icon: <ThermometerSnowflake className="w-6 h-6" />, basePrice: 199 },
  { id: 'SOFA_CLEANING', name: "Sofa Cleaning", icon: <SprayCan className="w-6 h-6" />, basePrice: 399 },
  { id: 'WATER_PURIFIER', name: "Water Purifier", icon: <Wrench className="w-6 h-6" />, basePrice: 199 },
  { id: 'GEYSER_REPAIR', name: "Geyser Repair", icon: <Zap className="w-6 h-6" />, basePrice: 199 },
  { id: 'BATHROOM_CLEANING', name: "Bath Cleaning", icon: <SprayCan className="w-6 h-6" />, basePrice: 299 },
];

export default function Home() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { client, connected } = useStomp();
  const { theme, setTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (user?.role === 'WORKER') {
      router.push('/worker');
    } else if (user?.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [user?.role, router]);

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('IDLE');
  const [problemDescription, setProblemDescription] = useState('');
  const [bookingType, setBookingType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT');
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [issuePhoto, setIssuePhoto] = useState<File | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  const [aiAssessment, setAiAssessment] = useState<any>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string; pincode: string } | null>(null);
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
        let pincode = '000000';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          address = data.display_name || address;
          pincode = data.address?.postcode?.replace(/\s/g, '').slice(0, 6) || '000000';
        } catch {}
        setLocation({ latitude, longitude, address, pincode });
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

    if (bookingType === 'SCHEDULED' && !scheduledFor) {
      alert('Please select a date and time for your scheduled booking.');
      return;
    }
    
    if (!location) {
      fetchLocation();
      alert('Please allow or select location before booking.');
      return;
    }

    setBookingStatus('SEARCHING');
    try {
      let finalScheduledFor = null;
      if (bookingType === 'SCHEDULED') {
        finalScheduledFor = new Date(scheduledFor).toISOString();
      }

      const bookingReq = {
        serviceType: selectedService,
        categoryType: 'CUSTOM',
        bookingType: bookingType,
        customPromptText: problemDescription.trim(),
        scheduledFor: finalScheduledFor,
        latitude: location.latitude,
        longitude: location.longitude,
        pincode: location.pincode || '000000',
        addressText: location.address || 'Current Location',
      };

      let response;
      if (issuePhoto) {
        // Send as multipart when photo is attached
        const formData = new FormData();
        formData.append("booking", new Blob([JSON.stringify(bookingReq)], { type: "application/json" }));
        formData.append("photo", issuePhoto);
        response = await api.post('/bookings', formData);
      } else {
        // Send as plain JSON when no photo
        response = await api.post('/bookings', bookingReq, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
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

  const displayedCategories = showAllServices ? CATEGORIES : CATEGORIES.slice(0, 11);

  // Generate max date (1 month from now) for scheduler
  const getMaxDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 16); // YYYY-MM-DDThh:mm
  };

  const getMinDate = () => {
    return new Date().toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground transition-colors duration-300">
      
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border transition-colors duration-300">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {setSelectedService(null); setBookingStatus('IDLE'); setShowAllServices(false);}}>
            <div className="w-8 h-8 flex items-center justify-center bg-background rounded text-foreground font-black tracking-tighter text-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] border border-border">
              FN
            </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground">FixNow</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {mounted ? (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />) : <div className="w-5 h-5" />}
            </button>
            {!token ? (
              <>
                <Link href="/worker/login" className="hidden md:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Join as Professional
                </Link>
                <Link href="/customer/login" className="flex items-center justify-center h-10 px-6 bg-primary text-primary-foreground font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                  Sign In
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link href="/customer" className="hidden md:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                  Past Bookings
                </Link>
                <div className="flex items-center gap-3 border border-border pl-1 pr-4 py-1 rounded-full bg-card">
                  <Link href="/customer?tab=profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs uppercase">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <span className="font-semibold text-sm text-foreground">{user?.name || 'Customer'}</span>
                  </Link>
                  <button onClick={() => { logout(); router.push('/'); }} className="ml-2 text-muted-foreground hover:text-destructive transition-colors">
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
            <div className="mb-20 flex flex-col items-center text-center max-w-3xl mx-auto">
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 text-xs font-semibold text-primary shadow-sm">
                <Sparkles className="w-4 h-4" /> The future of service booking
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
                Empower your home.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Book, track, resolve.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl">
                FixNow bridges the gap between customers and professionals. Report local issues, track their progress in real-time, and build a better community together.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {displayedCategories.map((service) => (
                <button 
                  key={service.id}
                  onClick={() => {
                    if (!token) {
                      router.push('/customer/login');
                      return;
                    }
                    setSelectedService(service.id);
                  }}
                  className="group p-6 border border-border rounded-2xl bg-card hover:border-primary/50 transition-all flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <div className="mb-3 text-foreground transition-colors group-hover:text-primary">
                    {service.icon}
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{service.name}</h3>
                </button>
              ))}
              {!showAllServices && (
                <button 
                  onClick={() => setShowAllServices(true)}
                  className="group p-6 border border-border rounded-2xl bg-card hover:border-primary/50 transition-all flex flex-col items-center text-center cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <div className="mb-3 text-foreground transition-colors group-hover:text-primary">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">View All</h3>
                </button>
              )}
            </div>
          </div>
        )}

        {/* State: Booking Form */}
        {selectedService && bookingStatus === 'IDLE' && (
          <div className="max-w-2xl mx-auto border border-border dark:border-border rounded-3xl bg-card dark:bg-card p-8 md:p-10 animate-in slide-in-from-bottom-4 shadow-xl">
            <button onClick={() => { setSelectedService(null); }} className="text-xs font-bold text-muted-foreground hover:text-foreground dark:hover:text-zinc-50 mb-8 uppercase tracking-wider flex items-center gap-2 transition-colors">
              &larr; Back to Services
            </button>
            
            <div className="mb-10 pb-6 border-b border-zinc-100 dark:border-border flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-foreground dark:text-zinc-50 mb-2">Book: {CATEGORIES.find(c => c.id === selectedService)?.name}</h2>
                <p className="text-muted-foreground dark:text-muted-foreground/70 text-sm">Provide details so professionals can accurately accept your job.</p>
              </div>
            </div>

            <div className="space-y-8">
              
              {/* Timing Selection */}
              <div>
                <label className="block text-xs font-bold text-foreground  mb-3 uppercase tracking-wider">Service Timing</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setBookingType('INSTANT')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-colors ${bookingType === 'INSTANT' ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <Zap className="w-4 h-4" /> Instant
                  </button>
                  <button
                    onClick={() => setBookingType('SCHEDULED')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-colors ${bookingType === 'SCHEDULED' ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border text-muted-foreground hover:bg-muted/50'}`}
                  >
                    <CalendarClock className="w-4 h-4" /> Schedule Later
                  </button>
                </div>
                {bookingType === 'SCHEDULED' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <input 
                      type="datetime-local" 
                      min={getMinDate()}
                      max={getMaxDate()}
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full bg-background dark:bg-background border border-border dark:border-border rounded-xl p-3 text-sm text-foreground  focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">You can schedule up to 1 month in advance.</p>
                  </div>
                )}
              </div>

              {/* Problem Description & Photo */}
              <div>
                <label className="block text-xs font-bold text-foreground  mb-3 uppercase tracking-wider">Problem Details</label>
                <div className="relative mb-3">
                  <textarea
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    className="w-full bg-background dark:bg-background border border-border dark:border-border rounded-xl p-4 text-foreground  text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all resize-none shadow-sm"
                  />
                </div>
                
                {/* Photo Upload */}
                <div className="flex flex-col gap-2 relative mt-4">
                  <label className="inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/70 text-muted-foreground px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-max uppercase tracking-wider mb-2">
                    <Camera className="w-4 h-4" /> {issuePhoto ? 'CHANGE PHOTO' : 'UPLOAD PHOTO'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={(e) => setIssuePhoto(e.target.files ? e.target.files[0] : null)}
                    />
                  </label>
                  {issuePhoto && (
                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Photo attached
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                  Service Location
                </label>
                <div className="border border-border rounded-xl overflow-hidden mb-3 h-[250px] bg-background shadow-sm">
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
                
                <div className="flex items-center justify-between border border-border dark:border-border rounded-xl p-4 bg-background dark:bg-background text-sm shadow-sm">
                  <div className="flex items-center gap-3 truncate">
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/70 shrink-0" />
                    ) : location ? (
                      <MapPin className="w-4 h-4 text-foreground  shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                    )}
                    <span className="font-medium text-foreground dark:text-muted-foreground/80 truncate">
                      {locationLoading ? "Detecting location..." : location ? location.address : "Please pin your location"}
                    </span>
                  </div>
                  <button onClick={fetchLocation} className="text-xs font-bold text-foreground  hover:underline shrink-0 ml-4 uppercase tracking-wider">
                    Auto Detect
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
                <span className="text-sm font-bold text-foreground">Estimated Base Price</span>
                <span className="text-lg font-extrabold text-foreground">₹{CATEGORIES.find(c => c.id === selectedService)?.basePrice || 199}</span>
              </div>

              <button
                onClick={handleBookService}
                disabled={!problemDescription.trim() || locationLoading || !location || (bookingType === 'SCHEDULED' && !scheduledFor)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-muted disabled:text-muted-foreground py-4 font-bold text-sm tracking-wide uppercase transition-colors rounded-xl shadow-md"
              >
                Broadcast Job
              </button>
            </div>
          </div>
        )}

        {/* Status: SEARCHING */}
        {bookingStatus === 'SEARCHING' && (
          <div className="max-w-xl mx-auto border border-border p-12 text-center bg-card rounded-3xl animate-in zoom-in-95 shadow-xl">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-extrabold text-foreground mb-3">Booking Raised!</h2>
            <p className="text-muted-foreground text-sm mb-8">
              We have broadcasted your request. We will notify you as soon as a professional is assigned.
            </p>
            <div className="bg-background rounded-xl p-4 border border-border text-left mb-8">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Details</p>
              <p className="text-foreground text-sm font-medium">{problemDescription}</p>
              {bookingType === 'SCHEDULED' && scheduledFor && (
                <p className="text-muted-foreground text-xs mt-2 font-medium">Scheduled For: {new Date(scheduledFor).toLocaleString()}</p>
              )}
            </div>
            
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => { setBookingStatus('IDLE'); setProblemDescription(''); setIssuePhoto(null); setBookingType('INSTANT'); setSelectedService(null); setAiAssessment(null); setShowAllServices(false); }}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm"
              >
                Book Another
              </button>
              <Link 
                href="/customer"
                className="border border-border bg-card hover:bg-muted text-foreground px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Status: ACCEPTED */}
        {bookingStatus === 'ACCEPTED' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-8">
            <div className="border border-border dark:border-border rounded-3xl bg-card dark:bg-card p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-extrabold text-foreground dark:text-zinc-50 mb-2">Worker Assigned</h2>
              <p className="text-muted-foreground dark:text-muted-foreground/70 text-sm mb-8">
                {bookingType === 'INSTANT' ? "A professional has claimed your job and is en route." : `A professional has claimed your job and will arrive at ${new Date(scheduledFor).toLocaleString()}.`}
              </p>
              
              <div className="flex items-center gap-4 border border-border dark:border-border rounded-xl bg-background dark:bg-background p-4 mb-8 text-left">
                <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center font-bold text-muted-foreground dark:text-muted-foreground/70">PRO</div>
                <div>
                  <h3 className="font-bold text-foreground dark:text-zinc-50">Independent Professional</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-card dark:bg-muted text-white dark:text-foreground px-2 py-0.5 uppercase tracking-wider font-bold rounded-sm">Verified Credentials</span>
                  </div>
                </div>
              </div>

              <div className="border border-border dark:border-border rounded-xl bg-background dark:bg-background p-6">
                <p className="text-xs font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider mb-2">Closure OTP</p>
                <div className="text-4xl font-mono font-bold tracking-[0.2em] text-foreground dark:text-zinc-50">482910</div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/70 mt-2">Provide this only when the job is completed to your satisfaction.</p>
              </div>
            </div>
            
            <button onClick={handleSimulateCompletion} className="w-full text-xs font-bold text-muted-foreground/70 dark:text-muted-foreground hover:text-foreground dark:hover:text-zinc-50 py-2 uppercase tracking-wider transition-colors">
              [Dev] Simulate Completion
            </button>
          </div>
        )}

        {/* Status: COMPLETED */}
        {bookingStatus === 'COMPLETED' && (
          <div className="max-w-lg mx-auto space-y-6 animate-in zoom-in-95">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-foreground dark:text-zinc-50 mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold text-foreground dark:text-zinc-50">Job Complete</h2>
              <p className="text-muted-foreground dark:text-muted-foreground/70 mt-2">Please settle the payment via UPI directly to the professional.</p>
            </div>
            
            <div className="border border-border dark:border-border rounded-3xl bg-card dark:bg-card p-6 overflow-hidden">
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
          <div className="max-w-lg mx-auto border border-border dark:border-border rounded-3xl bg-card dark:bg-card p-10 text-center animate-in slide-in-from-bottom-8">
            <h2 className="text-2xl font-extrabold text-foreground dark:text-zinc-50 mb-2">Rate Service</h2>
            <p className="text-muted-foreground dark:text-muted-foreground/70 text-sm mb-8">Help maintain the platform's quality standards.</p>
            
            <div className="flex justify-center gap-1 mb-8">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`text-4xl transition-all ${rating >= star ? 'text-foreground dark:text-zinc-50' : 'text-zinc-200 dark:text-zinc-800 hover:text-muted-foreground/70 dark:hover:text-zinc-600'}`}>
                  ★
                </button>
              ))}
            </div>
            
            <textarea placeholder="Optional feedback..." className="w-full bg-background dark:bg-background border border-border dark:border-border rounded-xl p-4 text-foreground  text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none h-24 mb-6 transition-colors"></textarea>
            
            <button onClick={() => { setBookingStatus('IDLE'); setRating(0); setProblemDescription(''); setIssuePhoto(null); setBookingType('INSTANT'); setSelectedService(null); setAiAssessment(null); setShowAllServices(false); }} className="w-full bg-card dark:bg-muted text-white dark:text-foreground py-4 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-primary text-primary-foreground dark:hover:bg-card transition-colors shadow-sm">
              Submit & Close
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
