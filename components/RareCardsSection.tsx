'use client';

import { RareCards, RareRarity } from '../types';

interface Props {
  rareCards: RareCards;
  onSet: (rarity: RareRarity, count: number) => void;
}

const RARITIES: { key: RareRarity; label: string; icon: string; bg: string; text: string; border: string; iconBg: string }[] = [
  {
    key: 'regular', label: 'Regular', icon: '⚪',
    bg: 'bg-gray-50 dark:bg-gray-800/60',
    border: 'border-gray-200 dark:border-gray-600',
    text: 'text-gray-600 dark:text-gray-300',
    iconBg: 'bg-gray-200 dark:bg-gray-600',
  },
  {
    key: 'bronze', label: 'Bronze', icon: '🥉',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  {
    key: 'silver', label: 'Argent', icon: '🥈',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    border: 'border-slate-300 dark:border-slate-500',
    text: 'text-slate-600 dark:text-slate-300',
    iconBg: 'bg-slate-200 dark:bg-slate-600',
  },
  {
    key: 'gold', label: 'Or', icon: '🥇',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-600',
    text: 'text-yellow-700 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
  },
];

export function RareCardsSection({ rareCards, onSet }: Props) {
  const total = Object.values(rareCards).reduce((a, b) => a + b, 0);

  return (
    <section className="mt-6 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold text-sm shrink-0">
          ✦
        </div>
        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">
          Cartes rares
        </h3>
        {total > 0 && (
          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700">
            {total} au total
          </span>
        )}
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 ml-11">
        Cartes bonus hors album — ne comptent pas dans le % de complétion
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RARITIES.map(({ key, label, icon, bg, border, text, iconBg }) => {
          const count = rareCards[key] ?? 0;
          return (
            <div key={key} className={`${bg} border ${border} rounded-2xl p-3 flex flex-col gap-2`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 ${iconBg} rounded-full flex items-center justify-center text-base shrink-0`}>
                  {icon}
                </div>
                <span className={`text-xs font-bold ${text}`}>{label}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <button
                  onClick={() => onSet(key, count - 1)}
                  disabled={count <= 0}
                  className={`w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center disabled:opacity-30 transition-colors ${iconBg} ${text}`}
                >−</button>
                <span className={`text-2xl font-black ${text} leading-none`}>{count}</span>
                <button
                  onClick={() => onSet(key, count + 1)}
                  className={`w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition-colors ${iconBg} ${text}`}
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
