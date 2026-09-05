"use client";

import { useLanguageStore, LANGUAGES } from '@/store/useLanguageStore';

function applyLang(code: string) {
  const domain = window.location.hostname;
  document.cookie = `googtrans=/en/${code}; path=/; domain=${domain}`;
  document.cookie = `googtrans=/en/${code}; path=/`;
  window.location.reload();
}

export default function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang } = useLanguageStore();

  if (compact) {
    return (
      <select
        value={lang}
        onChange={(e) => { setLang(e.target.value); applyLang(e.target.value); }}
        className="text-xs font-bold bg-background border border-border text-foreground px-2 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
        title="Select Language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="bg-card border border-border p-6 rounded-3xl shadow-sm mb-6">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Select Language</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => { setLang(l.code); applyLang(l.code); }}
            className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
              lang === l.code 
                ? 'bg-primary text-primary-foreground border-primary shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                : 'bg-background hover:bg-muted border-border text-foreground hover:shadow-sm'
            }`}
          >
            {l.native}
          </button>
        ))}
      </div>
    </div>
  );
}
