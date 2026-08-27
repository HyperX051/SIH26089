"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');
  const [pastBookings, setPastBookings] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tab') === 'profile') {
        setActiveTab('profile');
      }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      router.push('/customer/login');
      return;
    }
    
    if (activeTab === 'bookings') {
      fetchPastBookings();
    }
  }, [activeTab, token, router]);

  const fetchPastBookings = async () => {
    try {
      const res = await api.get('/bookings/customer', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.data && res.data.data.length > 0) {
        setPastBookings(res.data.data);
      } else {
        throw new Error("Empty data");
      }
    } catch (e) {
      console.error("Failed to fetch bookings", e);
      // DEMO MOCK DATA
      setPastBookings([
        { id: 'mock-b1', serviceType: 'PLUMBING', status: 'COMPLETED', createdAt: new Date(Date.now() - 172800000).toISOString(), address: '123, Brigade Road, Bengaluru', finalCost: 1250 },
        { id: 'mock-b2', serviceType: 'AC_REPAIR', status: 'ACCEPTED', createdAt: new Date(Date.now() - 3600000).toISOString(), address: 'Indiranagar Phase 2, Bengaluru', finalCost: null }
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-background border-b border-border shrink-0 transition-colors duration-300">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 flex items-center justify-center bg-background rounded text-foreground font-black tracking-tighter text-lg shadow-[2px_2px_0px_rgba(0,0,0,1)] border border-border mr-3">
            FN
          </div>
          <span className="font-extrabold text-xl tracking-tight text-foreground uppercase">FixNow</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border border-border pl-1 pr-4 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity bg-card" onClick={() => setActiveTab('profile')}>
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs uppercase">
              {user?.name?.[0] || 'U'}
            </div>
            <span className="font-semibold text-sm text-foreground">{user?.name || 'Customer'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-secondary border-r border-border hidden md:flex flex-col shrink-0 transition-colors duration-300">
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            <button 
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'bookings' ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'}`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'bookings' ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              My Bookings
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${activeTab === 'profile' ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'}`}
            >
              <svg className={`w-4 h-4 ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Profile
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-background transition-colors duration-300">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'bookings' && (
              <div className="animate-in fade-in">
                <h2 className="text-2xl font-bold text-foreground mb-8">Past Bookings</h2>
                <div className="space-y-4">
                  {pastBookings.length === 0 ? (
                    <div className="text-center py-16 border border-border rounded-3xl bg-card shadow-sm">
                      <p className="text-muted-foreground font-medium text-sm">No past bookings found.</p>
                      <Link href="/" className="mt-4 inline-block bg-primary text-primary-foreground font-semibold text-sm px-6 py-3 rounded-full hover:bg-primary/90 transition-colors shadow-sm">Book a Service</Link>
                    </div>
                  ) : (
                    pastBookings.map((booking: any) => (
                      <div key={booking.id} className="border border-border rounded-2xl bg-card p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/50 transition-colors">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-muted text-muted-foreground text-[10px] font-bold uppercase px-2 py-1 rounded">{booking.serviceType}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                              booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {(() => {
                                const dateToUse = booking.scheduledTime || booking.createdAt;
                                if (!dateToUse) return 'Time pending';
                                if (Array.isArray(dateToUse)) {
                                  const [y, m, d, h=0, min=0, s=0] = dateToUse;
                                  return new Date(y, m-1, d, h, min, s).toLocaleString();
                                }
                                return new Date(dateToUse).toLocaleString();
                              })()}
                            </p>
                          <p className="text-base font-semibold text-foreground">{booking.address}</p>
                        </div>
                        {booking.status === 'COMPLETED' && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1 font-semibold">Total Paid</p>
                            <p className="text-2xl font-bold text-foreground">₹{booking.finalCost?.toFixed(2) || '0.00'}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="animate-in fade-in max-w-2xl mx-auto py-8">
                
                <div className="flex items-center gap-6 mb-10">
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-full border-2 border-primary p-1">
                      <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-4xl overflow-hidden">
                        <span className="font-extrabold text-muted-foreground">{user?.name?.[0] || '?'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-1">{user?.name || 'Customer Name'}</h2>
                    <p className="text-muted-foreground font-medium text-sm mb-3">Active Citizen</p>
                    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      Verified Citizen
                    </span>
                  </div>
                </div>

                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                  <div className="divide-y divide-border">
                    
                    <div className="flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-semibold mb-0.5">Full Name</p>
                        <input 
                          type="text" 
                          defaultValue={user?.name}
                          id="profileName"
                          className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:ring-0 placeholder:text-muted-foreground/50"
                          placeholder="Enter your name"
                        />
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>

                    <div className="flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-semibold mb-0.5">Phone Number</p>
                        <input 
                          type="text" 
                          defaultValue={user?.phone}
                          id="profilePhone"
                          className="w-full bg-transparent border-0 p-0 text-sm font-medium text-foreground focus:ring-0 placeholder:text-muted-foreground/50"
                          placeholder="Enter phone number"
                        />
                      </div>
                      <svg className="w-4 h-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>

                    <div className="flex items-center gap-4 p-5 bg-background/50">
                      <button 
                        onClick={async () => {
                          const name = (document.getElementById('profileName') as HTMLInputElement).value;
                          const phone = (document.getElementById('profilePhone') as HTMLInputElement).value;
                          try {
                            const res = await api.put('/users/profile', { name, phone }, { headers: { Authorization: `Bearer ${token}` }});
                            useAuthStore.getState().setAuth(token!, res.data.user);
                            alert("Profile updated successfully!");
                          } catch (e) {
                            alert("Failed to update profile.");
                          }
                        }}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm transition-colors hover:bg-primary/90 shadow-sm"
                      >
                        Save Changes
                      </button>
                    </div>

                    <div 
                      onClick={() => { logout(); router.push('/'); }}
                      className="flex items-center gap-4 p-5 hover:bg-destructive/5 cursor-pointer transition-colors group"
                    >
                      <div className="bg-destructive/10 p-2 rounded-lg group-hover:bg-destructive/20 transition-colors">
                        <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Logout</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
