'use client';

import { useState, useMemo, useRef } from 'react';
import { ALL_STICKERS, TEAMS, STICKERS_BY_TEAM, STICKERS_BY_ID, GROUPS } from '../data/album';
import { CollectionData, ExchangeHistoryItem } from '../types';

interface Props {
  copies: Record<number, number>;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onRecordExchange: (giveId: number, giveDisplayId: string, receiveId: number, receiveDisplayId: string) => void;
  onUndoExchange: (entryId: number) => void;
  exchangeHistory: ExchangeHistoryItem[];
  onClose: () => void;
}

type Step = 'import' | 'result';

interface StickerItem { id: number; displayId: string; name: string }
interface Section     { label: string; flag?: string; items: StickerItem[] }

function buildSections(predicate: (s: typeof ALL_STICKERS[0]) => boolean): Section[] {
  const result: Section[] = [];

  const fwc = ALL_STICKERS
    .filter((s) => !s.teamId && !s.displayId.startsWith('CC') && predicate(s))
    .map((s) => ({ id: s.id, displayId: s.displayId, name: s.name }));
  if (fwc.length > 0) result.push({ label: 'Spéciales', items: fwc });

  for (const g of GROUPS) {
    for (const team of TEAMS.filter((t) => t.group === g)) {
      const items = (STICKERS_BY_TEAM[team.id] ?? [])
        .filter(predicate)
        .map((s) => ({ id: s.id, displayId: s.displayId, name: s.name }));
      if (items.length > 0) result.push({ label: team.name, flag: team.flag, items });
    }
  }

  const cc = ALL_STICKERS
    .filter((s) => s.displayId.startsWith('CC') && predicate(s))
    .map((s) => ({ id: s.id, displayId: s.displayId, name: s.name }));
  if (cc.length > 0) result.push({ label: 'Coca-Cola', items: cc });

  return result;
}

function flatten(sections: Section[]): StickerItem[] {
  return sections.flatMap((s) => s.items);
}

