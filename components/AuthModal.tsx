'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase/client';

interface Props {
  onClose: () => void;
}

type Mode = 'login' | 'signup';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export function AuthModal({ onClose }: Props) {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const usernameError = username && !USERNAME_RE.test(username)
    ? '3–20 caractères, lettres/chiffres/_ uniquement'
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'signup') {
      if (!USERNAME_RE.test(username)) {
        setError('Pseudo invalide : 3–20 caractères, lettres/chiffres/_ uniquement.');
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === 'signup') {
      // Check username availability first
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existing) {
        setError('Ce pseudo est déjà pris.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Email ou mot de passe incorrect.');
      } else {
        onClose();
      }
    }

    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setSuccess('');
    setUsername('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
            {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mb-5">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={[
                'flex-1 py-1.5 rounded-md text-xs font-semibold transition-all',
                mode === m
                  ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400',
              ].join(' ')}
            >
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                placeholder="Pseudo (ex: Baptiste_26)"
                required
                maxLength={20}
                className={[
                  'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300',
                  usernameError
                    ? 'border-red-400 dark:border-red-500'
                    : 'border-gray-200 dark:border-gray-600',
                ].join(' ')}
              />
              {usernameError && (
                <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 ml-1">{usernameError}</p>
              )}
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-1">
                Visible par tes amis · ne peut pas être changé
              </p>
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Mot de passe (6 caractères min.)' : 'Mot de passe'}
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />

          {error   && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-600 dark:text-green-400">{success}</p>}

          <button
            type="submit"
            disabled={loading || !!usernameError}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>
      </div>
    </div>
  );
}
