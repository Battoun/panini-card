'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { CollectionData } from '../types';
import { TOTAL_BASE } from '../data/album';
import { FriendDetailModal } from './FriendDetailModal';

interface Profile { id: string; username: string }
interface PendingIn  { requestId: string; from: Profile }
interface PendingOut { requestId: string; to: Profile }

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500'];

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length];
  const cls   = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${cls} ${color} rounded-full flex items-center justify-center text-white font-black shrink-0 shadow-sm`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-green-500' : pct >= 75 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold shrink-0 ${pct === 100 ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`}>{pct}%</span>
    </div>
  );
}

export function FriendsView() {
  const { user } = useAuth();
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

  const sendRequest  = async (toId: string) => {
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
  const removeFriend = async (friendId: string) => {
    if (!user) return;
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

  if (loading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 flex-1">
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-5 flex-1 space-y-6">

      {/* Mon profil */}
      <div className="flex items-center gap-3 px-1">
        <Avatar username={myUsername || '?'} size="lg" />
        <div>
          <p className="font-black text-gray-900 dark:text-white text-base leading-tight">@{myUsername}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Demandes reçues */}
      {pendingIn.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
            Demandes reçues
            <span className="ml-2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{pendingIn.length}</span>
          </p>
          <div className="space-y-2">
            {pendingIn.map((req) => (
              <div key={req.requestId} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl px-4 py-3">
                <Avatar username={req.from.username} size="sm" />
                <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100">@{req.from.username}</span>
                <button onClick={() => respond(req.requestId, true)} disabled={actionLoading === req.requestId}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl transition-colors">
                  Accepter
                </button>
                <button onClick={() => respond(req.requestId, false)} disabled={actionLoading === req.requestId}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-1">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recherche */}
      <section>
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Ajouter un ami</p>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par pseudo…"
            className="w-full pl-9 pr-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {searchLoading && <span className="absolute right-4 top-3 text-xs text-gray-400">…</span>}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            {searchResults.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50 dark:border-gray-700/50' : ''}`}>
                <Avatar username={p.username} size="sm" />
                <span className="flex-1 text-sm font-bold text-gray-800 dark:text-gray-100">@{p.username}</span>
                {friendIds.has(p.id) ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Ami</span>
                ) : sentIds.has(p.id) ? (
                  <span className="text-xs text-gray-400 font-semibold">Envoyée</span>
                ) : (
                  <button onClick={() => sendRequest(p.id)} disabled={actionLoading === p.id}
                    className="text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl transition-colors">
                    {actionLoading === p.id ? '…' : '+ Ajouter'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {search.length >= 2 && !searchLoading && searchResults.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1 italic">Aucun utilisateur trouvé pour « {search} »</p>
        )}
      </section>

      {/* Demandes envoyées */}
      {pendingOut.length > 0 && (
        <section>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">En attente</p>
          <div className="space-y-2">
            {pendingOut.map((req) => (
              <div key={req.requestId} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-3">
                <Avatar username={req.to.username} size="sm" />
                <span className="flex-1 text-sm font-bold text-gray-700 dark:text-gray-200">@{req.to.username}</span>
                <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full font-semibold">En attente</span>
                <button onClick={() => cancelRequest(req.requestId)} disabled={actionLoading === req.requestId}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors ml-1 disabled:opacity-50">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mes amis */}
      <section>
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
          Mes amis {friends.length > 0 && <span className="text-gray-500">· {friends.length}</span>}
        </p>

        {friends.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-600">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">Aucun ami pour l'instant</p>
            <p className="text-xs mt-1">Recherche un pseudo ci-dessus pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const col       = friendCollections[f.id];
              const copies    = col?.copies ?? {};
              const collected = Object.values(copies).filter((v) => v >= 1).length;
              const pct       = col ? Math.round((collected / TOTAL_BASE) * 100) : null;

              return (
                <div key={f.id}
                  className="flex items-center gap-3 bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 rounded-2xl px-4 py-3 shadow-sm"
                >
                  <Avatar username={f.username} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">@{f.username}</p>
                    {pct !== null ? (
                      <ProgressBar pct={pct} />
                    ) : (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {col === undefined ? '…' : 'Non synchronisé'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setSelectedFriend(f)}
                      className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-base font-bold flex items-center justify-center transition-colors shadow-sm"
                      title="Voir les détails">
                      +
                    </button>
                    <button onClick={() => removeFriend(f.id)} disabled={actionLoading === f.id}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors text-sm disabled:opacity-40"
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
          onClose={() => setSelectedFriend(null)}
        />
      )}

    </main>
  );
}
