import Link from 'next/link';
import { ThermometerSnowflake, SprayCan, Wrench, Zap, Hammer, Paintbrush, Bug, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fafafc] font-sans text-slate-900 selection:bg-purple-500/30">
      
      {/* Premium Apple-like Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">FixNow</span>
            </div>
            
            {/* Location Selector */}
            <button className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors">
              <span className="text-lg">📍</span> Bangalore, IN <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/worker/login" className="hidden md:flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mr-4">
              Register as Professional
            </Link>
            <Link href="/customer/login" className="flex items-center justify-center h-10 px-6 rounded-full bg-slate-900 text-white font-semibold text-sm hover:scale-105 transition-transform duration-300 shadow-[0_4px_14px_rgba(0,0,0,0.1)]">
              Login / Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Search Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Soft Ambient Background Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-400/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Home services, <br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">on demand.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 font-medium">
            Book verified professionals for cleaning, repair, and maintenance instantly.
          </p>

          {/* Premium iOS-style Search Bar */}
          <div className="max-w-2xl mx-auto bg-white p-2 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 flex items-center transition-shadow hover:shadow-[0_8px_40px_rgb(0,0,0,0.1)]">
            <div className="pl-6 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search for 'AC Repair', 'Plumber'..." 
              className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-lg font-medium text-slate-700 placeholder:text-slate-400"
            />
            <button className="bg-slate-900 text-white h-14 px-8 rounded-[20px] font-bold text-base hover:bg-slate-800 transition-colors">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Service Categories Grid */}
      <section className="pb-24 px-6 max-w-[1200px] mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">What services we provide</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { name: "AC Repair", icon: <ThermometerSnowflake className="w-8 h-8 drop-shadow-sm" />, color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
            { name: "Cleaning", icon: <SprayCan className="w-8 h-8 drop-shadow-sm" />, color: "bg-blue-50 text-blue-600 border-blue-100" },
            { name: "Plumbing", icon: <Wrench className="w-8 h-8 drop-shadow-sm" />, color: "bg-orange-50 text-orange-600 border-orange-100" },
            { name: "Electrician", icon: <Zap className="w-8 h-8 drop-shadow-sm" />, color: "bg-yellow-50 text-yellow-600 border-yellow-100" },
            { name: "Carpentry", icon: <Hammer className="w-8 h-8 drop-shadow-sm" />, color: "bg-stone-50 text-stone-600 border-stone-100" },
            { name: "Painting", icon: <Paintbrush className="w-8 h-8 drop-shadow-sm" />, color: "bg-purple-50 text-purple-600 border-purple-100" },
            { name: "Pest Control", icon: <Bug className="w-8 h-8 drop-shadow-sm" />, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
            { name: "View All", icon: <Sparkles className="w-8 h-8 drop-shadow-sm" />, color: "bg-slate-50 text-slate-600 border-slate-200" },
          ].map((service, i) => (
            <Link href="/customer/login" key={i} className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center cursor-pointer">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 border ${service.color} group-hover:scale-110 transition-transform duration-300`}>
                {service.icon}
              </div>
              <h3 className="font-semibold text-slate-800">{service.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Choose FixNow (Trust Banner) */}
      <section className="py-20 bg-white border-t border-slate-100 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Verified Professionals</h3>
            <p className="text-slate-500 font-medium">Every partner is background-checked and rated by the community.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Instant Dispatch</h3>
            <p className="text-slate-500 font-medium">Our AI matches you with the closest available expert in seconds.</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Transparent Pricing</h3>
            <p className="text-slate-500 font-medium">No hidden fees. Digital invoices are generated by AI directly from receipts.</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#fafafc] border-t border-slate-200 py-10 px-6 text-center">
        <p className="text-sm font-semibold text-slate-400">
          &copy; 2026 FixNow Platform. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
