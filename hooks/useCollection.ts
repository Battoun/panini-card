'use client';

import { useCallback, useEffect, useState } from 'react';
import { CollectionData } from '../types';

const STORAGE_KEY = 'panini-wc2026-collection';
const PACK_PRICE  = 1.5;

function loadFromStorage(): CollectionData {
  if (typeof window === 'undefined') return { copies: {}, packs: 0, lastUpdated: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { copies: {}, packs: 0, lastUpdated: '' };
    const parsed = JSON.parse(raw) as CollectionData;
    return { ...parsed, packs: parsed.packs ?? 0 };
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
    importData,
    exportData,
    resetAll,
    stats,
    copies: data.copies,
    packs:  data.packs,
  };
}
