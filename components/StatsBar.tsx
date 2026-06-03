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
  const pct     = Math.round((collectedBase / TOTAL_BASE) * 100);
  const missing = TOTAL_STICKERS - collected;

  return (
    <div className="w-full bg-linear-to-r from-blue-700 to-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-2">

        {/* Ligne 1 : titre + boutons */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-[10px] text-blue-200 uppercase tracking-wide font-semibold leading-none">FIFA World Cup 2026</p>
            <p className="text-base font-bold leading-tight truncate">Mon album Panini</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>

        {/* Ligne 2 : stats en grille 4 colonnes */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          <Stat label="Collées"       value={`${collected}/${TOTAL_STICKERS}`} color="text-green-300"  />
          <Stat label="Manquantes"    value={String(missing)}                   color="text-red-300"   />
          <Stat label="En double"     value={String(doubles)}                   color="text-orange-300"/>
          <Stat label="Total doubles"  value={String(totalDoubles)}              color="text-yellow-300"/>
        </div>

        {/* Ligne 3 : barre de progression */}
        <div className="h-1.5 bg-blue-900/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-blue-200 mt-0.5">
          {pct}% standards — {collectedBase}/{TOTAL_BASE} · {collected}/{TOTAL_STICKERS} au total
        </p>

      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-black leading-none ${color}`}>{value}</p>
      <p className="text-[9px] text-blue-200 uppercase tracking-wide mt-0.5 leading-none">{label}</p>
    </div>
  );
}
