'use client';

import { useState, useMemo } from 'react';
import { ALL_STICKERS, TEAMS } from '../data/album';

type Mode = 'sachet' | 'echange';

interface ParsedToken {
  raw: string;
  sticker: typeof ALL_STICKERS[0] | null;
}

interface Props {
  copies: Record<number, number>;
  onIncrement: (id: number) => void;
  onAddPack: () => void;
  onClose: () => void;
}

export function QuickEntryPanel({ copies, onIncrement, onAddPack, onClose }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [input, setInput] = useState('');
  const [applied, setApplied] = useState(false);

  type ResultItem = { sticker: typeof ALL_STICKERS[0]; wasNew: boolean };
  const [result, setResult] = useState<ResultItem[]>([]);

  const lookup = useMemo(() => {
    const map: Record<string, typeof ALL_STICKERS[0]> = {};
    for (const s of ALL_STICKERS) {
      map[s.displayId.replace(/\s+/g, '').toUpperCase()] = s;
    }
    return map;
  }, []);

  const teamById = useMemo(() => {
    const map: Record<string, typeof TEAMS[0]> = {};
    for (const t of TEAMS) map[t.id] = t;
    return map;
  }, []);

  const parsed: ParsedToken[] = useMemo(() => {
    if (!input.trim()) return [];
    return input.trim().split(/[\s,;]+/).filter(Boolean).map((raw) => ({
      raw,
      sticker: lookup[raw.toUpperCase()] ?? null,
    }));
  }, [input, lookup]);

  const validCount   = parsed.filter((p) => p.sticker).length;
  const invalidCount = parsed.filter((p) => !p.sticker).length;

  function handleApply() {
    const snapshot: ResultItem[] = [];
    const seenInBatch: Record<number, number> = {};
    for (const { sticker } of parsed) {
      if (sticker) {
        const alreadyOwned = copies[sticker.id] ?? 0;
        const seenSoFar    = seenInBatch[sticker.id] ?? 0;
        snapshot.push({ sticker, wasNew: alreadyOwned === 0 && seenSoFar === 0 });
        seenInBatch[sticker.id] = seenSoFar + 1;
        onIncrement(sticker.id);
      }
    }
    if (mode === 'sachet') onAddPack();
    setResult(snapshot);
    setApplied(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Saisie rapide par lot</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">

          {/* Étape 1 — choix du mode */}
          {!mode && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-600 text-center">Tu veux saisir des vignettes depuis…</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('sachet')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <span className="text-3xl">🛍️</span>
                  <span className="font-bold text-gray-800 text-sm">Un sachet</span>
                  <span className="text-[11px] text-gray-400 text-center">7 vignettes · compte dans tes paquets ouverts</span>
                </button>
                <button
                  onClick={() => setMode('echange')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 hover:border-green-400 hover:bg-green-50 transition-all"
                >
                  <span className="text-3xl">🔁</span>
                  <span className="font-bold text-gray-800 text-sm">Un échange</span>
                  <span className="text-[11px] text-gray-400 text-center">1 vignette ou plus · ne compte pas comme sachet</span>
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 — saisie des vignettes */}
          {mode && !applied && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-lg">{mode === 'sachet' ? '🛍️' : '🔁'}</span>
                <span className="text-sm font-semibold text-gray-700">
                  {mode === 'sachet' ? 'Sachet — 7 vignettes' : 'Échange'}
                </span>
                <button onClick={() => setMode(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
                  changer
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Entre les numéros séparés par des espaces.<br />
                Exemples : <span className="font-mono bg-gray-100 px-1 rounded text-gray-700">FRA3 BRA7 ARG12 FWC5 CC3</span>
              </p>

              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'sachet' ? 'FRA3 BRA7 ARG12 FWC5 CC3 ESP2 ITA8' : 'FRA3'}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-blue-400 resize-none"
                rows={3}
              />

              {parsed.length > 0 && (
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {parsed.map(({ raw, sticker }, i) => {
                    if (!sticker) {
                      return (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-lg">
                          <span className="text-red-500 text-xs font-bold">✗</span>
                          <span className="font-mono text-xs text-red-600">{raw}</span>
                          <span className="text-xs text-red-400">non reconnu</span>
                        </div>
                      );
                    }
                    const team  = sticker.teamId ? teamById[sticker.teamId] : null;
                    const isNew = (copies[sticker.id] ?? 0) === 0;
                    return (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${isNew ? 'bg-green-50' : 'bg-orange-50'}`}>
                        <span className={`text-xs font-bold ${isNew ? 'text-green-500' : 'text-orange-400'}`}>{isNew ? '★' : '+'}</span>
                        {team && <span className="text-sm leading-none">{team.flag}</span>}
                        <span className="font-mono text-xs font-bold text-gray-700 w-14 shrink-0">{sticker.displayId}</span>
                        <span className="text-xs text-gray-500 truncate flex-1">{sticker.name}</span>
                        <span className={`text-[10px] font-semibold shrink-0 ${isNew ? 'text-green-600' : 'text-orange-500'}`}>
                          {isNew ? 'nouvelle' : 'double'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {parsed.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-gray-400">
                    <span className="text-green-600 font-semibold">{validCount}</span> reconnue{validCount > 1 ? 's' : ''}
                    {invalidCount > 0 && <span className="text-red-400"> · {invalidCount} non reconnue{invalidCount > 1 ? 's' : ''}</span>}
                    {mode === 'sachet' && <span className="text-blue-400"> · +1 sachet</span>}
                  </p>
                  <button
                    onClick={handleApply}
                    disabled={validCount === 0 || (mode === 'sachet' && validCount !== 7)}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                  >
                    {mode === 'sachet' && validCount !== 7
                      ? `Ajouter (${validCount}/7)`
                      : `Ajouter (${validCount})`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Étape 3 — récap */}
          {applied && (() => {
            const newCount    = result.filter((r) => r.wasNew).length;
            const doubleCount = result.filter((r) => !r.wasNew).length;
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <span className="font-bold text-gray-800">
                    {mode === 'sachet' ? 'Sachet ajouté' : 'Échange ajouté'}
                  </span>
                  {mode === 'sachet' && <span className="ml-auto text-[11px] text-blue-500 font-semibold">+1 sachet comptabilisé</span>}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-green-600">{newCount}</p>
                    <p className="text-[10px] text-green-500 uppercase tracking-wide mt-0.5">Nouvelle{newCount > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-orange-500">{doubleCount}</p>
                    <p className="text-[10px] text-orange-400 uppercase tracking-wide mt-0.5">Double{doubleCount > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {result.map(({ sticker, wasNew }, i) => {
                    const team = sticker.teamId ? teamById[sticker.teamId] : null;
                    return (
                      <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${wasNew ? 'bg-green-50' : 'bg-orange-50'}`}>
                        <span className={`text-xs font-bold ${wasNew ? 'text-green-500' : 'text-orange-400'}`}>{wasNew ? '★' : '+'}</span>
                        {team && <span className="text-sm leading-none">{team.flag}</span>}
                        <span className="font-mono text-xs font-bold text-gray-700 w-14 shrink-0">{sticker.displayId}</span>
                        <span className="text-xs text-gray-500 truncate flex-1">{sticker.name}</span>
                        <span className={`text-[10px] font-semibold shrink-0 ${wasNew ? 'text-green-600' : 'text-orange-500'}`}>
                          {wasNew ? 'nouvelle' : 'double'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
