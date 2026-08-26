"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  
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
    <div className="min-h-screen bg-[#FDF2F8] flex flex-col font-sans">
      {/* Header */}
      <header className="h-[72px] flex items-center justify-between px-8 bg-white border-b border-pink-100 shadow-sm shrink-0">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900">FixNow</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-full px-4 py-1.5 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-black text-xs">
              {user?.name?.[0].toUpperCase() || 'U'}
            </div>
            <span className="font-bold text-sm text-slate-800">{user?.name || 'Customer'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-pink-100 hidden md:flex flex-col shrink-0">
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            <button 
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'bookings' ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              My Bookings
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              Profile
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'bookings' && (
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Past Bookings</h2>
                <div className="space-y-4">
                  {pastBookings.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-pink-100 shadow-sm">
                      <p className="text-slate-500 font-medium text-lg">No past bookings found.</p>
                      <Link href="/" className="mt-4 inline-block bg-pink-50 text-pink-600 font-bold px-6 py-2 rounded-xl">Book a Service</Link>
                    </div>
                  ) : (
                    pastBookings.map(b => (
                      <div key={b.id} className="bg-white rounded-3xl border border-pink-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-black text-slate-800 text-lg">{b.serviceType}</p>
                          <p className="text-slate-500 text-sm font-medium">{new Date(b.date).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide ${b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {b.status}
                          </span>
                          <span className="font-black text-slate-900 text-lg">₹{b.amount}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8">My Profile</h2>
                <div className="bg-white rounded-3xl border border-pink-100 p-8 shadow-sm">
                  <div className="flex items-center gap-6 mb-8 border-b border-slate-100 pb-8">
                    <div className="w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center text-4xl font-black text-pink-500">
                      {user?.name ? user.name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">{user?.name || 'Customer Name'}</h3>
                      <p className="text-slate-500 font-medium">{user?.phone}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => { clearAuth(); router.push('/'); }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
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
