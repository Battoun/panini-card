'use client';

import { useState, useMemo } from 'react';
import { ALL_STICKERS, TOTAL_BASE, TOTAL_STICKERS, TEAMS, STICKERS_BY_TEAM, GROUPS } from '../data/album';
import { CollectionData } from '../types';

interface Profile { id: string; username: string }
interface StickerItem  { id: number; displayId: string; name: string }
interface ExchangeSection { label: string; flag?: string; items: StickerItem[] }

interface Props {
  friend: Profile;
  collection: CollectionData | null;
  myCopies: Record<number, number>;
  myPacks: number;
  onClose: () => void;
}

type Tab = 'stats' | 'compare' | 'exchanges';

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500'];
const PACK_PRICE = 1.5;

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

function getStats(copies: Record<number, number>, packs: number) {
  const collected     = Object.values(copies).filter((v) => v >= 1).length;
  const totalDoubles  = Object.values(copies).reduce((acc, v) => acc + Math.max(0, v - 1), 0);
  const pctBase       = Math.round((collected / TOTAL_BASE) * 100);
  const missing       = TOTAL_STICKERS - collected;
  const spent         = +(packs * PACK_PRICE).toFixed(2);
  const costPerCard   = collected > 0 && packs > 0 ? +(spent / collected).toFixed(2) : null;
  const completedTeams = TEAMS.filter((team) => {
    const stickers = STICKERS_BY_TEAM[team.id] ?? [];
    return stickers.length > 0 && stickers.every((s) => (copies[s.id] ?? 0) >= 1);
  }).length;
  return { collected, totalDoubles, pctBase, missing, packs, spent, costPerCard, completedTeams };
}

