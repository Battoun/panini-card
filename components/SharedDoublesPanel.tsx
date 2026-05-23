'use client';

import { useMemo } from 'react';
import { ALL_STICKERS, STICKERS_BY_ID, TEAMS, STICKERS_BY_TEAM, GROUPS } from '../data/album';

interface Props {
  sharedDoubles: Record<number, number>; // stickerId → extra count
  onClose: () => void;
}

export function SharedDoublesPanel({ sharedDoubles, onClose }: Props) {
  const total = useMemo(() =>
    Object.values(sharedDoubles).reduce((acc, v) => acc + v, 0),
  [sharedDoubles]);

  const sections = useMemo(() => {
    const result: { label: string; flag?: string; items: { displayId: string; name: string; count: number }[] }[] = [];

    // Spéciales FWC
    const fwc = ALL_STICKERS
      .filter((s) => !s.teamId && !s.displayId.startsWith('CC') && sharedDoubles[s.id])
      .map((s) => ({ displayId: s.displayId, name: s.name, count: sharedDoubles[s.id] }));
    if (fwc.length > 0) result.push({ label: 'Spéciales', items: fwc });

    // Équipes par groupe
    for (const g of GROUPS) {
      for (const team of TEAMS.filter((t) => t.group === g)) {
        const items = (STICKERS_BY_TEAM[team.id] ?? [])
          .filter((s) => sharedDoubles[s.id])
          .map((s) => ({ displayId: s.displayId, name: s.name, count: sharedDoubles[s.id] }));
        if (items.length > 0) result.push({ label: team.name, flag: team.flag, items });
      }
    }

    // Coca-Cola
    const cc = ALL_STICKERS
      .filter((s) => s.displayId.startsWith('CC') && sharedDoubles[s.id])
      .map((s) => ({ displayId: s.displayId, name: s.name, count: sharedDoubles[s.id] }));
    if (cc.length > 0) result.push({ label: 'Coca-Cola', items: cc });

    return result;
  }, [sharedDoubles]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100">Doubles partagés</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{total} vignette{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''} à l'échange</p>
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sections.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">Aucun double dans ce lien.</p>
          ) : sections.map(({ label, flag, items }) => (
            <div key={label}>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                {flag && <span className="mr-1">{flag}</span>}{label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {items.map(({ displayId, name, count }) => (
                  <div
                    key={displayId}
                    title={name}
                    className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-2 py-1"
                  >
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{displayId}</span>
                    {count > 1 && (
                      <span className="bg-orange-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        ×{count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
