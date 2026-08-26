import { ShieldCheck, Star } from 'lucide-react';

interface WorkerBadgeProps {
  ncctCertified: boolean;
  tier: 'BASIC' | 'SKILLED' | 'EXPERT';
  rating: number;
}

export default function WorkerBadge({ ncctCertified, tier, rating }: WorkerBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {ncctCertified && (
        <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border border-amber-200">
          <ShieldCheck className="w-3 h-3" />
          NCCT Certified
        </span>
      )}
      
      {tier === 'EXPERT' ? (
        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border border-purple-200">
          Expert Pro
        </span>
      ) : tier === 'SKILLED' ? (
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-200">
          Skilled
        </span>
      ) : null}

      {rating > 0 && (
        <span className="flex items-center gap-0.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