export function FriendDetailModal({ friend, collection, myCopies, myPacks, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('stats');

  const avatarColor  = AVATAR_COLORS[friend.username.charCodeAt(0) % AVATAR_COLORS.length];
  const friendCopies = collection?.copies ?? {};
  const friendPacks  = collection?.packs  ?? 0;

  const myStats     = useMemo(() => getStats(myCopies, myPacks), [myCopies, myPacks]);
  const friendStats = useMemo(() => getStats(friendCopies, friendPacks), [friendCopies, friendPacks]);

  // Échanges
  const canReceive = useMemo(() =>
    buildSections((s) => (friendCopies[s.id] ?? 0) >= 2 && (myCopies[s.id] ?? 0) === 0),
  [friendCopies, myCopies]);
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
            {collection && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{friendStats.collected} vignettes · {friendStats.pctBase}% de l'album</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-2 overflow-x-auto">
          <TabBtn active={tab === 'stats'}     onClick={() => setTab('stats')}>Stats</TabBtn>
          <TabBtn active={tab === 'compare'}   onClick={() => setTab('compare')}>⚔️ Versus</TabBtn>
          <TabBtn active={tab === 'exchanges'} onClick={() => setTab('exchanges')}>
            🔄 Échanges
            {(receiveCount + giveCount) > 0 && (
              <span className="ml-1.5 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {receiveCount + giveCount}
              </span>
            )}
          </TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Stats ── */}
          {tab === 'stats' && (
            !collection ? (
              <p className="text-sm text-gray-400 italic text-center py-6">Collection non synchronisée.</p>
            ) : (
              <>
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                  <div className="flex items-end justify-between mb-1.5">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Progression</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{friendStats.pctBase}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-blue-500 to-green-400 rounded-full" style={{ width: `${friendStats.pctBase}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>{friendStats.collected} / {TOTAL_BASE} standards</span>
                    <span>{friendStats.totalDoubles} doubles</span>
                  </div>
                </div>

                {friendStats.completedTeams > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Équipes complètes ({friendStats.completedTeams})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {TEAMS.filter((team) => {
                        const s = STICKERS_BY_TEAM[team.id] ?? [];
                        return s.length > 0 && s.every((st) => (friendCopies[st.id] ?? 0) >= 1);
                      }).map((team) => (
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
                    {[...TEAMS.map((team) => {
                      const stickers = STICKERS_BY_TEAM[team.id] ?? [];
                      const c   = stickers.filter((s) => (friendCopies[s.id] ?? 0) >= 1).length;
                      const pct = stickers.length > 0 ? Math.round((c / stickers.length) * 100) : 0;
                      return { team, collected: c, total: stickers.length, pct };
                    })].sort((a, b) => b.pct - a.pct).slice(0, 5).map(({ team, collected, total, pct }, i) => (
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
            )
          )}

          {/* ── Versus / Comparaison ── */}
          {tab === 'compare' && (
            !collection ? (
              <p className="text-sm text-gray-400 italic text-center py-6">Collection non synchronisée — impossible de comparer.</p>
            ) : (
              <>
                {/* Avatars VS */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-base">Moi</div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Toi</span>
                  </div>
                  <span className="text-2xl font-black text-gray-300 dark:text-gray-600">VS</span>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center text-white font-black text-xs`}>
                      {friend.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-20 text-center">@{friend.username}</span>
                  </div>
                </div>

                {/* Lignes de stats */}
                <div className="space-y-2">
                  <CompareRow
                    label="Album %"
                    myVal={myStats.pctBase}
                    friendVal={friendStats.pctBase}
                    format={(v) => `${v}%`}
                    higherIsBetter
                  />
                  <CompareRow
                    label="Vignettes collées"
                    myVal={myStats.collected}
                    friendVal={friendStats.collected}
                    format={(v) => String(v)}
                    higherIsBetter
                  />
                  <CompareRow
                    label="Manquantes"
                    myVal={myStats.missing}
                    friendVal={friendStats.missing}
                    format={(v) => String(v)}
                    higherIsBetter={false}
                  />
                  <CompareRow
                    label="Total doubles"
                    myVal={myStats.totalDoubles}
                    friendVal={friendStats.totalDoubles}
                    format={(v) => String(v)}
                    higherIsBetter={false}
                  />
                  <CompareRow
                    label="Équipes complètes"
                    myVal={myStats.completedTeams}
                    friendVal={friendStats.completedTeams}
                    format={(v) => String(v)}
                    higherIsBetter
                  />
                  {myStats.packs > 0 && friendStats.packs > 0 && (
                    <>
                      <CompareRow
                        label="Paquets ouverts"
                        myVal={myStats.packs}
                        friendVal={friendStats.packs}
                        format={(v) => String(v)}
                        higherIsBetter={false}
                        neutral
                      />
                      <CompareRow
                        label="Budget dépensé"
                        myVal={myStats.spent}
                        friendVal={friendStats.spent}
                        format={(v) => `${v} €`}
                        higherIsBetter={false}
                        neutral
                      />
                      {myStats.costPerCard != null && friendStats.costPerCard != null && (
                        <CompareRow
                          label="Coût / vignette"
                          myVal={myStats.costPerCard}
                          friendVal={friendStats.costPerCard}
                          format={(v) => `${v} €`}
                          higherIsBetter={false}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Résumé */}
                <WinnerBanner myStats={myStats} friendStats={friendStats} friendUsername={friend.username} />
              </>
            )
          )}

          {/* ── Échanges ── */}
          {tab === 'exchanges' && (
            !collection ? (
              <p className="text-sm text-gray-400 italic text-center py-6">Collection non synchronisée.</p>
            ) : (
              <>
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
            )
          )}

        </div>
      </div>
    </div>
  );
}

// ── Composants utilitaires ──────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={[
        'py-2.5 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center whitespace-nowrap',
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
      ].join(' ')}>
      {children}
    </button>
  );
}

function CompareRow({ label, myVal, friendVal, format, higherIsBetter, neutral }: {
  label: string;
  myVal: number;
  friendVal: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
  neutral?: boolean;
}) {
  const iWin    = higherIsBetter ? myVal > friendVal : myVal < friendVal;
  const theyWin = higherIsBetter ? friendVal > myVal  : friendVal < myVal;
  const tied    = myVal === friendVal;

  const myColor     = neutral ? 'text-gray-700 dark:text-gray-200' : tied ? 'text-gray-500 dark:text-gray-400' : iWin ? 'text-green-600 dark:text-green-400 font-black' : 'text-red-500 dark:text-red-400';
  const friendColor = neutral ? 'text-gray-700 dark:text-gray-200' : tied ? 'text-gray-500 dark:text-gray-400' : theyWin ? 'text-green-600 dark:text-green-400 font-black' : 'text-red-500 dark:text-red-400';

  const total    = myVal + friendVal;
  const myPct    = total > 0 ? (myVal / total) * 100 : 50;

  return (
    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide text-center mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <span className={`text-base font-bold w-16 text-right shrink-0 ${myColor}`}>{format(myVal)}</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${neutral ? 'bg-gray-400' : tied ? 'bg-gray-400' : iWin ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${myPct}%` }}
          />
        </div>
        <span className={`text-base font-bold w-16 text-left shrink-0 ${friendColor}`}>{format(friendVal)}</span>
      </div>
      {!neutral && !tied && (
        <p className="text-[10px] text-center mt-1.5 font-semibold">
          {iWin
            ? <span className="text-green-600 dark:text-green-400">✓ Tu mènes</span>
            : <span className="text-red-500 dark:text-red-400">Il mène</span>}
        </p>
      )}
    </div>
  );
}

function WinnerBanner({ myStats, friendStats, friendUsername }: {
  myStats: ReturnType<typeof getStats>;
  friendStats: ReturnType<typeof getStats>;
  friendUsername: string;
}) {
  let myScore = 0;
  if (myStats.pctBase > friendStats.pctBase) myScore++;
  else if (myStats.pctBase < friendStats.pctBase) myScore--;
  if (myStats.completedTeams > friendStats.completedTeams) myScore++;
  else if (myStats.completedTeams < friendStats.completedTeams) myScore--;
  if (myStats.missing < friendStats.missing) myScore++;
  else if (myStats.missing > friendStats.missing) myScore--;

  if (myScore === 0) return (
    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 text-center">
      <p className="text-2xl mb-1">🤝</p>
      <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">Égalité parfaite !</p>
    </div>
  );
  const iWin = myScore > 0;
  return (
    <div className={`rounded-xl p-4 text-center ${iWin ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700'}`}>
      <p className="text-2xl mb-1">{iWin ? '🏆' : '📈'}</p>
      <p className={`font-bold text-sm ${iWin ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
        {iWin ? 'Tu as une meilleure collection !' : `@${friendUsername} est en avance sur toi !`}
      </p>
    </div>
  );
}
