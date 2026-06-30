'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { createClient } from '../lib/supabase/client';

export interface VintedExchange {
  id: string;
  username: string;
  cardsGiven: string[];
  cardsReceived: string[];
  money: number; // positif = je reçois, négatif = je paye
  status: 'validation' | 'preparation' | 'envoye' | 'recu' | 'termine';
  createdAt: number;
  sortOrder?: number; // ordre manuel, défaut = createdAt
  shippingMethod?: 'vinted' | 'manuel';
  shippingAddress?: string;
  appliedToCollection?: boolean;
}

const LS_KEY           = 'vinted_exchanges';
const SAVE_DEBOUNCE_MS = 1000;

async function loadFromSupabase(userId: string): Promise<VintedExchange[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('vinted_exchanges')
    .select('exchanges')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('[vinted:load]', error); return null; }
  if (!data) return null;
  return (data.exchanges as VintedExchange[]) ?? [];
}

async function saveToSupabase(userId: string, exchanges: VintedExchange[]) {
  const supabase = createClient();
  const { error } = await supabase
    .from('vinted_exchanges')
    .upsert(
      { user_id: userId, exchanges, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) console.error('[vinted:save]', error);
}

function readLocalStorage(): VintedExchange[] {
  try {
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function writeLocalStorage(exchanges: VintedExchange[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(exchanges)); } catch {}
}

export function useVintedExchanges() {
  const { user, loading: authLoading } = useAuth();
  const [exchanges, setExchanges] = useState<VintedExchange[]>([]);
  const [hydrated, setHydrated]   = useState(false);

  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justLoaded  = useRef(false);

  // Charger au changement de compte
  useEffect(() => {
    if (authLoading) return;
    setHydrated(false);

    if (!user) {
      setExchanges(readLocalStorage());
      setHydrated(true);
      return;
    }

    loadFromSupabase(user.id).then((loaded) => {
      justLoaded.current = true;
      if (loaded !== null) {
        // Données cloud trouvées — les utiliser
        setExchanges(loaded);
      } else {
        // Première connexion : migrer depuis localStorage si besoin
        const local = readLocalStorage();
        setExchanges(local);
      }
      setHydrated(true);
    });
  }, [user?.id, authLoading]);

  // Sauvegarde debouncée à chaque changement
  useEffect(() => {
    if (!hydrated) return;

    // Ignorer le premier déclenchement causé par le chargement initial
    if (justLoaded.current) {
      justLoaded.current = false;
      return;
    }

    // Toujours garder localStorage à jour comme cache local
    writeLocalStorage(exchanges);

    if (!user) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToSupabase(user.id, exchanges);
    }, SAVE_DEBOUNCE_MS);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [exchanges, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((updated: VintedExchange[]) => {
    setExchanges(updated);
  }, []);

  return { exchanges, persist, hydrated };
}