export function ComparePanel({ copies, onIncrement, onDecrement, onRecordExchange, onUndoExchange, exchangeHistory, onClose }: Props) {
  const [step, setStep]             = useState<Step>('import');
  const [text, setText]             = useState('');
  const [error, setError]           = useState('');
  const [friendCopies, setFriendCopies] = useState<Record<number, number> | null>(null);
  const [selectedGive, setSelectedGive]       = useState<number | null>(null);
  const [selectedReceive, setSelectedReceive] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleCompare = () => {
    setError('');
    try {
      const parsed = JSON.parse(text) as CollectionData;
      if (!parsed.copies || typeof parsed.copies !== 'object') throw new Error();
      setFriendCopies(
        Object.fromEntries(Object.entries(parsed.copies).map(([k, v]) => [Number(k), Number(v)]))
      );
      setStep('result');
    } catch {
      setError("JSON invalide. Colle le fichier exporté depuis l'app.");
    }
  };

  const canGive = useMemo(() => {
    if (!friendCopies) return [];
    return buildSections((s) => (copies[s.id] ?? 0) >= 2 && (friendCopies[s.id] ?? 0) === 0);
  }, [copies, friendCopies]);

  const canReceive = useMemo(() => {
    if (!friendCopies) return [];
    return buildSections((s) => (friendCopies![s.id] ?? 0) >= 2 && (copies[s.id] ?? 0) === 0);
  }, [copies, friendCopies]);

  const allGive    = useMemo(() => flatten(canGive),    [canGive]);
  const allReceive = useMemo(() => flatten(canReceive), [canReceive]);

  const giveSticker    = selectedGive    != null ? STICKERS_BY_ID[selectedGive]    : null;
  const receiveSticker = selectedReceive != null ? STICKERS_BY_ID[selectedReceive] : null;

  const handleRandom = () => {
    if (allGive.length > 0)    setSelectedGive(allGive[Math.floor(Math.random() * allGive.length)].id);
    if (allReceive.length > 0) setSelectedReceive(allReceive[Math.floor(Math.random() * allReceive.length)].id);
  };

  const handleValidate = () => {
    if (selectedGive == null || selectedReceive == null) return;
    if ((copies[selectedGive] ?? 0) < 2) {
      alert("Tu n'as plus ce double disponible.");
      setSelectedGive(null);
      return;
    }
    if ((copies[selectedReceive] ?? 0) !== 0) {
      alert('Tu possèdes déjà cette vignette.');
      setSelectedReceive(null);
      return;
    }
    const giveItem    = allGive.find((s) => s.id === selectedGive)!;
    const receiveItem = allReceive.find((s) => s.id === selectedReceive)!;

    onDecrement(selectedGive);
    onIncrement(selectedReceive);
    onRecordExchange(selectedGive, giveItem.displayId, selectedReceive, receiveItem.displayId);

    setSelectedGive(null);
    setSelectedReceive(null);
  };

  const handleUndo = (entry: ExchangeHistoryItem) => {
    (entry.receiveIds ?? []).forEach((id) => onDecrement(id));
    (entry.giveIds ?? []).forEach((id) => onIncrement(id));
    onUndoExchange(entry.id);
  };

  const canValidate = selectedGive != null && selectedReceive != null;

  function StickerChip({ item, selected, onClick, color }: {
    item: StickerItem; selected: boolean; onClick: () => void; color: 'green' | 'orange';
  }) {
    const base = color === 'green'
      ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
      : 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20';
    const sel = color === 'green'
      ? 'ring-2 ring-green-500 border-green-500 bg-green-100 dark:bg-green-900/50'
      : 'ring-2 ring-orange-500 border-orange-500 bg-orange-100 dark:bg-orange-900/50';
    return (
      <button onClick={onClick} title={item.name}
        className={['text-xs font-bold rounded-lg px-2 py-0.5 border transition-all text-gray-700 dark:text-gray-200', selected ? sel : base].join(' ')}>
        {item.displayId}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100">Comparaison d'échanges</h2>
            {step === 'result' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                <span className="text-green-600 dark:text-green-400 font-semibold">{allReceive.length} à recevoir</span>
                {' · '}
                <span className="text-orange-500 dark:text-orange-400 font-semibold">{allGive.length} à donner</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">

          {/* ── Import ── */}
          {step === 'import' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Colle le fichier JSON exporté depuis l'app de ton ami (Exporter / Partager → Sauvegarder).
              </p>
              <input type="file" accept=".json" ref={fileRef} onChange={handleFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors">
                Choisir un fichier JSON…
              </button>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ou colle le JSON ici…"
                className="w-full h-36 text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <button onClick={handleCompare} disabled={!text.trim()}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                Comparer
              </button>
            </div>
          )}

          {/* ── Résultats ── */}
          {step === 'result' && (
            <div className="space-y-4">

              {/* Historique des 5 derniers échanges */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Derniers échanges ({Math.min(exchangeHistory.length, 5)}/5)
                </p>
                {exchangeHistory.length === 0
                  ? <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-1">Aucun échange effectué pour l'instant</p>
                  : exchangeHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs">
                      <span className="text-green-600 font-bold">↓</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-200 w-10 shrink-0">{entry.receiveDisplayId}</span>
                      <span className="text-gray-400 mx-0.5">·</span>
                      <span className="text-orange-500 font-bold">↑</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-200 w-10 shrink-0">{entry.giveDisplayId}</span>
                      <button onClick={() => handleUndo(entry)}
                        className="ml-auto text-[10px] text-red-400 hover:text-red-600 dark:hover:text-red-300 font-semibold border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                        Annuler
                      </button>
                    </div>
                  ))}
              </div>

              {/* Aléatoire */}
              <button onClick={handleRandom} disabled={allGive.length === 0 || allReceive.length === 0}
                className="w-full py-2 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-sm font-semibold transition-all disabled:opacity-40">
                🎲 Sélection aléatoire
              </button>

              {/* ↓ Reçoit */}
              <div>
                <p className="text-xs font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
                  ↓ Je reçois — choisir une vignette
                  <span className="bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full text-[10px] font-black">{allReceive.length}</span>
                </p>
                {allReceive.length === 0
                  ? <p className="text-xs text-gray-400 italic">Aucune disponible.</p>
                  : canReceive.map(({ label, flag, items }) => (
                    <div key={label} className="mb-2">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                        {flag && <span className="mr-1">{flag}</span>}{label}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {items.map((item) => (
                          <StickerChip key={item.id} item={item} color="green"
                            selected={selectedReceive === item.id}
                            onClick={() => setSelectedReceive(selectedReceive === item.id ? null : item.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* ↑ Donne */}
              <div>
                <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                  ↑ Je donne — choisir une vignette
                  <span className="bg-orange-100 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-full text-[10px] font-black">{allGive.length}</span>
                </p>
                {allGive.length === 0
                  ? <p className="text-xs text-gray-400 italic">Aucune disponible.</p>
                  : canGive.map(({ label, flag, items }) => (
                    <div key={label} className="mb-2">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                        {flag && <span className="mr-1">{flag}</span>}{label}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {items.map((item) => (
                          <StickerChip key={item.id} item={item} color="orange"
                            selected={selectedGive === item.id}
                            onClick={() => setSelectedGive(selectedGive === item.id ? null : item.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Récap sélection */}
              {(selectedGive != null || selectedReceive != null) && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide">Échange sélectionné</p>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold w-4">↓</span>
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-200 w-12">{receiveSticker?.displayId ?? '–'}</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate">{receiveSticker ? receiveSticker.name.split('–').pop()?.trim() : 'Non sélectionné'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 font-bold w-4">↑</span>
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-200 w-12">{giveSticker?.displayId ?? '–'}</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate">{giveSticker ? giveSticker.name.split('–').pop()?.trim() : 'Non sélectionné'}</span>
                  </div>
                </div>
              )}

              <button onClick={handleValidate} disabled={!canValidate}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold transition-colors">
                {canValidate ? "Valider l'échange" : 'Sélectionne une carte de chaque liste'}
              </button>

              <button
                onClick={() => { setStep('import'); setText(''); setFriendCopies(null); setSelectedGive(null); setSelectedReceive(null); }}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors">
                Comparer avec un autre ami
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose}
            className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
