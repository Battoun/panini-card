'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { createClient } from '../lib/supabase/client';

interface Profile {
  username: string;
  created_at: string;
}

export function ProfileView() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('username, created_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setProfileLoading(false);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials   = (profile?.username ?? user.email ?? '?').slice(0, 2).toUpperCase();
  const colors     = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  const avatarColor = colors[(profile?.username ?? '').charCodeAt(0) % colors.length] ?? 'bg-blue-500';
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* Header */}
      <div className="bg-linear-to-r from-blue-700 to-blue-900 text-white px-4 pt-6 pb-8">
        <button onClick={() => router.back()} className="self-start mb-4 flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-medium transition-colors">
          ‹ Retour
        </button>
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3">
          <div className={`w-20 h-20 ${avatarColor} rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg`}>
            {initials}
          </div>
          {profileLoading ? (
            <div className="h-6 w-32 bg-white/20 rounded-full animate-pulse" />
          ) : (
            <div className="text-center">
              <p className="text-xl font-bold">@{profile?.username}</p>
              <p className="text-sm text-blue-200 mt-0.5">{user.email}</p>
              {joinedDate && <p className="text-xs text-blue-300 mt-0.5">Membre depuis {joinedDate}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {/* Infos du compte */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Informations du compte</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            <Row label="Pseudo" value={profile?.username ? `@${profile.username}` : '—'} />
            <Row label="Email"  value={user.email ?? '—'} />
            <Row label="Membre depuis" value={joinedDate ?? '—'} />
          </div>
        </section>

        {/* Navigation rapide */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Navigation</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            <NavRow icon="📒" label="Mon Album"      onClick={() => router.push('/')} />
            <NavRow icon="📊" label="Statistiques"   onClick={() => router.push('/')} />
            <NavRow icon="👥" label="Mes amis"       onClick={() => router.push('/')} />
          </div>
        </section>

        {/* Déconnexion */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-4 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="font-semibold text-sm">Se déconnecter</span>
          </button>
        </section>

        {/* Danger zone */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-50 dark:border-red-900/30">
            <h2 className="font-bold text-red-600 dark:text-red-400 text-sm">Zone de danger</h2>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              La suppression du compte est irréversible et effacera toutes tes données.
            </p>
            <button
              disabled
              className="text-xs font-semibold text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5 opacity-50 cursor-not-allowed"
            >
              Supprimer mon compte — bientôt disponible
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[60%] text-right">{value}</span>
    </div>
  );
}

function NavRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <span className="text-base w-6 text-center">{icon}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <span className="ml-auto text-gray-300 dark:text-gray-600 text-xs">›</span>
    </button>
  );
}
