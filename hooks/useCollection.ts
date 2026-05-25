'use client';

import { useCallback, useEffect, useState } from 'react';
import { CollectionData, ExchangeHistoryItem } from '../types';

const STORAGE_KEY = 'panini-wc2026-collection';
const PACK_PRICE  = 1.5;

function loadFromStorage(): CollectionData {
  if (typeof window === 'undefined') return { copies: {}, packs: 0, lastUpdated: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { copies: {}, packs: 0, lastUpdated: '' };
    const parsed = JSON.parse(raw) as CollectionData & { exchangeHistory?: Record<string, unknown>[] };
    const exchangeHistory = (parsed.exchangeHistory ?? []).map((raw) => {
      const e = raw as unknown as Record<string, unknown>;
      return {
        ...e,
        giveIds:    Array.isArray(e.giveIds)    ? e.giveIds    : (e.giveId    != null ? [e.giveId]    : []),
        receiveIds: Array.isArray(e.receiveIds) ? e.receiveIds : (e.receiveId != null ? [e.receiveId] : []),
      };
    });
    return { ...parsed, packs: parsed.packs ?? 0, exchangeHistory } as CollectionData;
  } catch {
    return { copies: {}, packs: 0, lastUpdated: '' };
  }
}

function saveToStorage(data: CollectionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage quota exceeded
  }
}

export function useCollection() {
  const [data, setData] = useState<CollectionData>({ copies: {}, packs: 0, lastUpdated: '' });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(loadFromStorage());
    setHydrated(true);
  }, []);

  const setCopies = useCallback((id: number, count: number) => {
    setData((prev) => {
      const next: CollectionData = {
        ...prev,
        copies: { ...prev.copies, [id]: Math.max(0, count) },
        lastUpdated: new Date().toISOString(),
      };
      if (next.copies[id] === 0) delete next.copies[id];
      saveToStorage(next);
      return next;
    });
  }, []);

  const increment = useCallback((id: number) => {
    setData((prev) => {
      const next: CollectionData = {
        ...prev,
        copies: { ...prev.copies, [id]: (prev.copies[id] ?? 0) + 1 },
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const decrement = useCallback((id: number) => {
    setData((prev) => {
      const current = prev.copies[id] ?? 0;
      if (current <= 0) return prev;
      const next: CollectionData = {
        ...prev,
        copies: { ...prev.copies, [id]: current - 1 },
        lastUpdated: new Date().toISOString(),
      };
      if (next.copies[id] === 0) delete next.copies[id];
      saveToStorage(next);
      return next;
    });
  }, []);

  const addExchange = useCallback((given: number, received: number) => {
    setData((prev) => {
      const next: CollectionData = {
        ...prev,
        exchangeGiven:   Math.max(0, (prev.exchangeGiven   ?? 0) + given),
        exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) + received),
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(next);
      return next;
    });
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
      const next: CollectionData = {
        ...prev,
        exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) + giveStickers.length),
        exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) + receiveStickers.length),
        exchangeHistory:  [entry, ...(prev.exchangeHistory ?? [])].slice(0, 20),
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(next);
      return next;
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
      const next: CollectionData = {
        ...prev,
        exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) + 1),
        exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) + 1),
        exchangeHistory:  [entry, ...(prev.exchangeHistory ?? [])].slice(0, 20),
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const undoExchange = useCallback((entryId: number) => {
    setData((prev) => {
      const next: CollectionData = {
        ...prev,
        exchangeGiven:    Math.max(0, (prev.exchangeGiven   ?? 0) - 1),
        exchangeReceived: Math.max(0, (prev.exchangeReceived ?? 0) - 1),
        exchangeHistory:  (prev.exchangeHistory ?? []).filter((h) => h.id !== entryId),
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setExchangeGiven = useCallback((n: number) => {
    setData((prev) => {
      const next: CollectionData = { ...prev, exchangeGiven: Math.max(0, n), lastUpdated: new Date().toISOString() };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setExchangeReceived = useCallback((n: number) => {
    setData((prev) => {
      const next: CollectionData = { ...prev, exchangeReceived: Math.max(0, n), lastUpdated: new Date().toISOString() };
      saveToStorage(next);
      return next;
    });
  }, []);

  const setPacks = useCallback((count: number) => {
    setData((prev) => {
      const next: CollectionData = {
        ...prev,
        packs: Math.max(0, count),
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(next);
      return next;
    });
  }, []);

  const importData = useCallback((raw: string): boolean => {
    try {
      const parsed = JSON.parse(raw) as CollectionData;
      if (!parsed.copies || typeof parsed.copies !== 'object') return false;
      const normalized: CollectionData = {
        copies: Object.fromEntries(
          Object.entries(parsed.copies).map(([k, v]) => [k, Number(v)])
        ),
        packs: Number(parsed.packs ?? 0),
        lastUpdated: new Date().toISOString(),
      };
      saveToStorage(normalized);
      setData(normalized);
      return true;
    } catch {
      return false;
    }
  }, []);

  const exportData = useCallback((): string => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const resetAll = useCallback(() => {
    const empty: CollectionData = { copies: {}, packs: 0, lastUpdated: new Date().toISOString() };
    saveToStorage(empty);
    setData(empty);
  }, []);

  const getCopies  = useCallback((id: number) => data.copies[id] ?? 0, [data]);
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
    copies: data.copies,
    packs:  data.packs,
    exchangeGiven:    data.exchangeGiven    ?? 0,
    exchangeReceived: data.exchangeReceived ?? 0,
    exchangeHistory:  data.exchangeHistory  ?? [],
  };
}
