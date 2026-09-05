"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  SEARCHING:             { label: 'Searching for Worker', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  ACCEPTED:              { label: 'Worker Assigned',       cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ARRIVED:               { label: 'Worker Arrived',        cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  IN_PROGRESS:           { label: 'In Progress',           cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  PAYMENT_PENDING:       { label: 'Payment Due',           cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  PAYMENT_CLAIMED:       { label: 'Payment Sent',          cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  COMPLETED:             { label: 'Completed',             cls: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED:             { label: 'Cancelled',             cls: 'bg-muted text-muted-foreground border-border' },
  CANCELLED_COMPENSATED: { label: 'Cancelled',             cls: 'bg-muted text-muted-foreground border-border' },
};

// ─── Service SVG icons ─────────────────────────────────────────────────────
function ServiceIcon({ type }: { type: string }) {
  const cls = "w-5 h-5 text-muted-foreground";
  switch (type) {
    case 'ELECTRICIAN': return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>;
    case 'PLUMBER':     return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>;
    case 'AC_REPAIR':   return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.146 12.146l.707.707M1 12h2m18 0h2M4.22 19.78l.707-.707M18.364 5.636l.707-.707M12 6a6 6 0 100 12 6 6 0 000-12z"/></svg>;
    case 'PAINTER':     return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>;
    case 'CARPENTER':   return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>;
    default:            return <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
  }
}

// ─── Star Rating ───────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1,2,3,4,5].map(star => (
        <button key={star} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} onClick={() => onChange(star)} className="transition-transform hover:scale-110">
          <svg className={`w-8 h-8 transition-colors ${(hover || value) >= star ? 'fill-primary text-primary' : 'fill-muted text-muted'}`} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Stars Display ─────────────────────────────────────────────────────────
function StarsDisplay({ value, size = 'sm' }: { value: number; size?: 'sm' | 'xs' }) {
  const sz = size === 'xs' ? 'w-3 h-3' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`${sz} ${s <= value ? 'fill-primary text-primary' : 'fill-border text-border'}`} viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

