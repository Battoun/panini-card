'use client';

import { useState, useMemo } from 'react';
import { ALL_STICKERS } from '../data/album';
import { useVintedExchanges, VintedExchange } from '../hooks/useVintedExchanges';

interface Props {
  copies: Record<number, number>;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
}

const STATUS_LABELS: Record<VintedExchange['status'], string> = {
  en_cours: 'En cours',
  envoye:   'Envoyé',
  recu:     'Reçu',
  termine:  'Terminé ✓',
};

const STATUS_COLORS: Record<VintedExchange['status'], string> = {
  en_cours: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  envoye:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  recu:     'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  termine:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const STATUS_DOT: Record<VintedExchange['status'], string> = {
  en_cours: 'bg-amber-400',
  envoye:   'bg-blue-400',
  recu:     'bg-violet-400',
  termine:  'bg-emerald-400',
};

// "FRA4" ou "FRA 4" → "FRA 4" / "CC4" → "CC4" / "FWC4" → "FWC4"
function normalizeId(raw: string): string {
  const s = raw.toUpperCase().trim();
  if (/^(CC\d+|FWC\d+|00)$/.test(s)) return s;
  return s.replace(/^([A-Z]+)\s*(\d+)$/, '$1 $2');
}

function parseCards(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/[\s,;/\n]+/)
    .map(s => normalizeId(s))
    .filter(s => s.length > 0);
}

