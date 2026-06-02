'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectionData, ExchangeHistoryItem } from '../types';
import { useAuth } from './useAuth';
import { createClient } from '../lib/supabase/client';

const PACK_PRICE       = 1.5;
const SAVE_DEBOUNCE_MS = 800;

const EMPTY: CollectionData = { copies: {}, packs: 0, lastUpdated: '' };

async function loadFromSupabase(userId: string): Promise<CollectionData | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('collections')
    .select('collection_data')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data?.collection_data) return null;
  const d = data.collection_data as CollectionData;
  return { ...EMPTY, ...d, packs: d.packs ?? 0 };
}

async function saveToSupabase(userId: string, collection: CollectionData) {
  const supabase = createClient();
  await supabase.from('collections').upsert(
    {
      user_id: userId,
      copies: collection.copies,
      packs: collection.packs,
      collection_data: collection,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export function useCollection() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData]       = useState<CollectionData>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justLoaded = useRef(false); // skip the save triggered by the initial load

  // Load / reset when auth changes
  useEffect(() => {
    if (authLoading) return;

    setHydrated(false);

    if (!user) {
      setData(EMPTY);
      setHydrated(true);
      return;
    }

    loadFromSupabase(user.id).then((loaded) => {
      justLoaded.current = true;
      setData(loaded ?? EMPTY);
      setHydrated(true);
    });
  }, [user?.id, authLoading]);

  // Debounced save on every data change
  useEffect(() => {
    if (!user || !hydrated) return;

    // Skip the very first trigger caused by the initial load
    if (justLoaded.current) {
      justLoaded.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToSupabase(user.id, data);
    }, SAVE_DEBOUNCE_MS);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ──────────────────────────────────────────────

  const setCopies = useCallback((id: number, count: number) => {
    setData((prev) => {
      const next = { ...prev, copies: { ...prev.copies, [id]: Math.max(0, count) }, lastUpdated: new Date().toISOString() };
      if (next.copies[id] === 0) delete next.copies[id];
      return next;
    });
  }, []);

  const increment = useCallback((id: number) => {
    setData((prev) => ({
      ...prev,
      copies: { ...prev.copies, [id]: (prev.copies[id] ?? 0) + 1 },
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const decrement = useCallback((id: number) => {
    setData((prev) => {
      const current = prev.copies[id] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev, copies: { ...prev.copies, [id]: current - 1 }, lastUpdated: new Date().toISOString() };
      if (next.copies[id] === 0) delete next.copies[id];
      return next;
    });
  }, []);

  const addExchange = useCallback((given: number, received: number) => {
    setData((prev) => ({
      ...prev,
      exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) + given),
      exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) + received),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const recordBatchExchange = useCallback((
    giveStickers: { id: number; displayId: string }[],
    receiveStickers: { id: number; displayId: string }[],
  ) => {
    if (giveStickers.length === 0 && receiveStickers.length === 0) return;
    setData((prev) => {
      const entry: ExchangeHistoryItem = {
        id: Date.now(),
        date: new Date().toISOString(),
        giveIds: giveStickers.map((s) => s.id),
        giveDisplayId: giveStickers.map((s) => s.displayId).join(', '),
        receiveIds: receiveStickers.map((s) => s.id),
        receiveDisplayId: receiveStickers.map((s) => s.displayId).join(', '),
      };
      return {
        ...prev,
        exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) + giveStickers.length),
        exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) + receiveStickers.length),
        exchangeHistory:  [entry, ...(prev.exchangeHistory ?? [])].slice(0, 20),
        lastUpdated: new Date().toISOString(),
      };
    });
  }, []);

  const recordExchange = useCallback((giveId: number, giveDisplayId: string, receiveId: number, receiveDisplayId: string) => {
    setData((prev) => {
      const entry: ExchangeHistoryItem = {
        id: Date.now(),
        date: new Date().toISOString(),
        giveIds: [giveId],
        giveDisplayId,
        receiveIds: [receiveId],
        receiveDisplayId,
      };
      return {
        ...prev,
        exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) + 1),
        exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) + 1),
        exchangeHistory:  [entry, ...(prev.exchangeHistory ?? [])].slice(0, 20),
        lastUpdated: new Date().toISOString(),
      };
    });
  }, []);

  const undoExchange = useCallback((entryId: number) => {
    setData((prev) => ({
      ...prev,
      exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) - 1),
      exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) - 1),
      exchangeHistory:  (prev.exchangeHistory ?? []).filter((h) => h.id !== entryId),
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const setExchangeGiven = useCallback((n: number) => {
    setData((prev) => ({ ...prev, exchangeGiven: Math.max(0, n), lastUpdated: new Date().toISOString() }));
  }, []);

  const setExchangeReceived = useCallback((n: number) => {
    setData((prev) => ({ ...prev, exchangeReceived: Math.max(0, n), lastUpdated: new Date().toISOString() }));
  }, []);

  const setPacks = useCallback((count: number) => {
    setData((prev) => ({ ...prev, packs: Math.max(0, count), lastUpdated: new Date().toISOString() }));
  }, []);

  const importData = useCallback((raw: string): boolean => {
    try {
      const parsed = JSON.parse(raw) as CollectionData;
      if (!parsed.copies || typeof parsed.copies !== 'object') return false;
      const normalized: CollectionData = {
        ...EMPTY,
        copies: Object.fromEntries(Object.entries(parsed.copies).map(([k, v]) => [k, Number(v)])),
        packs: Number(parsed.packs ?? 0),
        lastUpdated: new Date().toISOString(),
      };
      setData(normalized);
      return true;
    } catch {
      return false;
    }
  }, []);

  const exportData = useCallback((): string => JSON.stringify(data, null, 2), [data]);

  const resetAll = useCallback(() => {
    setData({ ...EMPTY, lastUpdated: new Date().toISOString() });
  }, []);

  const getCopies   = useCallback((id: number) => data.copies[id] ?? 0, [data]);
  const isCollected = useCallback((id: number) => (data.copies[id] ?? 0) >= 1, [data]);
  const getDoubles  = useCallback((id: number) => Math.max(0, (data.copies[id] ?? 0) - 1), [data]);

  const stats = {
    collected:    Object.values(data.copies).filter((v) => v >= 1).length,
    doubles:      Object.values(data.copies).filter((v) => v >= 2).length,
    totalDoubles: Object.values(data.copies).reduce((acc, v) => acc + Math.max(0, v - 1), 0),
    packs:        data.packs,
    spent:        +(data.packs * PACK_PRICE).toFixed(2),
  };

  return {
    hydrated,
    getCopies,
    isCollected,
    getDoubles,
    setCopies,
    increment,
    decrement,
    setPacks,
    addExchange,
    recordBatchExchange,
    recordExchange,
    undoExchange,
    setExchangeGiven,
    setExchangeReceived,
    importData,
    exportData,
    resetAll,
    stats,
    copies:           data.copies,
    packs:            data.packs,
    exchangeGiven:    data.exchangeGiven    ?? 0,
    exchangeReceived: data.exchangeReceived ?? 0,
    exchangeHistory:  data.exchangeHistory  ?? [],
  };
}
