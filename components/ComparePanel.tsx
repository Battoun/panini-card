'use client';

import { useState, useMemo, useRef } from 'react';
import { ALL_STICKERS, TEAMS, STICKERS_BY_TEAM, GROUPS } from '../data/album';
import { CollectionData } from '../types';

interface Props {
  copies: Record<number, number>;
  onClose: () => void;
}

type Step = 'import' | 'result';

interface SectionItem { displayId: string; name: string }
interface Section { label: string; flag?: string; items: SectionItem[] }

function buildSections(predicate: (s: typeof ALL_STICKERS[0]) => boolean): Section[] {
  const result: Section[] = [];

  const fwc = ALL_STICKERS.filter((s) => !s.teamId && !s.displayId.startsWith('CC') && predicate(s))
    .map((s) => ({ displayId: s.displayId, name: s.name }));
  if (fwc.length > 0) result.push({ label: 'Spéciales', items: fwc });

  for (const g of GROUPS) {
    for (const team of TEAMS.filter((t) => t.group === g)) {
      const items = (STICKERS_BY_TEAM[team.id] ?? [])
        .filter(predicate)
        .map((s) => ({ displayId: s.displayId, name: s.name }));
      if (items.length > 0) result.push({ label: team.name, flag: team.flag, items });
    }
  }

  const cc = ALL_STICKERS.filter((s) => s.displayId.startsWith('CC') && predicate(s))
    .map((s) => ({ displayId: s.displayId, name: s.name }));
  if (cc.length > 0) result.push({ label: 'Coca-Cola', items: cc });

  return result;
}

export function ComparePanel({ copies, onClose }: Props) {
  const [step, setStep]       = useState<Step>('import');
  const [text, setText]       = useState('');
  const [error, setError]     = useState('');
  const [friendCopies, setFriendCopies] = useState<Record<number, number> | null>(null);
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
      const normalized: Record<number, number> = Object.fromEntries(
        Object.entries(parsed.copies).map(([k, v]) => [Number(k), Number(v)])
      );
      setFriendCopies(normalized);
      setStep('result');
    } catch {
      setError('JSON invalide. Colle le fichier exporté depuis l\'app.');
    }
  };

  // Tu peux donner : tu as en double (>=2) ET lui n'a pas (0)
  const canGive = useMemo(() => {
    if (!friendCopies) return [];
    return buildSections((s) => (copies[s.id] ?? 0) >= 2 && (friendCopies[s.id] ?? 0) === 0);
  }, [copies, friendCopies]);

  // Il peut te donner : lui a en double (>=2) ET tu n'as pas (0)
  const canReceive = useMemo(() => {
    if (!friendCopies) return [];
    return buildSections((s) => (friendCopies![s.id] ?? 0) >= 2 && (copies[s.id] ?? 0) === 0);
  }, [copies, friendCopies]);

  const totalGive    = canGive.reduce((acc, s) => acc + s.items.length, 0);
  const totalReceive = canReceive.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100">Comparaison d'échanges</h2>
            {step === 'result' && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                <span className="text-green-600 dark:text-green-400 font-semibold">{totalReceive} à recevoir</span>
                {' · '}
                <span className="text-orange-500 dark:text-orange-400 font-semibold">{totalGive} à donner</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">

          {/* Étape 1 — import */}
          {step === 'import' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Colle ici le fichier JSON exporté depuis l'app de ton ami (section Exporter / Partager → Sauvegarder).
              </p>
              <input type="file" accept=".json" ref={fileRef} onChange={handleFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
              >
                Choisir un fichier JSON…
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ou colle le JSON ici…"
                className="w-full h-36 text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <button
                onClick={handleCompare}
                disabled={!text.trim()}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                Comparer
              </button>
            </div>
          )}

          {/* Étape 2 — résultats */}
          {step === 'result' && (
            <div className="space-y-5">

              {/* Reçus */}
              <div>
                <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1.5">
                  ↓ Il peut te donner
                  <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-black px-1.5 py-0.5 rounded-full">{totalReceive}</span>
                </h3>
                {canReceive.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">Aucune vignette qu'il a en double et qu'il te manque.</p>
                ) : canReceive.map(({ label, flag, items }) => (
                  <div key={label} className="mb-2">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {flag && <span className="mr-1">{flag}</span>}{label}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {items.map(({ displayId, name }) => (
                        <span key={displayId} title={name}
                          className="text-xs font-bold bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-0.5">
                          {displayId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              {/* Donnés */}
              <div>
                <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                  ↑ Tu peux lui donner
                  <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-xs font-black px-1.5 py-0.5 rounded-full">{totalGive}</span>
                </h3>
                {canGive.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">Aucune vignette que tu as en double et qu'il lui manque.</p>
                ) : canGive.map(({ label, flag, items }) => (
                  <div key={label} className="mb-2">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      {flag && <span className="mr-1">{flag}</span>}{label}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {items.map(({ displayId, name }) => (
                        <span key={displayId} title={name}
                          className="text-xs font-bold bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-0.5">
                          {displayId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setStep('import'); setText(''); setFriendCopies(null); }}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
              >
                Comparer avec un autre ami
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
