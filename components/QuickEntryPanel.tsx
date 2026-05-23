'use client';

import { useState, useMemo } from 'react';
import { ALL_STICKERS, TEAMS } from '../data/album';

type Mode = 'sachet' | 'echange';

interface ParsedToken {
  raw: string;
  sticker: typeof ALL_STICKERS[0] | null;
}

type ResultItem = { sticker: typeof ALL_STICKERS[0]; wasNew: boolean };

interface Props {
  copies: Record<number, number>;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onAddPack: () => void;
  onClose: () => void;
}

export function QuickEntryPanel({ copies, onIncrement, onDecrement, onAddPack, onClose }: Props) {
  const [mode, setMode]           = useState<Mode | null>(null);
  const [inputRec, setInputRec]   = useState('');
  const [inputGiven, setInputGiven] = useState('');
  const [applied, setApplied]     = useState(false);
  const [resultRec, setResultRec]   = useState<ResultItem[]>([]);
  const [resultGiven, setResultGiven] = useState<ResultItem[]>([]);

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

  function parse(input: string): ParsedToken[] {
    if (!input.trim()) return [];
    return input.trim().split(/[\s,;]+/).filter(Boolean).map((raw) => ({
      raw,
      sticker: lookup[raw.toUpperCase()] ?? null,
    }));
  }

  const parsedRec   = useMemo(() => parse(inputRec),   [inputRec,   lookup]);
  const parsedGiven = useMemo(() => parse(inputGiven), [inputGiven, lookup]);

  const validRec     = parsedRec.filter((p) => p.sticker).length;
  const invalidRec   = parsedRec.filter((p) => !p.sticker).length;
  const validGiven   = parsedGiven.filter((p) => p.sticker).length;
  const invalidGiven = parsedGiven.filter((p) => !p.sticker).length;

  // Vignettes données que tu n'as pas en double (risque)
  const givenWarnings = useMemo(() =>
    parsedGiven
      .filter((p) => p.sticker && (copies[p.sticker.id] ?? 0) <= 1)
      .map((p) => p.sticker!.displayId),
  [parsedGiven, copies]);

  const canSubmit = mode === 'sachet'
    ? validRec === 7
    : validRec > 0 || validGiven > 0;

  function handleApply() {
    // Reçues
    const snapshotRec: ResultItem[] = [];
    const seenInBatch: Record<number, number> = {};
    for (const { sticker } of parsedRec) {
      if (sticker) {
        const alreadyOwned = copies[sticker.id] ?? 0;
        const seenSoFar    = seenInBatch[sticker.id] ?? 0;
        snapshotRec.push({ sticker, wasNew: alreadyOwned === 0 && seenSoFar === 0 });
        seenInBatch[sticker.id] = seenSoFar + 1;
        onIncrement(sticker.id);
      }
    }

    // Données
    const snapshotGiven: ResultItem[] = [];
    for (const { sticker } of parsedGiven) {
      if (sticker) {
        snapshotGiven.push({ sticker, wasNew: false });
        onDecrement(sticker.id);
      }
    }

    if (mode === 'sachet') onAddPack();
    setResultRec(snapshotRec);
    setResultGiven(snapshotGiven);
    setApplied(true);
  }

  function StickerRow({ sticker, wasNew, given = false }: { sticker: typeof ALL_STICKERS[0]; wasNew: boolean; given?: boolean }) {
    const team = sticker.teamId ? teamById[sticker.teamId] : null;
    const bg   = given ? 'bg-gray-50' : wasNew ? 'bg-green-50' : 'bg-orange-50';
    const icon = given ? '↑' : wasNew ? '★' : '+';
    const iconColor = given ? 'text-gray-400' : wasNew ? 'text-green-500' : 'text-orange-400';
    const label = given ? 'donnée' : wasNew ? 'nouvelle' : 'double';
    const labelColor = given ? 'text-gray-400' : wasNew ? 'text-green-600' : 'text-orange-500';
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${bg}`}>
        <span className={`text-xs font-bold ${iconColor}`}>{icon}</span>
        {team && <span className="text-sm leading-none">{team.flag}</span>}
        <span className="font-mono text-xs font-bold text-gray-700 w-14 shrink-0">{sticker.displayId}</span>
        <span className="text-xs text-gray-500 truncate flex-1">{sticker.name}</span>
        <span className={`text-[10px] font-semibold shrink-0 ${labelColor}`}>{label}</span>
      </div>
    );
  }

  function ParsedPreview({ tokens, isGiven = false }: { tokens: ParsedToken[]; isGiven?: boolean }) {
    return (
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {tokens.map(({ raw, sticker }, i) =>
          !sticker ? (
            <div key={i} className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-lg">
              <span className="text-red-500 text-xs font-bold">✗</span>
              <span className="font-mono text-xs text-red-600">{raw}</span>
              <span className="text-xs text-red-400">non reconnu</span>
            </div>
          ) : (
            <StickerRow
              key={i}
              sticker={sticker}
              wasNew={!isGiven && (copies[sticker.id] ?? 0) === 0}
              given={isGiven}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
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
                  <span className="text-[11px] text-gray-400 text-center">Saisir ce que tu reçois et ce que tu donnes</span>
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 — saisie */}
          {mode && !applied && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-lg">{mode === 'sachet' ? '🛍️' : '🔁'}</span>
                <span className="text-sm font-semibold text-gray-700">
                  {mode === 'sachet' ? 'Sachet — 7 vignettes' : 'Échange'}
                </span>
                <button onClick={() => { setMode(null); setInputRec(''); setInputGiven(''); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
                  changer
                </button>
              </div>

              {/* Champ "reçues" */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-green-700">
                  {mode === 'sachet' ? 'Vignettes du sachet' : '↓ Vignettes reçues'}
                </p>
                <textarea
                  autoFocus
                  value={inputRec}
                  onChange={(e) => setInputRec(e.target.value)}
                  placeholder={mode === 'sachet' ? 'FRA3 BRA7 ARG12 FWC5 CC3 ESP2 ITA8' : 'FRA3'}
                  className="w-full border border-green-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-green-400 resize-none"
                  rows={2}
                />
                {parsedRec.length > 0 && <ParsedPreview tokens={parsedRec} />}
                {parsedRec.length > 0 && (
                  <p className="text-xs text-gray-400">
                    <span className="text-green-600 font-semibold">{validRec}</span> reconnue{validRec > 1 ? 's' : ''}
                    {invalidRec > 0 && <span className="text-red-400"> · {invalidRec} non reconnue{invalidRec > 1 ? 's' : ''}</span>}
                    {mode === 'sachet' && validRec !== 7 && <span className="text-orange-400"> · il faut exactement 7</span>}
                  </p>
                )}
              </div>

              {/* Champ "données" — échange uniquement */}
              {mode === 'echange' && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500">↑ Vignettes données</p>
                  <textarea
                    value={inputGiven}
                    onChange={(e) => setInputGiven(e.target.value)}
                    placeholder="ARG5"
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:border-gray-400 resize-none"
                    rows={2}
                  />
                  {parsedGiven.length > 0 && <ParsedPreview tokens={parsedGiven} isGiven />}
                  {parsedGiven.length > 0 && (
                    <p className="text-xs text-gray-400">
                      <span className="text-gray-600 font-semibold">{validGiven}</span> reconnue{validGiven > 1 ? 's' : ''}
                      {invalidGiven > 0 && <span className="text-red-400"> · {invalidGiven} non reconnue{invalidGiven > 1 ? 's' : ''}</span>}
                    </p>
                  )}
                  {givenWarnings.length > 0 && (
                    <p className="text-[11px] text-orange-500 bg-orange-50 rounded-lg px-2 py-1.5">
                      ⚠️ Tu n'as pas de double de : <span className="font-mono font-bold">{givenWarnings.join(', ')}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-400">
                  {mode === 'sachet' && <span className="text-blue-400">+1 sachet</span>}
                </p>
                <button
                  onClick={handleApply}
                  disabled={!canSubmit}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  {mode === 'sachet' && validRec !== 7
                    ? `Valider (${validRec}/7)`
                    : 'Valider'}
                </button>
              </div>
            </>
          )}

          {/* Étape 3 — récap */}
          {applied && (() => {
            const newCount    = resultRec.filter((r) => r.wasNew).length;
            const doubleCount = resultRec.filter((r) => !r.wasNew).length;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <span className="font-bold text-gray-800">
                    {mode === 'sachet' ? 'Sachet ajouté' : 'Échange enregistré'}
                  </span>
                  {mode === 'sachet' && <span className="ml-auto text-[11px] text-blue-500 font-semibold">+1 sachet</span>}
                </div>

                {/* Reçues */}
                {resultRec.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-green-600">{newCount}</p>
                        <p className="text-[10px] text-green-500 uppercase tracking-wide mt-0.5">Nouvelle{newCount > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-orange-500">{doubleCount}</p>
                        <p className="text-[10px] text-orange-400 uppercase tracking-wide mt-0.5">Double{doubleCount > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-green-700">{mode === 'sachet' ? 'Vignettes du sachet' : '↓ Reçues'}</p>
                    <div className="space-y-1">
                      {resultRec.map(({ sticker, wasNew }, i) => (
                        <StickerRow key={i} sticker={sticker} wasNew={wasNew} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Données */}
                {resultGiven.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500">↑ Données</p>
                    <div className="space-y-1">
                      {resultGiven.map(({ sticker }, i) => (
                        <StickerRow key={i} sticker={sticker} wasNew={false} given />
                      ))}
                    </div>
                  </div>
                )}

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
