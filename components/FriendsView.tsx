'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { useAuth } from '../hooks/useAuth';

interface Profile { id: string; username: string }
interface PendingIn  { requestId: string; from: Profile }
interface PendingOut { requestId: string; to: Profile }

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  const color = colors[username.charCodeAt(0) % colors.length];
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${cls} ${color} rounded-full flex items-center justify-center text-white font-black shrink-0`}>
      {username.slice(0, 2).toUpperCase()}
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

  const loadData = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // Own profile
    const { data: me } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    if (me) setMyUsername(me.username);

    // All requests involving me
    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('id, from_user_id, to_user_id, status')
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', [...ids]);
      profiles?.forEach((p) => { profileMap[p.id] = p; });
    }

    const accepted: Profile[]    = [];
    const inReqs:  PendingIn[]   = [];
    const outReqs: PendingOut[]  = [];

    reqs.forEach((r) => {
      const otherId = r.from_user_id === user.id ? r.to_user_id : r.from_user_id;
      const other   = profileMap[otherId];
      if (!other) return;
      if (r.status === 'accepted') {
        accepted.push(other);
      } else if (r.status === 'pending') {
        if (r.to_user_id === user.id)   inReqs.push({ requestId: r.id, from: other });
        else                            outReqs.push({ requestId: r.id, to: other });
      }
    });

    setFriends(accepted);
    setPendingIn(inReqs);
    setPendingOut(outReqs);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Search by username
  useEffect(() => {
    if (!user || search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${search}%`)
        .neq('id', user.id)
        .limit(5);
      setSearchResults(data ?? []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  const sendRequest = async (toId: string) => {
    if (!user) return;
    setActionLoading(toId);
    const supabase = createClient();
    await supabase.from('friend_requests').insert({ from_user_id: user.id, to_user_id: toId });
    setSearch('');
    setSearchResults([]);
    setActionLoading(null);
    loadData();
  };

  const respond = async (requestId: string, accept: boolean) => {
    setActionLoading(requestId);
    const supabase = createClient();
    await supabase.from('friend_requests').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', requestId);
    setActionLoading(null);
    loadData();
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const supabase = createClient();
    await supabase.from('friend_requests').delete()
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${user.id})`);
    setActionLoading(null);
    loadData();
  };

  const cancelRequest = async (requestId: string) => {
    setActionLoading(requestId);
    const supabase = createClient();
    await supabase.from('friend_requests').delete().eq('id', requestId);
    setActionLoading(null);
    loadData();
  };

  // Already sent / already friends check
  const sentIds    = new Set(pendingOut.map((r) => r.to.id));
  const friendIds  = new Set(friends.map((f) => f.id));

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 flex-1">
        <div className="animate-pulse space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex-1 space-y-5">

      {/* Mon profil */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <Avatar username={myUsername || '??'} />
        <div>
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">@{myUsername}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Ajouter un ami */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-3">Ajouter un ami</h2>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par pseudo…"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          {searchLoading && (
            <span className="absolute right-3 top-2.5 text-xs text-gray-400">…</span>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {searchResults.map((p) => {
              const isFriend  = friendIds.has(p.id);
              const isPending = sentIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <Avatar username={p.username} size="sm" />
                  <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">@{p.username}</span>
                  {isFriend ? (
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Déjà ami</span>
                  ) : isPending ? (
                    <span className="text-xs text-gray-400 font-semibold">Demande envoyée</span>
                  ) : (
                    <button
                      onClick={() => sendRequest(p.id)}
                      disabled={actionLoading === p.id}
                      className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      {actionLoading === p.id ? '…' : 'Ajouter'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {search.length >= 2 && !searchLoading && searchResults.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">Aucun utilisateur trouvé.</p>
        )}
      </section>

      {/* Demandes reçues */}
      {pendingIn.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/40 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-3 flex items-center gap-2">
            Demandes reçues
            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingIn.length}</span>
          </h2>
          <div className="space-y-2.5">
            {pendingIn.map((req) => (
              <div key={req.requestId} className="flex items-center gap-3">
                <Avatar username={req.from.username} size="sm" />
                <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">@{req.from.username}</span>
                <button
                  onClick={() => respond(req.requestId, true)}
                  disabled={actionLoading === req.requestId}
                  className="text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  Accepter
                </button>
                <button
                  onClick={() => respond(req.requestId, false)}
                  disabled={actionLoading === req.requestId}
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
                >
                  Refuser
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Demandes envoyées */}
      {pendingOut.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-3 text-sm">Demandes envoyées</h2>
          <div className="space-y-2">
            {pendingOut.map((req) => (
              <div key={req.requestId} className="flex items-center gap-3">
                <Avatar username={req.to.username} size="sm" />
                <span className="flex-1 text-sm font-semibold text-gray-700 dark:text-gray-200">@{req.to.username}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mr-1">En attente</span>
                <button
                  onClick={() => cancelRequest(req.requestId)}
                  disabled={actionLoading === req.requestId}
                  className="text-[10px] text-red-400 hover:text-red-600 border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mes amis */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-3 flex items-center gap-2">
          Mes amis
          <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">{friends.length}</span>
        </h2>

        {friends.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
            Aucun ami pour l'instant — envoie une demande !
          </p>
        ) : (
          <div className="space-y-3">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                <Avatar username={f.username} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-100">@{f.username}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    Stats de collection — bientôt disponibles
                  </p>
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  disabled={actionLoading === f.id}
                  className="text-[10px] text-red-400 hover:text-red-600 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5 transition-colors disabled:opacity-50 shrink-0"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
