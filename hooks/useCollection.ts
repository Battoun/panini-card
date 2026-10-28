'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectionData, ExchangeHistoryItem, RareRarity } from '../types';

const PACK_PRICE       = 1.5;
const LS_CACHE_KEY     = 'collection_cache';

const EMPTY: CollectionData = { copies: {}, packs: 0, lastUpdated: '' };

function readCache(): CollectionData | null {
  try {
    const s = localStorage.getItem(LS_CACHE_KEY);
    return s ? JSON.parse(s) as CollectionData : null;
  } catch { return null; }
}

function writeCache(d: CollectionData) {
  try { localStorage.setItem(LS_CACHE_KEY, JSON.stringify(d)); } catch {}
}

export function useCollection() {
  // Hydratation instantanée depuis localStorage (seul stockage de la collection)
  const [data, setData] = useState<CollectionData>(() => {
    if (typeof window === 'undefined') return EMPTY;
    return readCache() ?? EMPTY;
  });
  const [hydrated, setHydrated] = useState(false);

  const skipNextSave = useRef(true);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Sauvegarde locale à chaque changement
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    writeCache(data);
  }, [data]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    writeCache(data);
    return true;
  }, [data]);

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
        packs:            Number(parsed.packs ?? 0),
        exchangeGiven:    Number(parsed.exchangeGiven    ?? 0),
        exchangeReceived: Number(parsed.exchangeReceived ?? 0),
        exchangeHistory:  Array.isArray(parsed.exchangeHistory) ? parsed.exchangeHistory : [],
        lastUpdated: new Date().toISOString(),
      };
      setData(normalized);
      return true;
    } catch {
      return false;
    }
  }, []);

  const setRareCard = useCallback((rarity: RareRarity, count: number) => {
    setData((prev) => ({
      ...prev,
      rareCards: { regular: 0, bronze: 0, silver: 0, gold: 0, ...(prev.rareCards ?? {}), [rarity]: Math.max(0, count) },
      lastUpdated: new Date().toISOString(),
    }));
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
    saveNow,
    setRareCard,
    importData,
    exportData,
    resetAll,
    stats,
    copies:           data.copies,
    packs:            data.packs,
    exchangeGiven:    data.exchangeGiven    ?? 0,
    exchangeReceived: data.exchangeReceived ?? 0,
    exchangeHistory:  data.exchangeHistory  ?? [],
    rareCards: data.rareCards ?? { regular: 0, bronze: 0, silver: 0, gold: 0 },
  };
}
