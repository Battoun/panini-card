'use client';

import { useState, useMemo } from 'react';
import { ALL_STICKERS, TOTAL_BASE, TEAMS, STICKERS_BY_TEAM, GROUPS } from '../data/album';
import { CollectionData } from '../types';

interface Profile { id: string; username: string }

interface StickerItem  { id: number; displayId: string; name: string }
interface ExchangeSection { label: string; flag?: string; items: StickerItem[] }

interface Props {
  friend: Profile;
  collection: CollectionData | null;
  myCopies: Record<number, number>;
  onClose: () => void;
}

type Tab = 'stats' | 'exchanges';

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500'];

function buildSections(predicate: (s: typeof ALL_STICKERS[0]) => boolean): ExchangeSection[] {
  const result: ExchangeSection[] = [];
  const fwc = ALL_STICKERS.filter((s) => !s.teamId && !s.displayId.startsWith('CC') && predicate(s))
    .map((s) => ({ id: s.id, displayId: s.displayId, name: s.name }));
  if (fwc.length > 0) result.push({ label: 'Spéciales', items: fwc });
  for (const g of GROUPS) {
    for (const team of TEAMS.filter((t) => t.group === g)) {
      const items = (STICKERS_BY_TEAM[team.id] ?? []).filter(predicate)
        .map((s) => ({ id: s.id, displayId: s.displayId, name: s.name }));
      if (items.length > 0) result.push({ label: team.name, flag: team.flag, items });
    }
  }
  const cc = ALL_STICKERS.filter((s) => s.displayId.startsWith('CC') && predicate(s))
    .map((s) => ({ id: s.id, displayId: s.displayId, name: s.name }));
  if (cc.length > 0) result.push({ label: 'Coca-Cola', items: cc });
  return result;
}

function computeStats(collection: CollectionData | null) {
  if (!collection) return null;
  const copies     = collection.copies ?? {};
  const collected  = Object.values(copies).filter((v) => v >= 1).length;
  const totalDoubles = Object.values(copies).reduce((acc, v) => acc + Math.max(0, v - 1), 0);
  const pctBase    = Math.round((collected / TOTAL_BASE) * 100);
  const teamStats  = TEAMS.map((team) => {
    const stickers = STICKERS_BY_TEAM[team.id] ?? [];
    const c   = stickers.filter((s) => (copies[s.id] ?? 0) >= 1).length;
    const pct = stickers.length > 0 ? Math.round((c / stickers.length) * 100) : 0;
    return { team, collected: c, total: stickers.length, pct };
  });
  const top5      = [...teamStats].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const completed = teamStats.filter((t) => t.pct === 100);
  return { collected, totalDoubles, pctBase, top5, completed };
}

export function FriendDetailModal({ friend, collection, myCopies, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('stats');

  const stats       = computeStats(collection);
  const avatarColor = AVATAR_COLORS[friend.username.charCodeAt(0) % AVATAR_COLORS.length];
  const friendCopies = collection?.copies ?? {};

  // Échanges : ce que l'ami peut me donner (ses doubles que je n'ai pas)
  const canReceive = useMemo(() =>
    buildSections((s) => (friendCopies[s.id] ?? 0) >= 2 && (myCopies[s.id] ?? 0) === 0),
  [friendCopies, myCopies]);

  // Échanges : ce que je peux lui donner (mes doubles qu'il n'a pas)
  const canGive = useMemo(() =>
    buildSections((s) => (myCopies[s.id] ?? 0) >= 2 && (friendCopies[s.id] ?? 0) === 0),
  [myCopies, friendCopies]);

  const receiveCount = canReceive.reduce((a, s) => a + s.items.length, 0);
  const giveCount    = canGive.reduce((a, s) => a + s.items.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-sm font-black text-white shrink-0`}>
            {friend.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 dark:text-gray-100">@{friend.username}</p>
            {stats && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{stats.collected} vignettes · {stats.pctBase}% de l'album</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-4">
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')}>Statistiques</TabBtn>
          <TabBtn active={tab === 'exchanges'} onClick={() => setTab('exchanges')}>
            🔄 Échanges
            {(receiveCount > 0 || giveCount > 0) && (
              <span className="ml-1.5 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {receiveCount + giveCount}
              </span>
            )}
          </TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Stats ── */}
          {tab === 'stats' && (
            <>
              {!collection ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">
                  Cet ami n'a pas encore synchronisé sa collection.
                </p>
              ) : stats && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                    <div className="flex items-end justify-between mb-1.5">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Progression</span>
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.pctBase}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div className="h-full bg-linear-to-r from-blue-500 to-green-400 rounded-full transition-all duration-500" style={{ width: `${stats.pctBase}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{stats.collected} / {TOTAL_BASE} standards</span>
                      <span>{stats.totalDoubles} doubles</span>
                    </div>
                  </div>

                  {stats.completed.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Équipes complètes ({stats.completed.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.completed.map(({ team }) => (
                          <span key={team.id} className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                            {team.flag} {team.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🏆 Top 5 équipes</p>
                    <div className="space-y-2.5">
                      {stats.top5.map(({ team, collected, total, pct }, i) => (
                        <div key={team.id} className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                          <span className="text-base leading-none shrink-0">{team.flag}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{team.name}</span>
                              <span className="text-xs font-bold text-green-600 dark:text-green-400 ml-1 shrink-0">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">{collected}/{total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Échanges ── */}
          {tab === 'exchanges' && (
            <>
              {!collection ? (
                <p className="text-sm text-gray-400 italic text-center py-6">
                  Cet ami n'a pas synchronisé sa collection — impossible de calculer les échanges.
                </p>
              ) : (
                <>
                  {/* Ce que je peux recevoir */}
                  <div>
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      ↓ Il peut me donner
                      <span className="bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full text-[10px] font-black">{receiveCount}</span>
                    </p>
                    {receiveCount === 0 ? (
                      <p className="text-xs text-gray-400 italic">Aucune carte disponible.</p>
                    ) : canReceive.map(({ label, flag, items }) => (
                      <div key={label} className="mb-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                          {flag && <span className="mr-1">{flag}</span>}{label}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {items.map((item) => (
                            <span key={item.id} title={item.name}
                              className="text-xs font-bold rounded-lg px-2 py-0.5 border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-gray-700 dark:text-gray-200">
                              {item.displayId}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <hr className="border-gray-100 dark:border-gray-700" />

                  {/* Ce que je peux donner */}
                  <div>
                    <p className="text-xs font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      ↑ Je peux lui donner
                      <span className="bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-full text-[10px] font-black">{giveCount}</span>
                    </p>
                    {giveCount === 0 ? (
                      <p className="text-xs text-gray-400 italic">Aucune carte disponible.</p>
                    ) : canGive.map(({ label, flag, items }) => (
                      <div key={label} className="mb-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                          {flag && <span className="mr-1">{flag}</span>}{label}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {items.map((item) => (
                            <span key={item.id} title={item.name}
                              className="text-xs font-bold rounded-lg px-2 py-0.5 border bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-gray-700 dark:text-gray-200">
                              {item.displayId}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={[
        'py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center',
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
      ].join(' ')}>
      {children}
    </button>
  );
}
