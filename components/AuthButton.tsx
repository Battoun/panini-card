'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <span>👤</span> Connexion
        </button>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const initials   = user.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <button
      onClick={() => router.push('/profile')}
      className="w-8 h-8 rounded-full bg-green-400 hover:bg-green-300 text-gray-900 text-xs font-black flex items-center justify-center transition-colors"
      title="Mon profil"
    >
      {initials}
    </button>
  );
}
