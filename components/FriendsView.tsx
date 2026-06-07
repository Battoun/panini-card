'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { CollectionData } from '../types';
import { TOTAL_BASE } from '../data/album';
import { FriendDetailModal } from './FriendDetailModal';
import { useCollection } from '../hooks/useCollection';

interface Profile { id: string; username: string }
interface PendingIn  { requestId: string; from: Profile }
interface PendingOut { requestId: string; to: Profile }

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-green-600',
  'from-orange-400 to-red-500',
  'from-pink-500 to-rose-600',
  'from-teal-400 to-cyan-600',
];

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const gradient = AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length];
  const cls = {
    xl: 'w-16 h-16 text-2xl',
    lg: 'w-12 h-12 text-lg',
    md: 'w-10 h-10 text-sm',
    sm: 'w-8  h-8  text-xs',
  }[size];
  return (
    <div className={`${cls} bg-linear-to-br ${gradient} rounded-full flex items-center justify-center text-white font-black shrink-0 shadow-lg`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function FriendsView() {
  const { user } = useAuth();
  const { copies: myCopies, packs: myPacks, rareCards: myRareCards, stats: myStats, refresh: refreshCollection } = useCollection();
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friends, setFriends]             = useState<Profile[]>([]);
  const [pendingIn, setPendingIn]         = useState<PendingIn[]>([]);
  const [pendingOut, setPendingOut]       = useState<PendingOut[]>([]);
  const [myUsername, setMyUsername]       = useState('');
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [friendCollections, setFriendCollections] = useState<Record<string, CollectionData | null>>({});
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    const { data: me } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    if (me) setMyUsername(me.username);

    const { data: reqs } = await supabase
      .from('friend_requests').select('id, from_user_id, to_user_id, status')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .neq('status', 'rejected');

    if (!reqs) { setLoading(false); return; }

    const ids = new Set<string>();
    reqs.forEach((r) => {
      if (r.from_user_id !== user.id) ids.add(r.from_user_id);
      if (r.to_user_id   !== user.id) ids.add(r.to_user_id);
    });

    const profileMap: Record<string, Profile> = {};
    if (ids.size > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', [...ids]);
      profiles?.forEach((p) => { profileMap[p.id] = p; });
    }

    const accepted: Profile[]   = [];
    const inReqs:  PendingIn[]  = [];
    const outReqs: PendingOut[] = [];

    reqs.forEach((r) => {
      const otherId = r.from_user_id === user.id ? r.to_user_id : r.from_user_id;
      const other   = profileMap[otherId];
      if (!other) return;
      if (r.status === 'accepted') accepted.push(other);
      else if (r.status === 'pending') {
        if (r.to_user_id === user.id) inReqs.push({ requestId: r.id, from: other });
        else                          outReqs.push({ requestId: r.id, to: other });
      }
    });

    setFriends(accepted);
    setPendingIn(inReqs);
    setPendingOut(outReqs);
    setLoading(false);

    if (accepted.length > 0) {
      const { data: cols } = await supabase
        .from('collections').select('user_id, copies').in('user_id', accepted.map((f) => f.id));
      const map: Record<string, CollectionData | null> = {};
      accepted.forEach((f) => {
        const row = cols?.find((c) => c.user_id === f.id);
        if (!row) { map[f.id] = null; return; }
        const raw = row.copies;
        map[f.id] = raw && typeof raw === 'object' && 'copies' in (raw as object) ? raw as CollectionData : null;
      });
      setFriendCollections(map);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user || search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from('profiles').select('id, username').ilike('username', `%${search}%`).neq('id', user.id).limit(5);
      setSearchResults(data ?? []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  const sendRequest = async (toId: string) => {
    if (!user) return;
    setActionLoading(toId);
    await createClient().from('friend_requests').insert({ from_user_id: user.id, to_user_id: toId });
    setSearch(''); setSearchResults([]); setActionLoading(null); loadData();
  };
  const respond = async (requestId: string, accept: boolean) => {
    setActionLoading(requestId);
    await createClient().from('friend_requests').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', requestId);
    setActionLoading(null); loadData();
  };
  const removeFriend = async (friendId: string, friendUsername: string) => {
    if (!user) return;
    if (!window.confirm(`Retirer @${friendUsername} de tes amis ?\n\nVous ne pourrez plus voir vos collections ni faire d'échanges.`)) return;
    setActionLoading(friendId);
    await createClient().from('friend_requests').delete()
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${user.id})`);
    setActionLoading(null); loadData();
  };
  const cancelRequest = async (requestId: string) => {
    setActionLoading(requestId);
    await createClient().from('friend_requests').delete().eq('id', requestId);
    setActionLoading(null); loadData();
  };

  const sentIds   = new Set(pendingOut.map((r) => r.to.id));
  const friendIds = new Set(friends.map((f) => f.id));
  const myPct     = Math.round((myStats.collected / TOTAL_BASE) * 100);

  if (loading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-8 flex-1 space-y-4">
        {[1,2,3].map((i) => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />)}
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 flex-1 space-y-6">

      {/* ── Mon profil ── */}
      <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <Avatar username={myUsername || '?'} size="xl" />
          <div className="flex-1 min-w-0">
            <p className="text-xl font-black truncate">@{myUsername}</p>
            <p className="text-sm text-blue-200 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-blue-100">Ma progression</span>
          <span className="text-lg font-black">{myPct}%</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${myPct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-blue-200">
          <span>{myStats.collected} collées</span>
          <span>{myStats.totalDoubles} doubles</span>
        </div>
      </div>

      {/* ── Demandes reçues ── */}
      {pendingIn.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Demandes reçues</h2>
            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingIn.length}</span>
          </div>
          <div className="space-y-3">
            {pendingIn.map((req) => (
              <div key={req.requestId} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar username={req.from.username} />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">@{req.from.username}</p>
                    <p className="text-xs text-gray-400 mt-0.5">veut être ton ami</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(req.requestId, true)} disabled={actionLoading === req.requestId}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                    ✓ Accepter
                  </button>
                  <button onClick={() => respond(req.requestId, false)} disabled={actionLoading === req.requestId}
                    className="flex-1 py-2.5 text-gray-500 dark:text-gray-400 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Ajouter un ami ── */}
      <section>
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Ajouter un ami</h2>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="text-lg text-gray-400">🔍</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche par pseudo…"
              className="flex-1 text-sm text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none" />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-base">✕</button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
              {searchResults.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Avatar username={p.username} size="sm" />
                  <span className="flex-1 font-bold text-gray-800 dark:text-gray-100 text-sm">@{p.username}</span>
                  {friendIds.has(p.id) ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold">✓ Ami</span>
                  ) : sentIds.has(p.id) ? (
                    <span className="text-xs text-gray-400">Demande envoyée</span>
                  ) : (
                    <button onClick={() => sendRequest(p.id)} disabled={actionLoading === p.id}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50">
                      {actionLoading === p.id ? '…' : 'Ajouter'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {search.length >= 2 && !searchLoading && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 px-4 pb-4">Aucun résultat pour « {search} »</p>
          )}
        </div>
      </section>

      {/* ── Demandes envoyées ── */}
      {pendingOut.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">En attente</h2>
          <div className="space-y-2">
            {pendingOut.map((req) => (
              <div key={req.requestId} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-gray-700">
                <Avatar username={req.to.username} size="sm" />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">@{req.to.username}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Demande envoyée…</p>
                </div>
                <button onClick={() => cancelRequest(req.requestId)} disabled={actionLoading === req.requestId}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Mes amis ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Mes amis{friends.length > 0 && ` · ${friends.length}`}
          </h2>
        </div>

        {friends.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 py-16 px-6 text-center">
            <p className="text-5xl mb-4">👥</p>
            <p className="font-bold text-gray-600 dark:text-gray-300 text-base">Aucun ami pour l'instant</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Recherche un pseudo ci-dessus pour envoyer une demande</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((f) => {
              const col          = friendCollections[f.id];
              const copies       = col?.copies ?? {};
              const collected    = Object.values(copies).filter((v) => v >= 1).length;
              const totalDoubles = Object.values(copies).reduce((acc, v) => acc + Math.max(0, v - 1), 0);
              const pct          = col ? Math.round((collected / TOTAL_BASE) * 100) : null;
              const barColor     = pct === 100 ? 'bg-green-500' : pct !== null && pct >= 75 ? 'bg-blue-500' : pct !== null && pct >= 40 ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600';

              return (
                <div key={f.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                  {/* Ligne principale */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar username={f.username} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 dark:text-white text-base leading-tight">@{f.username}</p>
                      {pct !== null && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{collected} collées · {totalDoubles} doubles</p>
                      )}
                    </div>
                    {pct !== null && (
                      <span className={`text-xl font-black shrink-0 ${pct === 100 ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'}`}>{pct}%</span>
                    )}
                  </div>

                  {/* Barre de progression */}
                  {pct !== null ? (
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                      {col === undefined ? 'Chargement…' : 'Collection non synchronisée'}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedFriend(f)}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
                      Voir les détails
                    </button>
                    <button onClick={() => removeFriend(f.id, f.username)} disabled={actionLoading === f.id}
                      className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-colors text-sm disabled:opacity-40"
                      title="Retirer">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedFriend && (
        <FriendDetailModal
          friend={selectedFriend}
          collection={friendCollections[selectedFriend.id] ?? null}
          myCopies={myCopies}
          myPacks={myPacks}
          myRareCards={myRareCards}
          onClose={() => setSelectedFriend(null)}
          onCollectionUpdated={refreshCollection}
        />
      )}

    </main>
  );
}
