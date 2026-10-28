'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface VintedExchange {
  id: string;
  username: string;
  cardsGiven: string[];
  cardsReceived: string[];
  money: number; // positif = je reçois, négatif = je paye
  status: 'validation' | 'preparation' | 'envoye' | 'recu_lui' | 'recu_moi' | 'termine';
  createdAt: number;
  sortOrder?: number; // ordre manuel, défaut = createdAt
  shippingMethod?: 'vinted' | 'manuel';
  shippingAddress?: string;
  appliedToCollection?: boolean;
}

const LS_KEY = 'vinted_exchanges';

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
  const [exchanges, setExchanges] = useState<VintedExchange[]>([]);
  const [hydrated, setHydrated]   = useState(false);

  const justLoaded = useRef(false);

  useEffect(() => {
    justLoaded.current = true;
    setExchanges(readLocalStorage());
    setHydrated(true);
  }, []);

  // Sauvegarde locale à chaque changement
  useEffect(() => {
    if (!hydrated) return;

    // Ignorer le premier déclenchement causé par le chargement initial
    if (justLoaded.current) {
      justLoaded.current = false;
      return;
    }

    writeLocalStorage(exchanges);
  }, [exchanges, hydrated]);

  const persist = useCallback((updated: VintedExchange[]) => {
    setExchanges(updated);
  }, []);

  return { exchanges, persist, hydrated };
}
