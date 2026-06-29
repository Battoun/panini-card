'use client';

import { useState, useEffect } from 'react';

interface VintedExchange {
  id: string;
  username: string;
  cardsGiven: string[];
  cardsReceived: string[];
  money: number; // positif = je reçois, négatif = je paye
  status: 'en_cours' | 'envoye' | 'recu' | 'termine';
  createdAt: number;
}

const STORAGE_KEY = 'vinted_exchanges';

const STATUS_LABELS: Record<VintedExchange['status'], string> = {
  en_cours: 'En cours',
  envoye:   'Envoyé',
  recu:     'Reçu',
  termine:  'Terminé',
};

const STATUS_COLORS: Record<VintedExchange['status'], string> = {
  en_cours: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  envoye:   'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  recu:     'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  termine:  'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

function parseCards(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/[\s,;/\n]+/)
    .map(s => s.toUpperCase().trim())
    .filter(s => s.length > 0);
}

export function VintedView() {
  const [exchanges, setExchanges] = useState<VintedExchange[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [username,     setUsername]     = useState('');
  const [givenText,    setGivenText]    = useState('');
  const [receivedText, setReceivedText] = useState('');
  const [money,        setMoney]        = useState('');
  const [moneyDir,     setMoneyDir]     = useState<'receive' | 'pay'>('receive');
  const [status,       setStatus]       = useState<VintedExchange['status']>('en_cours');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setExchanges(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (updated: VintedExchange[]) => {
    setExchanges(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const resetForm = () => {
    setUsername(''); setGivenText(''); setReceivedText('');
    setMoney(''); setMoneyDir('receive'); setStatus('en_cours');
    setEditingId(null); setShowForm(false);
  };

  const openNew = () => { resetForm(); setShowForm(true); };

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
    persist(exchanges.map(ex => ex.id === id ? { ...ex, status: newStatus } : ex));
  };

  const active = exchanges.filter(e => e.status !== 'termine');
  const done   = exchanges.filter(e => e.status === 'termine');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-base leading-none">V</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Échanges Vinted</h2>
        </div>
        <button
          onClick={openNew}
          className="bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          + Nouvel échange
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
            {editingId ? 'Modifier l\'échange' : 'Nouvel échange'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pseudo Vinted</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ex: martin_panini"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Cartes que je donne
              </label>
              <textarea
                value={givenText}
                onChange={e => setGivenText(e.target.value)}
                placeholder="FRA4 ESP12 BEL3 ..."
                rows={2}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Cartes que je reçois
              </label>
              <textarea
                value={receivedText}
                onChange={e => setReceivedText(e.target.value)}
                placeholder="KOR3 MAR16 NED14 ..."
                rows={2}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Argent (optionnel)</label>
              <div className="flex gap-2 items-center">
                <select
                  value={moneyDir}
                  onChange={e => setMoneyDir(e.target.value as 'receive' | 'pay')}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                >
                  <option value="receive">Je reçois</option>
                  <option value="pay">Je paye</option>
                </select>
                <input
                  type="number"
                  value={money}
                  onChange={e => setMoney(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.5"
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">€</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as VintedExchange['status'])}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={handleSubmit}
              disabled={!username.trim()}
              className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Vide */}
      {exchanges.length === 0 && !showForm && (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-sm font-medium">Aucun échange en cours</p>
          <p className="text-xs mt-1">Clique sur "+ Nouvel échange" pour en ajouter un</p>
        </div>
      )}

      {/* Échanges actifs */}
      {active.length > 0 && (
        <div className="space-y-4 mb-6">
          {active.map(ex => <ExchangeCard key={ex.id} ex={ex} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />)}
        </div>
      )}

      {/* Échanges terminés */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Terminés ({done.length})</p>
          <div className="space-y-3 opacity-60">
            {done.map(ex => <ExchangeCard key={ex.id} ex={ex} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ExchangeCard({
  ex,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  ex: VintedExchange;
  onEdit: (ex: VintedExchange) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: VintedExchange['status']) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center">
            <span className="text-white font-black text-xs">V</span>
          </div>
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">@{ex.username}</span>
        </div>
        <select
          value={ex.status}
          onChange={e => onStatusChange(ex.id, e.target.value as VintedExchange['status'])}
          className={`text-xs px-2 py-1 rounded-full font-semibold border-0 cursor-pointer ${STATUS_COLORS[ex.status]}`}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
            Je donne {ex.cardsGiven.length > 0 && <span className="font-normal">({ex.cardsGiven.length})</span>}
          </p>
          {ex.cardsGiven.length > 0
            ? <p className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed break-all">{ex.cardsGiven.join(' · ')}</p>
            : <p className="text-xs text-gray-400 italic">—</p>
          }
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
            Je reçois {ex.cardsReceived.length > 0 && <span className="font-normal">({ex.cardsReceived.length})</span>}
          </p>
          {ex.cardsReceived.length > 0
            ? <p className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed break-all">{ex.cardsReceived.join(' · ')}</p>
            : <p className="text-xs text-gray-400 italic">—</p>
          }
        </div>
      </div>

      {/* Argent */}
      {ex.money !== 0 && (
        <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg inline-block mb-2 ${
          ex.money > 0
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        }`}>
          {ex.money > 0
            ? `+ ${ex.money.toFixed(2)} € à recevoir`
            : `− ${Math.abs(ex.money).toFixed(2)} € à payer`
          }
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
        <button onClick={() => onEdit(ex)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          Modifier
        </button>
        <button onClick={() => onDelete(ex.id)} className="text-xs text-red-500 dark:text-red-400 hover:underline">
          Supprimer
        </button>
      </div>
    </div>
  );
}
