'use client';

import { useRef, useState } from 'react';
import { ALL_STICKERS, STICKERS_BY_ID, TEAMS } from '../data/album';

interface Props {
  copies: Record<number, number>;
  onImport: (raw: string) => boolean;
  onExport: () => string;
  onReset: () => void;
  onClose: () => void;
}

export function SharePanel({ copies, onImport, onExport, onReset, onClose }: Props) {
  const [tab, setTab] = useState<'export' | 'import' | 'list'>('list');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doublesList = ALL_STICKERS
    .filter((s) => (copies[s.id] ?? 0) >= 2)
    .map((s) => {
      const d = (copies[s.id] ?? 1) - 1;
      const teamName = s.teamId ? TEAMS.find((t) => t.id === s.teamId)?.name ?? '' : 'Spéciales';
      return `#${s.displayId} ${teamName} – ${STICKERS_BY_ID[s.id].name.split('–').pop()?.trim() ?? ''} (×${d})`;
    });

  const doublesText = doublesList.length > 0
    ? `Mes doubles – FIFA World Cup 2026 Panini\n${new Date().toLocaleDateString('fr-FR')}\n\n` + doublesList.join('\n')
    : 'Aucun double pour le moment.';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(doublesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportFile = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panini-wc2026-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setImportError('');
    if (!importText.trim()) return;
    const ok = onImport(importText);
    if (ok) {
      onClose();
    } else {
      setImportError('Fichier JSON invalide. Vérifiez le format.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-gray-800">Exporter / Partager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4">
          {(['list', 'export', 'import'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t === 'list' ? 'Liste doubles' : t === 'export' ? 'Sauvegarder' : 'Restaurer'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {tab === 'list' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {doublesList.length > 0
                  ? `${doublesList.length} vignette(s) en double à échanger :`
                  : 'Aucun double pour le moment.'}
              </p>
              <textarea
                readOnly
                value={doublesText}
                className="w-full h-48 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2 resize-none"
              />
              <button
                onClick={handleCopy}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                {copied ? 'Copié !' : 'Copier dans le presse-papier'}
              </button>
            </div>
          )}

          {tab === 'export' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Sauvegardez votre collection complète dans un fichier JSON pour la restaurer plus tard ou l'utiliser sur un autre appareil.
              </p>
              <button
                onClick={handleExportFile}
                className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
              >
                Télécharger le fichier JSON
              </button>
              <hr />
              <p className="text-xs text-gray-500">Zone de danger</p>
              <button
                onClick={() => {
                  if (window.confirm('Remettre à zéro toute la collection ?')) {
                    onReset();
                    onClose();
                  }
                }}
                className="w-full py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold transition-colors"
              >
                Réinitialiser la collection
              </button>
            </div>
          )}

          {tab === 'import' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Restaurez une collection précédemment exportée. Cette action remplacera toutes les données actuelles.
              </p>
              <input type="file" accept=".json" ref={fileRef} onChange={handleImportFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-600 text-sm font-medium transition-colors"
              >
                Choisir un fichier JSON...
              </button>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Ou collez le JSON ici..."
                className="w-full h-32 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {importError && <p className="text-xs text-red-600">{importError}</p>}
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                Importer et remplacer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
