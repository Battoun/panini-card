'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ALL_STICKERS, TOTAL_BASE, TOTAL_STICKERS, TEAMS, STICKERS_BY_TEAM, GROUPS } from '../data/album';
import { CollectionData } from '../types';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';

interface Profile { id: string; username: string }
interface StickerItem    { id: number; displayId: string; name: string }
interface ExchangeSection { label: string; flag?: string; items: StickerItem[] }
interface ExchangeRequest {
  id: string;
  from_user_id: string;
  give_display_id: string;
  recv_display_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
}

interface Props {
  friend: Profile;
  collection: CollectionData | null;
  myCopies: Record<number, number>;
  myPacks: number;
  onClose: () => void;
  onCollectionUpdated?: () => void;
}

type Tab = 'stats' | 'compare' | 'exchanges' | 'pending';

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
  const collected      = Object.values(copies).filter((v) => v >= 1).length;
  const totalDoubles   = Object.values(copies).reduce((acc, v) => acc + Math.max(0, v - 1), 0);
  const pctBase        = Math.round((collected / TOTAL_BASE) * 100);
  const missing        = TOTAL_STICKERS - collected;
  const spent          = +(packs * PACK_PRICE).toFixed(2);
  const costPerCard    = collected > 0 && packs > 0 ? +(spent / collected).toFixed(2) : null;
  const completedTeams = TEAMS.filter((team) => {
    const s = STICKERS_BY_TEAM[team.id] ?? [];
    return s.length > 0 && s.every((st) => (copies[st.id] ?? 0) >= 1);
  }).length;
  return { collected, totalDoubles, pctBase, missing, packs, spent, costPerCard, completedTeams };
}

