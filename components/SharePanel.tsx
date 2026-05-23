'use client';

import { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ALL_STICKERS, STICKERS_BY_ID, TEAMS, STICKERS_BY_TEAM, GROUPS } from '../data/album';
import { encodeDoubles } from '../utils/share';

interface Props {
  copies: Record<number, number>;
  onImport: (raw: string) => boolean;
  onExport: () => string;
  onReset: () => void;
  onClose: () => void;
}

export function SharePanel({ copies, onImport, onExport, onReset, onClose }: Props) {
  const [tab, setTab] = useState<'list' | 'missing' | 'share' | 'export' | 'import'>('list');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied]         = useState(false);
  const [copiedMissing, setCopiedMissing] = useState(false);
  const [copiedLink, setCopiedLink]       = useState(false);
  const [qrDataUrl, setQrDataUrl]         = useState('');

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?share=${encodeDoubles(copies)}`
    : '';

  const doublesCount = Object.values(copies).filter((v) => v >= 2).length;

  useEffect(() => {
    if (tab !== 'share' || !shareUrl || doublesCount === 0) return;
    QRCode.toDataURL(shareUrl, { width: 300, margin: 2, errorCorrectionLevel: 'Q', color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [tab, shareUrl, doublesCount]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
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

  // Liste des manquantes groupée par équipe
  const missingText = (() => {
    const lines: string[] = [`Il me manque – FIFA World Cup 2026 Panini`, new Date().toLocaleDateString('fr-FR'), ''];

    // Spéciales FWC
    const missingFWC = ALL_STICKERS
      .filter((s) => !s.teamId && !s.displayId.startsWith('CC') && (copies[s.id] ?? 0) === 0)
      .map((s) => s.displayId);
    if (missingFWC.length > 0) lines.push(`✨ Spéciales : ${missingFWC.join(', ')}`);

    // Équipes par groupe
    for (const g of GROUPS) {
      const teamsInGroup = TEAMS.filter((t) => t.group === g);
      for (const team of teamsInGroup) {
        const missing = (STICKERS_BY_TEAM[team.id] ?? [])
          .filter((s) => (copies[s.id] ?? 0) === 0)
          .map((s) => s.displayId);
        if (missing.length > 0) lines.push(`${team.flag} ${team.name} : ${missing.join(', ')}`);
      }
    }

    // Coca-Cola
    const missingCC = ALL_STICKERS
      .filter((s) => s.displayId.startsWith('CC') && (copies[s.id] ?? 0) === 0)
      .map((s) => s.displayId);
    if (missingCC.length > 0) lines.push(`🥤 Coca-Cola : ${missingCC.join(', ')}`);

    const totalMissing = ALL_STICKERS.filter((s) => (copies[s.id] ?? 0) === 0).length;
    lines.push('', `Total : ${totalMissing} vignette${totalMissing > 1 ? 's' : ''} manquante${totalMissing > 1 ? 's' : ''}`);
    return lines.join('\n');
  })();

  const totalMissing = ALL_STICKERS.filter((s) => (copies[s.id] ?? 0) === 0).length;

  const handleCopyMissing = async () => {
    await navigator.clipboard.writeText(missingText);
    setCopiedMissing(true);
    setTimeout(() => setCopiedMissing(false), 2000);
  };

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
        <div className="flex border-b px-4 overflow-x-auto">
          {(['list', 'missing', 'share', 'export', 'import'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t === 'list' ? 'Doubles' : t === 'missing' ? 'Manquantes' : t === 'share' ? 'Lien / QR' : t === 'export' ? 'Sauvegarder' : 'Restaurer'}
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

          {tab === 'missing' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {totalMissing > 0
                  ? `${totalMissing} vignette${totalMissing > 1 ? 's' : ''} manquante${totalMissing > 1 ? 's' : ''}, groupées par équipe :`
                  : 'Album complet, aucune vignette manquante !'}
              </p>
              <textarea
                readOnly
                value={missingText}
                className="w-full h-48 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2 resize-none"
              />
              <button
                onClick={handleCopyMissing}
                disabled={totalMissing === 0}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {copiedMissing ? 'Copié !' : 'Copier dans le presse-papier'}
              </button>
            </div>
          )}

          {tab === 'share' && (
            <div className="space-y-4">
              {doublesCount === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucun double à partager pour le moment.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Partage ce lien ou ce QR code — la personne verra directement ta liste de <span className="font-semibold">{doublesCount} doubles</span> disponibles.
                  </p>

                  {qrDataUrl ? (
                    <div className="flex justify-center">
                      <img src={qrDataUrl} alt="QR code doubles" className="rounded-xl border border-gray-100 shadow-sm" width={300} height={300} />
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-[220px] text-gray-300 text-sm">Génération…</div>
                  )}

                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                    <span className="text-xs text-gray-500 truncate flex-1 font-mono">{shareUrl}</span>
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    {copiedLink ? 'Lien copié !' : 'Copier le lien'}
                  </button>
                </>
              )}
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
