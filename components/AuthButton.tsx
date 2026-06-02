'use client';

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const [showModal, setShowModal]   = useState(false);
  const [showMenu, setShowMenu]     = useState(false);

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

  const initials = user.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="w-8 h-8 rounded-full bg-green-400 hover:bg-green-300 text-gray-900 text-xs font-black flex items-center justify-center transition-colors"
        title={user.email ?? ''}
      >
        {initials}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-10 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 min-w-[200px]">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connecté en tant que</p>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate mb-3">{user.email}</p>
            <button
              onClick={() => { signOut(); setShowMenu(false); }}
              className="w-full text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg py-1.5 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  );
}