export function VintedView({ copies, onIncrement, onDecrement }: Props) {
  const { exchanges, persist, hydrated } = useVintedExchanges();
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [username,     setUsername]     = useState('');
  const [givenText,    setGivenText]    = useState('');
  const [receivedText, setReceivedText] = useState('');
  const [money,        setMoney]        = useState('');
  const [moneyDir,     setMoneyDir]     = useState<'receive' | 'pay'>('receive');
  const [status,       setStatus]       = useState<VintedExchange['status']>('en_cours');

  // Map displayId normalisé → id numérique
  const displayIdMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of ALL_STICKERS) map[s.displayId.toUpperCase()] = s.id;
    return map;
  }, []);

  // Nombre de copies disponibles à donner pour un displayId
  const available = (displayId: string): number => {
    const numId = displayIdMap[displayId];
    if (numId === undefined) return -1; // carte inconnue
    return Math.max(0, (copies[numId] ?? 0) - 1);
  };

  // Combien de fois chaque carte est utilisée dans tous les échanges actifs
  const usageMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ex of exchanges.filter(e => e.status !== 'termine')) {
      for (const card of ex.cardsGiven) {
        map[card] = (map[card] ?? 0) + 1;
      }
    }
    return map;
  }, [exchanges]);

  // Alertes pour une carte donnée (renvoie null si ok)
  const cardAlert = (card: string, exId: string): 'missing' | 'overused' | null => {
    const avail = available(card);
    if (avail === -1) return null; // carte inconnue, on ne bloque pas
    if (avail === 0) return 'missing';
    // Combien en a-t-on besoin en tout ? L'échange courant + les autres
    const totalNeeded = usageMap[card] ?? 1;
    if (totalNeeded > avail) return 'overused';
    return null;
  };

  // Alertes résumées pour tout un échange
  const exchangeAlerts = (ex: VintedExchange): { missing: string[]; overused: string[] } => {
    const missing: string[] = [];
    const overused: string[] = [];
    for (const card of ex.cardsGiven) {
      const a = cardAlert(card, ex.id);
      if (a === 'missing') missing.push(card);
      else if (a === 'overused') overused.push(card);
    }
    return { missing, overused };
  };

  const resetForm = () => {
    setUsername(''); setGivenText(''); setReceivedText('');
    setMoney(''); setMoneyDir('receive'); setStatus('en_cours');
    setEditingId(null); setShowForm(false);
  };

  const openEdit = (ex: VintedExchange) => {
    setUsername(ex.username);
    setGivenText(ex.cardsGiven.join(' '));
    setReceivedText(ex.cardsReceived.join(' '));
    const abs = Math.abs(ex.money);
    setMoney(abs === 0 ? '' : String(abs));
    setMoneyDir(ex.money >= 0 ? 'receive' : 'pay');
    setStatus(ex.status);
    setEditingId(ex.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!username.trim()) return;
    const moneyVal = money ? (parseFloat(money) || 0) * (moneyDir === 'pay' ? -1 : 1) : 0;

    if (editingId) {
      persist(exchanges.map(ex => ex.id === editingId
        ? { ...ex, username: username.trim(), cardsGiven: parseCards(givenText), cardsReceived: parseCards(receivedText), money: moneyVal, status }
        : ex
      ));
    } else {
      persist([...exchanges, {
        id: Date.now().toString(),
        username: username.trim(),
        cardsGiven: parseCards(givenText),
        cardsReceived: parseCards(receivedText),
        money: moneyVal,
        status,
        createdAt: Date.now(),
      }]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cet échange ?')) persist(exchanges.filter(ex => ex.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: VintedExchange['status']) => {
    const ex = exchanges.find(e => e.id === id);
    if (!ex) return;

    let applied = ex.appliedToCollection ?? false;

    if (newStatus === 'termine' && !applied) {
      // Appliquer au stock : retirer les données, ajouter les reçues
      for (const card of ex.cardsGiven) {
        const numId = displayIdMap[card];
        if (numId) onDecrement(numId);
      }
      for (const card of ex.cardsReceived) {
        const numId = displayIdMap[card];
        if (numId) onIncrement(numId);
      }
      applied = true;
    } else if (newStatus !== 'termine' && applied) {
      // Annuler si on repasse en arrière
      for (const card of ex.cardsGiven) {
        const numId = displayIdMap[card];
        if (numId) onIncrement(numId);
      }
      for (const card of ex.cardsReceived) {
        const numId = displayIdMap[card];
        if (numId) onDecrement(numId);
      }
      applied = false;
    }

    persist(exchanges.map(e => e.id === id ? { ...e, status: newStatus, appliedToCollection: applied } : e));
  };

  // Trier par date de création (premier arrivé = priorité 1)
  const active = [...exchanges.filter(e => e.status !== 'termine')].sort((a, b) => a.createdAt - b.createdAt);
  const done   = [...exchanges.filter(e => e.status === 'termine')].sort((a, b) => b.createdAt - a.createdAt);

  // Nombre d'échanges avec alertes
  const alertCount = active.filter(ex => {
    const { missing, overused } = exchangeAlerts(ex);
    return missing.length > 0 || overused.length > 0;
  }).length;

  // Cartes données préviewées dans le form
  const givenPreview = parseCards(givenText);
  const givenIssues  = givenPreview.filter(c => {
    const avail = available(c);
    return avail === 0;
  });

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Chargement des échanges…
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Échanges Vinted</h2>
          {exchanges.length > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {active.length} en cours · {done.length} terminé{done.length > 1 ? 's' : ''}
              {alertCount > 0 && (
                <span className="ml-2 text-orange-500 font-semibold">· ⚠️ {alertCount} alerte{alertCount > 1 ? 's' : ''}</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          Nouvel échange
        </button>
      </div>

      {/* Légende priorité */}
      {active.length > 1 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          Les échanges sont classés par ordre d'arrivée — le n°1 est le plus prioritaire à honorer.
        </p>
      )}
      {active.length <= 1 && <div className="mb-6" />}

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">
              {editingId ? 'Modifier l\'échange' : 'Nouvel échange'}
            </h3>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pseudo Vinted</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ex: martin_panini"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-gray-300 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-red-500 dark:text-red-400 mb-2">Cartes que je donne</label>
                <textarea
                  value={givenText}
                  onChange={e => setGivenText(e.target.value)}
                  placeholder={"FRA4 ESP12 BEL3\nKOR3 MAR16 ..."}
                  rows={4}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-red-50/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-300 font-mono resize-none placeholder:text-gray-300 dark:placeholder:text-gray-500"
                />
                <div className="flex items-center justify-between mt-1">
                  {givenPreview.length > 0 && (
                    <p className="text-xs text-gray-400">{givenPreview.length} carte{givenPreview.length > 1 ? 's' : ''}</p>
                  )}
                  {givenIssues.length > 0 && (
                    <p className="text-xs text-orange-500 font-semibold">
                      ⚠️ {givenIssues.join(', ')} : pas en double
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Cartes que je reçois</label>
                <textarea
                  value={receivedText}
                  onChange={e => setReceivedText(e.target.value)}
                  placeholder={"KOR3 MAR16 NED14\nAUT15 ENG8 ..."}
                  rows={4}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-emerald-50/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono resize-none placeholder:text-gray-300 dark:placeholder:text-gray-500"
                />
                {receivedText && (
                  <p className="text-xs text-gray-400 mt-1">{parseCards(receivedText).length} carte{parseCards(receivedText).length > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Argent <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={moneyDir}
                    onChange={e => setMoneyDir(e.target.value as 'receive' | 'pay')}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  >
                    <option value="receive">Je reçois</option>
                    <option value="pay">Je paye</option>
                  </select>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={money}
                      onChange={e => setMoney(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-8 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Statut</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as VintedExchange['status'])}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!username.trim()}
              className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-bold transition-colors"
            >
              {editingId ? 'Enregistrer les modifications' : 'Ajouter l\'échange'}
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* État vide */}
      {exchanges.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-5">
            <span className="text-4xl">📦</span>
          </div>
          <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">Aucun échange en cours</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Ajoute un échange Vinted pour le suivre ici</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            + Créer mon premier échange
          </button>
        </div>
      )}

      {/* Échanges actifs triés par priorité */}
      {active.length > 0 && (
        <div className="space-y-4 mb-8">
          {active.map((ex, idx) => {
            const alerts = exchangeAlerts(ex);
            return (
              <ExchangeCard
                key={ex.id}
                ex={ex}
                priority={idx + 1}
                alerts={alerts}
                usageMap={usageMap}
                available={available}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            );
          })}
        </div>
      )}

      {/* Échanges terminés */}
      {done.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Terminés ({done.length})
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="space-y-3 opacity-50">
            {done.map(ex => (
              <ExchangeCard
                key={ex.id}
                ex={ex}
                priority={null}
                alerts={{ missing: [], overused: [] }}
                usageMap={{}}
                available={available}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExchangeCard({
  ex,
  priority,
  alerts,
  usageMap,
  available,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  ex: VintedExchange;
  priority: number | null;
  alerts: { missing: string[]; overused: string[] };
  usageMap: Record<string, number>;
  available: (card: string) => number;
  onEdit: (ex: VintedExchange) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: VintedExchange['status']) => void;
}) {
  const hasAlert = alerts.missing.length > 0 || alerts.overused.length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden ${
      hasAlert ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Badge priorité */}
          {priority !== null && (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
              priority === 1
                ? 'bg-orange-500 text-white'
                : priority === 2
                  ? 'bg-gray-400 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
            }`}>
              {priority}
            </div>
          )}
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white font-black text-base leading-none">V</span>
          </div>
          <div>
            <p className="font-bold text-gray-800 dark:text-gray-100">@{ex.username}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {ex.cardsGiven.length} donnée{ex.cardsGiven.length > 1 ? 's' : ''} · {ex.cardsReceived.length} reçue{ex.cardsReceived.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <select
          value={ex.status}
          onChange={e => onStatusChange(ex.id, e.target.value as VintedExchange['status'])}
          className={`appearance-none pl-6 pr-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer ${STATUS_COLORS[ex.status]}`}
          style={{ backgroundImage: 'none' }}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Alertes */}
      {hasAlert && (
        <div className="px-5 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 space-y-1">
          {alerts.missing.length > 0 && (
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              ⚠️ Tu n'as pas ces doubles : <span className="font-mono">{alerts.missing.join('  ')}</span>
            </p>
          )}
          {alerts.overused.length > 0 && (
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              ⚠️ Utilisée dans plusieurs échanges, stock insuffisant : <span className="font-mono">{alerts.overused.join('  ')}</span>
            </p>
          )}
        </div>
      )}

      {/* Corps : cartes */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-2">
            Je donne · {ex.cardsGiven.length}
          </p>
          {ex.cardsGiven.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {ex.cardsGiven.map((card, i) => {
                const avail = available(card);
                const totalUsed = usageMap[card] ?? 1;
                const isProblematic = avail === 0 || (avail > 0 && totalUsed > avail);
                return (
                  <span
                    key={i}
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      isProblematic
                        ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-bold'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {card}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-300 dark:text-gray-600 italic">Aucune</p>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
            Je reçois · {ex.cardsReceived.length}
          </p>
          {ex.cardsReceived.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {ex.cardsReceived.map((card, i) => (
                <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {card}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 dark:text-gray-600 italic">Aucune</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700">
        <div>
          {ex.money !== 0 ? (
            <span className={`text-sm font-bold ${ex.money > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {ex.money > 0 ? `💸 +${ex.money.toFixed(2)} € à recevoir` : `💳 −${Math.abs(ex.money).toFixed(2)} € à payer`}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Échange sans argent</span>
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={() => onEdit(ex)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Modifier</button>
          <button onClick={() => onDelete(ex.id)} className="text-sm font-semibold text-red-500 dark:text-red-400 hover:underline">Supprimer</button>
        </div>
      </div>
    </div>
  );
}
