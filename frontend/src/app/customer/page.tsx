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
      setPastBookings(res.data.data);
    } catch (e) {
      console.error("Failed to fetch bookings", e);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-zinc-900">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-zinc-200 shrink-0">
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-zinc-900 uppercase">FixNow</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border border-zinc-200 pl-1 pr-4 py-1 rounded-full">
            <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold text-xs uppercase">
              {user?.name?.[0] || 'U'}
            </div>
            <span className="font-semibold text-sm text-zinc-800">{user?.name || 'Customer'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-zinc-50 border-r border-zinc-200 hidden md:flex flex-col shrink-0">
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            <button 
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors rounded-xl ${activeTab === 'bookings' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              My Bookings
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors rounded-xl ${activeTab === 'profile' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Profile
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'bookings' && (
              <div>
                <h2 className="text-2xl font-extrabold text-zinc-900 mb-8">Past Bookings</h2>
                <div className="space-y-4">
                  {pastBookings.length === 0 ? (
                    <div className="text-center py-16 border-2 border-zinc-200 rounded-3xl bg-zinc-50 shadow-sm">
                      <p className="text-zinc-500 font-medium text-sm">No past bookings found.</p>
                      <Link href="/" className="mt-4 inline-block bg-zinc-900 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-full hover:bg-black transition-colors shadow-sm">Book a Service</Link>
                    </div>
                  ) : (
                    pastBookings.map(b => (
                      <div key={b.id} className="border-2 border-zinc-200 rounded-2xl bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-900 transition-colors shadow-sm hover:shadow-md">
                        <div>
                          <p className="font-bold text-zinc-900 text-lg">{b.serviceType}</p>
                          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mt-1">{new Date(b.date).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${b.status === 'COMPLETED' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                            {b.status}
                          </span>
                          <span className="font-extrabold text-zinc-900 text-xl">₹{b.amount}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-extrabold text-zinc-900 mb-8">My Profile</h2>
                <div className="border-2 border-zinc-200 rounded-3xl bg-white p-8 shadow-sm">
                  <div className="flex items-center gap-6 mb-8 border-b border-zinc-100 pb-8">
                    <div className="w-20 h-20 bg-zinc-100 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-zinc-900 shadow-inner">
                      {user?.name ? user.name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{user?.name || 'Customer Name'}</h3>
                      <p className="text-zinc-500 font-medium text-sm mt-1">{user?.phone}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => { logout(); router.push('/'); }}
                    className="border-2 border-red-200 bg-white hover:bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
