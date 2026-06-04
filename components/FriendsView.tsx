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

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-teal-500'];

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length];
  const cls   = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-sm';
  return (
    <div className={`${cls} ${color} rounded-full flex items-center justify-center text-white font-black shrink-0`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function FriendsView() {
  const { user } = useAuth();
  const { copies: myCopies, packs: myPacks, refresh: refreshCollection } = useCollection();
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
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 space-y-4">
        {[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex-1 space-y-8">

      {/* Mon profil */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <Avatar username={myUsername || '?'} size="lg" />
        <div>
          <p className="font-black text-gray-900 dark:text-white text-lg leading-tight">@{myUsername}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Demandes reçues */}
      {pendingIn.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-50 dark:border-blue-900/30 flex items-center gap-2">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">Demandes reçues</h2>
            <span className="bg-blue-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">{pendingIn.length}</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {pendingIn.map((req) => (
              <div key={req.requestId} className="flex items-center gap-4 px-5 py-4">
                <Avatar username={req.from.username} />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 dark:text-gray-100">@{req.from.username}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">veut être ton ami</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(req.requestId, true)} disabled={actionLoading === req.requestId}
                    className="text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors">
                    Accepter
                  </button>
                  <button onClick={() => respond(req.requestId, false)} disabled={actionLoading === req.requestId}
                    className="text-sm font-semibold text-gray-400 hover:text-red-500 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-xl transition-colors">
                    Non
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recherche */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">Ajouter un ami</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Recherche par pseudo exact</p>
        </div>
        <div className="px-5 py-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pseudo…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-100 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {searchLoading && <span className="absolute right-4 top-3.5 text-sm text-gray-400">…</span>}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl px-4 py-3">
                  <Avatar username={p.username} size="sm" />
                  <span className="flex-1 font-bold text-gray-800 dark:text-gray-100 text-sm">@{p.username}</span>
                  {friendIds.has(p.id) ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold">✓ Ami</span>
                  ) : sentIds.has(p.id) ? (
                    <span className="text-xs text-gray-400 font-semibold">Demande envoyée</span>
                  ) : (
                    <button onClick={() => sendRequest(p.id)} disabled={actionLoading === p.id}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors">
                      {actionLoading === p.id ? '…' : 'Ajouter'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {search.length >= 2 && !searchLoading && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 text-center">Aucun résultat pour « {search} »</p>
          )}
        </div>
      </section>

      {/* Demandes envoyées */}
      {pendingOut.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">Demandes envoyées</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {pendingOut.map((req) => (
              <div key={req.requestId} className="flex items-center gap-4 px-5 py-4">
                <Avatar username={req.to.username} />
                <div className="flex-1">
                  <p className="font-bold text-gray-800 dark:text-gray-100">@{req.to.username}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">En attente de réponse…</p>
                </div>
                <button onClick={() => cancelRequest(req.requestId)} disabled={actionLoading === req.requestId}
                  className="text-xs font-semibold text-red-400 hover:text-red-600 border border-red-200 dark:border-red-800 px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mes amis */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">Mes amis</h2>
          {friends.length > 0 && (
            <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{friends.length}</span>
          )}
        </div>

        {friends.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold text-gray-500 dark:text-gray-400">Aucun ami pour l'instant</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Recherche un pseudo ci-dessus pour envoyer une demande</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {friends.map((f) => {
              const col       = friendCollections[f.id];
              const copies    = col?.copies ?? {};
              const collected = Object.values(copies).filter((v) => v >= 1).length;
              const pct       = col ? Math.round((collected / TOTAL_BASE) * 100) : null;
              const barColor  = pct === 100 ? 'bg-green-500' : pct !== null && pct >= 75 ? 'bg-blue-500' : pct !== null && pct >= 40 ? 'bg-yellow-400' : 'bg-gray-300';

              return (
                <div key={f.id} className="flex items-center gap-4 px-5 py-4">
                  <Avatar username={f.username} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">@{f.username}</p>
                    {pct !== null ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">{pct}%</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {col === undefined ? 'Chargement…' : 'Collection non synchronisée'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setSelectedFriend(f)}
                      className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold flex items-center justify-center transition-colors"
                      title="Voir les détails">
                      +
                    </button>
                    <button onClick={() => removeFriend(f.id)} disabled={actionLoading === f.id}
                      className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-colors text-sm disabled:opacity-40"
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
          onClose={() => setSelectedFriend(null)}
          onCollectionUpdated={refreshCollection}
        />
      )}

    </main>
  );
}