export function FriendDetailModal({ friend, collection, myCopies, myPacks, onClose, onCollectionUpdated }: Props) {
  const { user } = useAuth();
  const [tab, setTab]                 = useState<Tab>('stats');
  const [selectedGive, setSelectedGive]     = useState<string | null>(null);
  const [selectedRecv, setSelectedRecv]     = useState<string | null>(null);
  const [proposing, setProposing]     = useState(false);
  const [requests, setRequests]       = useState<ExchangeRequest[]>([]);
  const [reqLoading, setReqLoading]   = useState(false);
  const [actionId, setActionId]       = useState<string | null>(null);

  const avatarColor  = AVATAR_COLORS[friend.username.charCodeAt(0) % AVATAR_COLORS.length];
  const friendCopies = collection?.copies ?? {};
  const friendPacks  = collection?.packs  ?? 0;

  const myStats     = useMemo(() => getStats(myCopies, myPacks),          [myCopies, myPacks]);
  const friendStats = useMemo(() => getStats(friendCopies, friendPacks),  [friendCopies, friendPacks]);

  const canReceive = useMemo(() =>
    buildSections((s) => (friendCopies[s.id] ?? 0) >= 2 && (myCopies[s.id] ?? 0) === 0),
  [friendCopies, myCopies]);
  const canGive = useMemo(() =>
    buildSections((s) => (myCopies[s.id] ?? 0) >= 2 && (friendCopies[s.id] ?? 0) === 0),
  [myCopies, friendCopies]);
  const receiveCount = canReceive.reduce((a, s) => a + s.items.length, 0);
  const giveCount    = canGive.reduce((a, s) => a + s.items.length, 0);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    setReqLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('exchange_requests')
      .select('*')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friend.id}),and(from_user_id.eq.${friend.id},to_user_id.eq.${user.id})`)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });
    setRequests((data as ExchangeRequest[]) ?? []);
    setReqLoading(false);
  }, [user, friend.id]);

  useEffect(() => { if (tab === 'pending') loadRequests(); }, [tab, loadRequests]);

  const pendingCount = requests.length;

  const proposeExchange = async () => {
    if (!user || !selectedGive || !selectedRecv) return;
    setProposing(true);
    const supabase = createClient();
    await supabase.from('exchange_requests').insert({
      from_user_id:    user.id,
      to_user_id:      friend.id,
      give_display_id: selectedGive,
      recv_display_id: selectedRecv,
    });
    setSelectedGive(null);
    setSelectedRecv(null);
    setProposing(false);
    setTab('pending');
    loadRequests();
  };

  const handleAction = async (req: ExchangeRequest, action: 'accepted' | 'rejected' | 'cancelled') => {
    setActionId(req.id);
    const supabase = createClient();

    if (action === 'accepted') {
      // API route : met à jour les deux collections + statut + historique
      const res = await fetch('/api/accept-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id }),
      });
      if (!res.ok) {
        alert('Erreur lors de la validation de l\'échange.');
        setActionId(null);
        return;
      }
      onCollectionUpdated?.(); // rafraîchit la collection locale
    } else if (action === 'cancelled') {
      await supabase.from('exchange_requests').delete().eq('id', req.id);
    } else {
      await supabase.from('exchange_requests').update({ status: action }).eq('id', req.id);
    }

    setActionId(null);
    loadRequests();
  };

  const isMine = (req: ExchangeRequest) => req.from_user_id === user?.id;

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
            {collection && <p className="text-xs text-gray-400">{friendStats.collected} vignettes · {friendStats.pctBase}%</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-1 overflow-x-auto shrink-0">
          <TabBtn active={tab === 'stats'}     onClick={() => setTab('stats')}>Stats</TabBtn>
          <TabBtn active={tab === 'compare'}   onClick={() => setTab('compare')}>⚔️ Versus</TabBtn>
          <TabBtn active={tab === 'exchanges'} onClick={() => setTab('exchanges')}>
            🔄 Échanges
            {(receiveCount + giveCount) > 0 && <Badge n={receiveCount + giveCount} color="bg-blue-600" />}
          </TabBtn>
          <TabBtn active={tab === 'pending'} onClick={() => { setTab('pending'); loadRequests(); }}>
            En attente
            {pendingCount > 0 && <Badge n={pendingCount} color="bg-orange-500" />}
          </TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Stats ── */}
          {tab === 'stats' && (
            !collection ? <NoData /> : (
              <>
                <ProgressCard pct={friendStats.pctBase} collected={friendStats.collected} totalDoubles={friendStats.totalDoubles} />
                <CompletedTeams copies={friendCopies} />
                <Top5 copies={friendCopies} />
              </>
            )
          )}

          {/* ── Versus ── */}
          {tab === 'compare' && (
            !collection ? <NoData /> : (
              <>
                <div className="flex items-center justify-center gap-4 py-2">
                  <PlayerPill label="Toi" color="bg-blue-600" />
                  <span className="text-2xl font-black text-gray-300 dark:text-gray-600">VS</span>
                  <PlayerPill label={`@${friend.username}`} color={avatarColor} />
                </div>
                <div className="space-y-2">
                  <CompareRow label="Album %"            myVal={myStats.pctBase}        friendVal={friendStats.pctBase}        format={(v) => `${v}%`}   higherIsBetter />
                  <CompareRow label="Vignettes collées"  myVal={myStats.collected}      friendVal={friendStats.collected}      format={(v) => String(v)} higherIsBetter />
                  <CompareRow label="Manquantes"         myVal={myStats.missing}        friendVal={friendStats.missing}        format={(v) => String(v)} higherIsBetter={false} />
                  <CompareRow label="Total doubles"      myVal={myStats.totalDoubles}   friendVal={friendStats.totalDoubles}   format={(v) => String(v)} higherIsBetter={false} />
                  <CompareRow label="Équipes complètes"  myVal={myStats.completedTeams} friendVal={friendStats.completedTeams} format={(v) => String(v)} higherIsBetter />
                  {myStats.packs > 0 && friendStats.packs > 0 && <>
                    <CompareRow label="Paquets ouverts" myVal={myStats.packs}  friendVal={friendStats.packs}  format={(v) => String(v)} higherIsBetter={false} neutral />
                    <CompareRow label="Budget dépensé"  myVal={myStats.spent}  friendVal={friendStats.spent}  format={(v) => `${v} €`}  higherIsBetter={false} neutral />
                    {myStats.costPerCard != null && friendStats.costPerCard != null &&
                      <CompareRow label="Coût / vignette" myVal={myStats.costPerCard} friendVal={friendStats.costPerCard} format={(v) => `${v} €`} higherIsBetter={false} />}
                  </>}
                </div>
                <WinnerBanner myStats={myStats} friendStats={friendStats} friendUsername={friend.username} />
              </>
            )
          )}

          {/* ── Échanges disponibles ── */}
          {tab === 'exchanges' && (
            !collection ? <NoData /> : (
              <>
                {/* Je reçois */}
                <SectionTitle color="text-green-600 dark:text-green-400" count={receiveCount}>↓ Il peut me donner</SectionTitle>
                {receiveCount === 0 ? <Empty /> : canReceive.map(({ label, flag, items }) => (
                  <ChipGroup key={label} label={label} flag={flag} items={items}
                    selected={selectedRecv} onSelect={(id) => setSelectedRecv(selectedRecv === id ? null : id)}
                    color="green" />
                ))}

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Je donne */}
                <SectionTitle color="text-orange-500 dark:text-orange-400" count={giveCount}>↑ Je peux lui donner</SectionTitle>
                {giveCount === 0 ? <Empty /> : canGive.map(({ label, flag, items }) => (
                  <ChipGroup key={label} label={label} flag={flag} items={items}
                    selected={selectedGive} onSelect={(id) => setSelectedGive(selectedGive === id ? null : id)}
                    color="orange" />
                ))}

                {/* Proposer */}
                {(selectedGive || selectedRecv) && (
                  <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex gap-2">
                        <span className="text-green-600 font-bold w-4">↓</span>
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{selectedRecv ?? '—'}</span>
                        <span className="text-gray-400">je reçois</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-orange-500 font-bold w-4">↑</span>
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{selectedGive ?? '—'}</span>
                        <span className="text-gray-400">je donne</span>
                      </div>
                    </div>
                    <button
                      onClick={proposeExchange}
                      disabled={!selectedGive || !selectedRecv || proposing}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                    >
                      {proposing ? 'Envoi…' : !selectedGive || !selectedRecv ? 'Sélectionne une carte de chaque liste' : '📨 Proposer cet échange'}
                    </button>
                  </div>
                )}
              </>
            )
          )}

          {/* ── En attente ── */}
          {tab === 'pending' && (
            reqLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Aucune demande en attente</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Va dans l'onglet Échanges pour en proposer une</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => {
                  const mine = isMine(req);
                  return (
                    <div key={req.id} className={`rounded-xl border p-4 space-y-3 ${mine ? 'border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10' : 'border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-900/10'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${mine ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'}`}>
                          {mine ? '📨 Envoyée' : '📬 Reçue'}
                        </span>
                        <span className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{mine ? 'Je donne' : 'Il donne'}</p>
                          <span className="font-mono font-black text-base text-orange-500 dark:text-orange-400">{req.give_display_id}</span>
                        </div>
                        <span className="text-gray-300 dark:text-gray-600 text-lg">⇄</span>
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{mine ? 'Je reçois' : 'Je reçois'}</p>
                          <span className="font-mono font-black text-base text-green-600 dark:text-green-400">{req.recv_display_id}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {mine ? (
                          <button onClick={() => handleAction(req, 'cancelled')} disabled={actionId === req.id}
                            className="flex-1 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                            Annuler
                          </button>
                        ) : (
                          <>
                            <button onClick={() => handleAction(req, 'accepted')} disabled={actionId === req.id}
                              className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
                              ✓ Accepter
                            </button>
                            <button onClick={() => handleAction(req, 'rejected')} disabled={actionId === req.id}
                              className="flex-1 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                              Refuser
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}

// ── UI helpers ──────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={['py-2.5 px-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0',
      active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'].join(' ')}>
      {children}
    </button>
  );
}

function Badge({ n, color }: { n: number; color: string }) {
  return <span className={`${color} text-white text-[9px] font-black px-1.5 py-0.5 rounded-full`}>{n}</span>;
}

function NoData() {
  return <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">Collection non synchronisée.</p>;
}

function Empty() {
  return <p className="text-xs text-gray-400 italic">Aucune carte disponible.</p>;
}

function SectionTitle({ children, color, count }: { children: React.ReactNode; color: string; count: number }) {
  return (
    <p className={`text-xs font-bold ${color} uppercase tracking-wide mb-2 flex items-center gap-1.5`}>
      {children}
      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[10px] font-black">{count}</span>
    </p>
  );
}

function PlayerPill({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-white font-black text-xs text-center px-1`}>{label.slice(0, 4)}</div>
      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-20 text-center">{label}</span>
    </div>
  );
}

function ChipGroup({ label, flag, items, selected, onSelect, color }: {
  label: string; flag?: string; items: StickerItem[];
  selected: string | null; onSelect: (id: string) => void; color: 'green' | 'orange';
}) {
  const base = color === 'green'
    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
    : 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20';
  const sel = color === 'green'
    ? 'ring-2 ring-green-500 border-green-500 bg-green-100 dark:bg-green-900/50 scale-105'
    : 'ring-2 ring-orange-500 border-orange-500 bg-orange-100 dark:bg-orange-900/50 scale-105';
  return (
    <div className="mb-2">
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        {flag && <span className="mr-1">{flag}</span>}{label}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <button key={item.id} title={item.name} onClick={() => onSelect(item.displayId)}
            className={['text-xs font-bold rounded-lg px-2 py-0.5 border transition-all text-gray-700 dark:text-gray-200', selected === item.displayId ? sel : base].join(' ')}>
            {item.displayId}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProgressCard({ pct, collected, totalDoubles }: { pct: number; collected: number; totalDoubles: number }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Progression</span>
        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className="h-full bg-linear-to-r from-blue-500 to-green-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{collected} / {TOTAL_BASE} standards</span>
        <span>{totalDoubles} doubles</span>
      </div>
    </div>
  );
}

function CompletedTeams({ copies }: { copies: Record<number, number> }) {
  const completed = TEAMS.filter((t) => {
    const s = STICKERS_BY_TEAM[t.id] ?? [];
    return s.length > 0 && s.every((st) => (copies[st.id] ?? 0) >= 1);
  });
  if (completed.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Équipes complètes ({completed.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {completed.map((t) => (
          <span key={t.id} className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
            {t.flag} {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Top5({ copies }: { copies: Record<number, number> }) {
  const top5 = [...TEAMS.map((team) => {
    const s = STICKERS_BY_TEAM[team.id] ?? [];
    const c = s.filter((st) => (copies[st.id] ?? 0) >= 1).length;
    return { team, collected: c, total: s.length, pct: s.length > 0 ? Math.round((c / s.length) * 100) : 0 };
  })].sort((a, b) => b.pct - a.pct).slice(0, 5);
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🏆 Top 5 équipes</p>
      <div className="space-y-2.5">
        {top5.map(({ team, collected, total, pct }, i) => (
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
  );
}

function CompareRow({ label, myVal, friendVal, format, higherIsBetter, neutral }: {
  label: string; myVal: number; friendVal: number; format: (v: number) => string;
  higherIsBetter: boolean; neutral?: boolean;
}) {
  const iWin    = higherIsBetter ? myVal > friendVal : myVal < friendVal;
  const theyWin = higherIsBetter ? friendVal > myVal  : friendVal < myVal;
  const tied    = myVal === friendVal;
  const myColor     = neutral ? 'text-gray-700 dark:text-gray-200' : tied ? 'text-gray-500' : iWin ? 'text-green-600 dark:text-green-400 font-black' : 'text-red-500 dark:text-red-400';
  const friendColor = neutral ? 'text-gray-700 dark:text-gray-200' : tied ? 'text-gray-500' : theyWin ? 'text-green-600 dark:text-green-400 font-black' : 'text-red-500 dark:text-red-400';
  const total = myVal + friendVal;
  const myPct = total > 0 ? (myVal / total) * 100 : 50;
  return (
    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-center mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <span className={`text-base font-bold w-16 text-right shrink-0 ${myColor}`}>{format(myVal)}</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${neutral ? 'bg-gray-400' : tied ? 'bg-gray-400' : iWin ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${myPct}%` }} />
        </div>
        <span className={`text-base font-bold w-16 text-left shrink-0 ${friendColor}`}>{format(friendVal)}</span>
      </div>
      {!neutral && !tied && (
        <p className="text-[10px] text-center mt-1 font-semibold">
          {iWin ? <span className="text-green-600 dark:text-green-400">✓ Tu mènes</span> : <span className="text-red-500 dark:text-red-400">Il mène</span>}
        </p>
      )}
    </div>
  );
}

function WinnerBanner({ myStats, friendStats, friendUsername }: {
  myStats: ReturnType<typeof getStats>; friendStats: ReturnType<typeof getStats>; friendUsername: string;
}) {
  let s = 0;
  if (myStats.pctBase > friendStats.pctBase) s++; else if (myStats.pctBase < friendStats.pctBase) s--;
  if (myStats.completedTeams > friendStats.completedTeams) s++; else if (myStats.completedTeams < friendStats.completedTeams) s--;
  if (myStats.missing < friendStats.missing) s++; else if (myStats.missing > friendStats.missing) s--;
  if (s === 0) return (
    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 text-center">
      <p className="text-2xl mb-1">🤝</p>
      <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">Égalité !</p>
    </div>
  );
  const iWin = s > 0;
  return (
    <div className={`rounded-xl p-4 text-center border ${iWin ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'}`}>
      <p className="text-2xl mb-1">{iWin ? '🏆' : '📈'}</p>
      <p className={`font-bold text-sm ${iWin ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
        {iWin ? 'Tu as une meilleure collection !' : `@${friendUsername} est en avance !`}
      </p>
    </div>
  );
}