// ─── Job Detail Panel ──────────────────────────────────────────────────────
function JobDetailPanel({ booking, token, onClose, onRefresh }: {
  booking: any; token: string; onClose: () => void; onRefresh: () => void;
}) {
  const [rating, setRating] = useState<number>(booking.customer_rating || 0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const statusCfg  = STATUS_CONFIG[booking.status] || { label: booking.status, cls: 'bg-muted text-muted-foreground border-border' };
  const isActive   = ['ACCEPTED','ARRIVED','IN_PROGRESS'].includes(booking.status);
  const isCompleted = booking.status === 'COMPLETED';
  const hasWorker  = !!booking.worker_name;
  const showOtp    = ['ACCEPTED','ARRIVED','IN_PROGRESS','PAYMENT_PENDING','PAYMENT_CLAIMED'].includes(booking.status) && booking.otp_code;

  const handleSubmitRating = async () => {
    if (!rating) return;
    setSubmittingRating(true);
    try {
      await api.post(`/bookings/${booking.id}/rate`, { stars: rating }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch { alert("Failed to submit rating."); }
    finally { setSubmittingRating(false); }
  };

  const handlePaid = async () => {
    setPaying(true);
    try {
      await api.post(`/bookings/${booking.id}/customer-paid`, {}, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch { alert("Failed to update payment status."); }
    finally { setPaying(false); }
  };

  const handleSos = async () => {
    try {
      await api.post('/safety/sos', { bookingId: booking.id, latitude: 0, longitude: 0, telemetry: {} });
      alert("SOS Alert triggered! Authorities have been notified.");
    } catch { alert("Failed to trigger SOS."); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return alert("Please provide a reason");
    setCancelling(true);
    try {
      await api.post(`/bookings/${booking.id}/cancel`, { 
        reason: cancelReason, 
        cancelledBy: "CUSTOMER" 
      }, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
      setShowCancelConfirm(false);
    } catch { alert("Failed to cancel booking."); }
    finally { setCancelling(false); }
  };

  const dateStr = booking.date
    ? (() => { const d = new Date(booking.date); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); })()
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-xl bg-card border border-border rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-extrabold text-foreground mb-1.5">{booking.serviceType.replace(/_/g, ' ')}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              <span className="text-xs text-muted-foreground">{dateStr}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-muted hover:bg-border text-muted-foreground transition-colors shrink-0 font-bold text-sm">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">

          {/* Worker */}
          <div className="p-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Assigned Worker</p>
            {hasWorker ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center text-background font-extrabold text-lg shrink-0">
                  {booking.worker_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{booking.worker_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {booking.worker_tier && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">{booking.worker_tier}</span>
                    )}
                    {booking.worker_iti_certified && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">ITI Certified</span>
                    )}
                    {booking.worker_rating > 0 && (
                      <span className="text-xs font-semibold text-muted-foreground">★ {Number(booking.worker_rating).toFixed(1)}</span>
                    )}
                  </div>
                </div>
                {booking.worker_phone && (
                  <a href={`tel:${booking.worker_phone}`}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-border border border-border text-muted-foreground transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center shrink-0 animate-pulse">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Searching for a worker nearby…</p>
              </div>
            )}
          </div>

          {/* Location */}
          {booking.address && (
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Service Location</p>
              <p className="text-sm text-foreground font-medium leading-relaxed">{booking.address}</p>
              {booking.pincode && <p className="text-xs text-muted-foreground mt-1">Pincode: {booking.pincode}</p>}
            </div>
          )}

          {/* OTP */}
          {showOtp && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Closure OTP</p>
              </div>
              <div className="rounded-2xl border-2 border-primary bg-primary/10 px-6 py-6 flex flex-col items-center gap-3 shadow-md">
                <div className="flex gap-3">
                  {booking.otp_code.split('').map((digit: string, i: number) => (
                    <div key={i} className="w-10 h-12 flex items-center justify-center bg-card border-2 border-primary rounded-xl shadow-sm">
                      <span className="text-2xl font-black text-foreground font-mono">{digit}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-primary/80 font-semibold text-center">Share this code with the worker only when the job is fully done</p>
              </div>
            </div>
          )}

          {/* Invoice */}
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Invoice</p>
            <div className="bg-background rounded-xl border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service charge</span>
                <span className="text-foreground font-semibold">₹{Number(booking.amount || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-extrabold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">₹{Number(booking.amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment actions */}
          {booking.status === 'PAYMENT_PENDING' && (
            <div className="px-6 py-5 space-y-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Payment Required</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-700">Scan the QR code on the worker's device to pay <strong>₹{Number(booking.amount).toFixed(2)}</strong> via UPI, then confirm below.</p>
              </div>
              <button onClick={handlePaid} disabled={paying}
                className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 text-sm">
                {paying ? 'Updating…' : `Confirm Payment of ₹${Number(booking.amount).toFixed(2)}`}
              </button>
            </div>
          )}
          {booking.status === 'PAYMENT_CLAIMED' && (
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Payment</p>
              <p className="text-sm font-semibold text-foreground">Awaiting worker confirmation…</p>
            </div>
          )}

          {/* SOS */}
          {isActive && (
            <div className="px-6 py-4">
              <button onClick={handleSos}
                className="w-full flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive font-bold text-sm py-3 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                Emergency SOS — Alert Authorities
              </button>
            </div>
          )}

          {/* Cancel Booking */}
          {isActive && (
            <div className="px-6 pb-6">
              <button onClick={() => setShowCancelConfirm(true)}
                className="w-full bg-muted hover:bg-border text-muted-foreground font-bold text-sm py-3 rounded-xl transition-colors">
                Cancel Booking
              </button>
            </div>
          )}
        </div>

        {/* Cancel Confirm Modal Overlay */}
        {showCancelConfirm && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-6 items-center justify-center">
            <h3 className="text-xl font-bold mb-2">Cancel Booking?</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              If a worker is already assigned, a small cancellation fee may apply to compensate them for their time.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Why are you cancelling?"
              className="w-full bg-card border border-border rounded-xl p-3 text-sm mb-4 min-h-[100px]"
            />
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-3 bg-muted rounded-xl font-bold text-sm">Keep it</button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-3 bg-destructive text-destructive-foreground rounded-xl font-bold text-sm">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )}

          {/* Rating */}
          {isCompleted && (
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Rate this Service</p>
              {booking.customer_rating ? (
                <div>
                  <StarsDisplay value={booking.customer_rating} />
                  <p className="text-xs text-muted-foreground mt-2">You rated this {booking.customer_rating} out of 5 stars</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">How was your experience{booking.worker_name ? ` with ${booking.worker_name}` : ''}?</p>
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <button onClick={handleSubmitRating} disabled={submittingRating}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 text-sm">
                      {submittingRating ? 'Submitting…' : `Submit ${rating}-Star Rating`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tab') === 'profile') setActiveTab('profile');
    }
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token) { router.push('/customer/login'); return; }
    if (activeTab === 'bookings') fetchPastBookings();
  }, [activeTab, token, router, _hasHydrated]);

  const fetchPastBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/customer', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.data?.length > 0) {
        setPastBookings([...res.data.data].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else throw new Error("empty");
    } catch {
      setPastBookings([
        { id: 'mock-b1', serviceType: 'PLUMBER', status: 'COMPLETED', date: new Date(Date.now()-172800000).toISOString(), address: '123 Brigade Road, Bengaluru', pincode:'560001', amount: 1250, worker_name:'Ramesh Kumar', worker_phone:'+919876543210', worker_tier:'SKILLED', worker_iti_certified:true, worker_rating:4.8, otp_code:'826451', customer_rating:4 },
        { id: 'mock-b2', serviceType: 'AC_REPAIR', status: 'ACCEPTED', date: new Date(Date.now()-3600000).toISOString(), address: 'Indiranagar Phase 2, Bengaluru', pincode:'560038', amount: 600, worker_name:'Suresh Patel', worker_phone:'+919988776655', worker_tier:'EXPERT', worker_iti_certified:true, worker_rating:4.5, otp_code:'194832', customer_rating:null },
      ]);
    } finally { setLoading(false); }
  };

  const activeCount = pastBookings.filter(b =>
    ['SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','PAYMENT_PENDING','PAYMENT_CLAIMED'].includes(b.status)
  ).length;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground transition-colors duration-300">

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-background border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 flex items-center justify-center bg-foreground rounded text-background font-black tracking-tighter text-lg border border-border mr-1">FN</div>
          <span className="font-extrabold text-xl tracking-tight text-foreground uppercase">FixNow</span>
        </Link>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {activeCount} Active
            </span>
          )}
          <button onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 border border-border px-3 py-1.5 rounded-full bg-card hover:bg-muted transition-colors cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-background font-bold text-xs uppercase">
              {user?.name?.[0] || 'U'}
            </div>
            <span className="font-semibold text-sm text-foreground hidden sm:block">{user?.name?.split(' ')[0] || 'Account'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-secondary border-r border-border hidden md:flex flex-col shrink-0">
          <nav className="flex-1 p-4 space-y-1">
            {[
              { key: 'bookings', label: 'My Bookings', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
              { key: 'profile',  label: 'Profile',      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
            ].map(item => (
              <button key={item.key} onClick={() => setActiveTab(item.key as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === item.key ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}>
                {item.icon}
                {item.label}
                {item.key === 'bookings' && activeCount > 0 && (
                  <span className="ml-auto text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{activeCount}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-background">
          <div className="max-w-3xl mx-auto">

            {/* ── Bookings Tab ── */}
            {activeTab === 'bookings' && (
              <div className="animate-in fade-in">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-2xl font-extrabold text-foreground">My Bookings</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Track and manage all your service requests</p>
                  </div>
                  <Link href="/"
                    className="flex items-center gap-2 bg-foreground text-background text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-foreground/90 transition-colors shadow-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                    New Booking
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse flex gap-4">
                        <div className="w-11 h-11 rounded-xl bg-muted shrink-0" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-4 bg-muted rounded w-1/3" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pastBookings.length === 0 ? (
                  <div className="text-center py-20 bg-card border border-border rounded-3xl shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    </div>
                    <p className="text-muted-foreground font-medium text-sm mb-5">No bookings yet</p>
                    <Link href="/" className="inline-block bg-foreground text-background font-bold text-sm px-6 py-3 rounded-xl hover:bg-foreground/90 transition-colors shadow-sm">Book a Service</Link>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
                    {pastBookings.map((booking: any) => {
                      const cfg = STATUS_CONFIG[booking.status] || { label: booking.status, cls: 'bg-muted text-muted-foreground border-border' };
                      const isActive = ['SEARCHING','ACCEPTED','ARRIVED','IN_PROGRESS','PAYMENT_PENDING','PAYMENT_CLAIMED'].includes(booking.status);
                      const dateStr = booking.date
                        ? (() => { const d = new Date(booking.date); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); })()
                        : '';

                      return (
                        <button key={booking.id} onClick={() => setSelectedBooking(booking)}
                          className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group">
                          {/* Service icon */}
                          <div className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                            <ServiceIcon type={booking.serviceType} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-bold text-foreground">{booking.serviceType.replace(/_/g, ' ')}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
                            </div>
                            {booking.worker_name && (
                              <p className="text-xs text-muted-foreground font-medium truncate">Worker: {booking.worker_name}</p>
                            )}
                            {booking.customer_rating && (
                              <div className="mt-1">
                                <StarsDisplay value={booking.customer_rating} size="xs" />
                              </div>
                            )}
                          </div>

                          {/* Right side */}
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-sm font-extrabold text-foreground">₹{Number(booking.amount||0).toFixed(0)}</span>
                            {dateStr && <span className="text-xs text-muted-foreground">{dateStr}</span>}
                            {isActive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                            <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Profile Tab ── */}
            {activeTab === 'profile' && (
              <div className="animate-in fade-in max-w-xl">
                <div className="mb-8">
                  <h1 className="text-2xl font-extrabold text-foreground">Profile</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage your account details</p>
                </div>

                <div className="mb-6">
                  <LanguageSwitcher />
                </div>

                {/* Avatar card */}
                <div className="flex items-center gap-5 p-6 bg-card border border-border rounded-2xl mb-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center text-background text-2xl font-extrabold shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-extrabold text-foreground text-lg">{user?.name || 'Customer'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.phone}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full mt-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      Verified
                    </span>
                  </div>
                </div>

                {/* Edit form */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
                  <div className="p-5">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Full Name</label>
                    <input type="text" defaultValue={user?.name} id="profileName"
                      className="w-full bg-transparent text-sm font-semibold text-foreground border-0 p-0 focus:ring-0 placeholder:text-muted-foreground"
                      placeholder="Enter your name" />
                  </div>
                  <div className="p-5">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Phone Number</label>
                    <input type="text" defaultValue={user?.phone} id="profilePhone"
                      className="w-full bg-transparent text-sm font-semibold text-foreground border-0 p-0 focus:ring-0 placeholder:text-muted-foreground"
                      placeholder="Enter phone number" />
                  </div>
                  <div className="p-4">
                    <button
                      onClick={async () => {
                        const name  = (document.getElementById('profileName')  as HTMLInputElement).value;
                        const phone = (document.getElementById('profilePhone') as HTMLInputElement).value;
                        try {
                          const res = await api.put('/users/profile', { name, phone }, { headers: { Authorization: `Bearer ${token}` } });
                          useAuthStore.getState().setAuth(token!, res.data.user);
                          alert("Profile updated.");
                        } catch { alert("Failed to update profile."); }
                      }}
                      className="w-full bg-foreground text-background font-bold text-sm py-3 rounded-xl hover:bg-foreground/90 transition-colors shadow-sm">
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Sign out */}
                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 border border-border rounded-2xl text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail panel */}
      {selectedBooking && (
        <JobDetailPanel
          booking={selectedBooking}
          token={token!}
          onClose={() => setSelectedBooking(null)}
          onRefresh={() => { fetchPastBookings(); setSelectedBooking(null); }}
        />
      )}
    </div>
  );
}
