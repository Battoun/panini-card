'use client';

import { TOTAL_STICKERS, TOTAL_BASE } from '../data/album';
import { ThemeToggle } from './ThemeToggle';
import { AuthButton } from './AuthButton';

interface Props {
  collected: number;
  collectedBase: number;
  doubles: number;
  totalDoubles: number;
}

export function StatsBar({ collected, collectedBase, doubles, totalDoubles }: Props) {
  const pct = Math.round((collectedBase / TOTAL_BASE) * 100);
  const missing = TOTAL_STICKERS - collected;

  return (
    <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-xs text-blue-200 uppercase tracking-wide font-semibold">FIFA World Cup 2026</p>
            <p className="text-lg font-bold leading-tight">Mon album Panini</p>
          </div>
          <div className="flex gap-4 ml-auto flex-wrap items-center">
            <Stat label="Collées"      value={collected}    total={TOTAL_STICKERS} color="text-green-300" />
            <Stat label="Manquantes"   value={missing}                             color="text-red-300"   />
            <Stat label="En double"    value={doubles}                             color="text-orange-300"/>
            <Stat label="Total doubles" value={totalDoubles}                       color="text-yellow-300"/>
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
        <div className="mt-2 h-2 bg-blue-900/60 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-blue-200 mt-0.5">{pct}% standards – {collectedBase}/{TOTAL_BASE} vignettes · {collected}/{TOTAL_STICKERS} au total</p>
      </div>
    </div>
  );
}

function Stat({ label, value, total, color }: { label: string; value: number; total?: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold leading-none ${color}`}>{value}{total ? `/${total}` : ''}</p>
      <p className="text-[10px] text-blue-200 uppercase tracking-wide">{label}</p>
    </div>
  );
}
