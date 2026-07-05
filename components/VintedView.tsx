'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ALL_STICKERS } from '../data/album';
import { useVintedExchanges, VintedExchange } from '../hooks/useVintedExchanges';

interface Props {
  copies: Record<number, number>;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onSaveCollection?: () => Promise<boolean>;
}

const STATUS_LABELS: Record<VintedExchange['status'], string> = {
  validation:  'En cours de validation',
  preparation: 'En préparation',
  envoye:      'Envoyé',
  recu_lui:    'Reçu par lui',
  recu_moi:    'Reçu par moi',
  termine:     'Terminé ✓',
};

const STATUS_COLORS: Record<VintedExchange['status'], string> = {
  validation:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  preparation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  envoye:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  recu_lui:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  recu_moi:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  termine:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

// Stockage compact sans espace : "KOR3", "FWC7", "CC4"
function compactId(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '').trim();
}

function parseCards(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/[\s,;/\n]+/)
    .map(s => compactId(s))
    .filter(s => s.length > 0);
}

// Compact → displayId de l'album : "KOR3" → "KOR 3", "CC4" → "CC4"
function toDisplayId(compact: string): string {
  if (/^(CC\d+|FWC\d+|00)$/.test(compact)) return compact;
  return compact.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
}

export function VintedView({ copies, onIncrement, onDecrement, onSaveCollection }: Props) {
  const { exchanges, persist, hydrated } = useVintedExchanges();

  // Stable ref so setTimeout callbacks always call the latest saveNow (post-render)
  const saveCollectionRef = useRef(onSaveCollection);
  useEffect(() => { saveCollectionRef.current = onSaveCollection; }, [onSaveCollection]);

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [username,        setUsername]        = useState('');
  const [givenText,       setGivenText]       = useState('');
  const [receivedText,    setReceivedText]    = useState('');
  const [money,           setMoney]           = useState('');
  const [moneyDir,        setMoneyDir]        = useState<'receive' | 'pay'>('receive');
  const [status,          setStatus]          = useState<VintedExchange['status']>('validation');
  const [shippingMethod,  setShippingMethod]  = useState<'vinted' | 'manuel'>('vinted');
  const [shippingAddress, setShippingAddress] = useState('');

  // Map compact + spaced → id numérique
  const displayIdMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of ALL_STICKERS) {
      const upper = s.displayId.toUpperCase();
      map[upper] = s.id;
      map[upper.replace(/\s+/g, '')] = s.id;
    }
    return map;
  }, []);

  const available = (card: string): number => {
    const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
    if (numId === undefined) return -1;
    return Math.max(0, (copies[numId] ?? 0) - 1);
  };

  // Combien de fois chaque carte donnée est utilisée dans les échanges actifs
  const usageMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ex of exchanges.filter(e => e.status !== 'termine')) {
      for (const card of ex.cardsGiven) {
        map[card] = (map[card] ?? 0) + 1;
      }
    }
    return map;
  }, [exchanges]);

  // Combien d'échanges actifs reçoivent chaque carte (détecte les conflits)
  const receivedConflictMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ex of exchanges.filter(e => e.status !== 'termine')) {
      for (const card of ex.cardsReceived) {
        map[card] = (map[card] ?? 0) + 1;
      }
    }
    return map;
  }, [exchanges]);

  const cardAlert = (card: string): 'missing' | 'overused' | null => {
    const avail = available(card);
    if (avail === -1) return null;
    if (avail === 0) return 'missing';
    const totalNeeded = usageMap[card] ?? 1;
    if (totalNeeded > avail) return 'overused';
    return null;
  };

  const exchangeAlerts = (ex: VintedExchange): {
    missing: string[];
    overused: string[];
    alreadyOwned: string[];
    receivedConflict: string[];
  } => {
    const missing: string[] = [];
    const overused: string[] = [];
    const alreadyOwned: string[] = [];
    const receivedConflict: string[] = [];
    for (const card of ex.cardsGiven) {
      const a = cardAlert(card);
      if (a === 'missing') missing.push(card);
      else if (a === 'overused') overused.push(card);
    }
    for (const card of ex.cardsReceived) {
      const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
      if (numId !== undefined && (copies[numId] ?? 0) >= 1) alreadyOwned.push(card);
      if ((receivedConflictMap[card] ?? 0) > 1) receivedConflict.push(card);
    }
    return { missing, overused, alreadyOwned, receivedConflict };
  };

  const resetForm = () => {
    setUsername(''); setGivenText(''); setReceivedText('');
    setMoney(''); setMoneyDir('receive'); setStatus('validation');
    setShippingMethod('vinted'); setShippingAddress('');
    setEditingId(null); setShowForm(false);
  };

  const openEdit = (ex: VintedExchange) => {
    setUsername(ex.username);
    setGivenText(ex.cardsGiven.map(compactId).join(' '));
    setReceivedText(ex.cardsReceived.map(compactId).join(' '));
    const abs = Math.abs(ex.money);
    setMoney(abs === 0 ? '' : String(abs));
    setMoneyDir(ex.money >= 0 ? 'receive' : 'pay');
    // Migration : 'en_cours' → 'validation' pour les anciens échanges
    const s = ex.status as string;
    const migratedStatus = s === 'en_cours' ? 'validation' : s === 'recu' ? 'recu_moi' : ex.status;
    setStatus(migratedStatus as VintedExchange['status']);
    setShippingMethod(ex.shippingMethod ?? 'vinted');
    setShippingAddress(ex.shippingAddress ?? '');
    setEditingId(ex.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!username.trim()) return;
    const moneyVal = money ? (parseFloat(money) || 0) * (moneyDir === 'pay' ? -1 : 1) : 0;

    const shipping = {
      shippingMethod,
      shippingAddress: shippingMethod === 'manuel' ? shippingAddress.trim() : '',
    };

    if (editingId) {
      const existing = exchanges.find(e => e.id === editingId);
      let applied = existing?.appliedToCollection ?? false;
      let collectionChanged = false;

      if (status === 'termine' && !applied) {
        // Status changed to done — decrement given cards, increment received cards
        for (const card of parseCards(givenText)) {
          const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
          if (numId !== undefined) onDecrement(numId);
        }
        for (const card of parseCards(receivedText)) {
          const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
          if (numId !== undefined) onIncrement(numId);
        }
        applied = true;
        collectionChanged = true;
      } else if (status !== 'termine' && applied) {
        // Status reverted from done — undo using the previously saved card lists
        for (const card of (existing?.cardsGiven ?? [])) {
          const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
          if (numId !== undefined) onIncrement(numId);
        }
        for (const card of (existing?.cardsReceived ?? [])) {
          const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
          if (numId !== undefined) onDecrement(numId);
        }
        applied = false;
        collectionChanged = true;
      }

      persist(exchanges.map(ex => ex.id === editingId
        ? { ...ex, username: username.trim(), cardsGiven: parseCards(givenText), cardsReceived: parseCards(receivedText), money: moneyVal, status, appliedToCollection: applied, ...shipping }
        : ex
      ));

      if (collectionChanged) {
        setTimeout(() => { saveCollectionRef.current?.(); }, 100);
      }
    } else {
      const now = Date.now();
      persist([...exchanges, {
        id: now.toString(),
        username: username.trim(),
        cardsGiven: parseCards(givenText),
        cardsReceived: parseCards(receivedText),
        money: moneyVal,
        status,
        createdAt: now,
        sortOrder: now,
        ...shipping,
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
    let collectionChanged = false;

    if (newStatus === 'termine' && !applied) {
      for (const card of ex.cardsGiven) {
        const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
        if (numId !== undefined) onDecrement(numId);
      }
      for (const card of ex.cardsReceived) {
        const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
        if (numId !== undefined) onIncrement(numId);
      }
      applied = true;
      collectionChanged = true;
    } else if (newStatus !== 'termine' && applied) {
      for (const card of ex.cardsGiven) {
        const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
        if (numId !== undefined) onIncrement(numId);
      }
      for (const card of ex.cardsReceived) {
        const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
        if (numId !== undefined) onDecrement(numId);
      }
      applied = false;
      collectionChanged = true;
    }

    persist(exchanges.map(e => e.id === id ? { ...e, status: newStatus, appliedToCollection: applied } : e));

    // Force-save collection after React commits the updated state
    if (collectionChanged) {
      setTimeout(() => { saveCollectionRef.current?.(); }, 100);
    }
  };

  // Déplacer un échange dans la liste (swap sortOrder avec le voisin)
  const handleMove = (id: string, dir: 'up' | 'down') => {
    const sorted = [...active];
    const idx = sorted.findIndex(e => e.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    const aOrder = a.sortOrder ?? a.createdAt;
    const bOrder = b.sortOrder ?? b.createdAt;

    persist(exchanges.map(e => {
      if (e.id === a.id) return { ...e, sortOrder: bOrder };
      if (e.id === b.id) return { ...e, sortOrder: aOrder };
      return e;
    }));
  };

  // Trier par sortOrder (ou createdAt si pas encore défini)
  const active = [...exchanges.filter(e => e.status !== 'termine')]
    .sort((a, b) => (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt));
  const done = [...exchanges.filter(e => e.status === 'termine')]
    .sort((a, b) => b.createdAt - a.createdAt);

  const alertCount = active.filter(ex => {
    const { missing, overused, alreadyOwned, receivedConflict } = exchangeAlerts(ex);
    return missing.length > 0 || overused.length > 0 || alreadyOwned.length > 0 || receivedConflict.length > 0;
  }).length;

  // Stats dashboard
  const totalGiven       = active.reduce((s, ex) => s + ex.cardsGiven.length, 0);
  const totalReceived    = active.reduce((s, ex) => s + ex.cardsReceived.length, 0);
  const moneyBalance     = active.reduce((s, ex) => s + ex.money, 0);
  const doneGiven        = done.reduce((s, ex) => s + ex.cardsGiven.length, 0);
  const doneReceived     = done.reduce((s, ex) => s + ex.cardsReceived.length, 0);

  const givenPreview = parseCards(givenText);
  const givenIssues  = givenPreview.filter(c => available(c) === 0);

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

      {/* Dashboard stats */}
      {exchanges.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {/* Échanges actifs */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{active.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">en cours</p>
            {alertCount > 0 && (
              <p className="text-xs text-orange-500 font-semibold mt-1">⚠️ {alertCount} alerte{alertCount > 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Échanges terminés */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{done.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">terminé{done.length > 1 ? 's' : ''}</p>
            {done.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">+{doneReceived} reçues · -{doneGiven} données</p>
            )}
          </div>

          {/* Cartes en jeu */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-black text-red-500 dark:text-red-400">-{totalGiven}</p>
              {totalReceived > 0 && (
                <p className="text-lg font-black text-emerald-500 dark:text-emerald-400">+{totalReceived}</p>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">cartes actives</p>
            {totalGiven !== totalReceived && totalGiven > 0 && totalReceived > 0 && (
              <p className={`text-xs font-semibold mt-1 ${totalReceived - totalGiven > 0 ? 'text-emerald-500' : 'text-orange-400'}`}>
                net {totalReceived - totalGiven > 0 ? '+' : ''}{totalReceived - totalGiven}
              </p>
            )}
          </div>

          {/* Argent */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
            <p className={`text-2xl font-black ${
              moneyBalance > 0 ? 'text-emerald-600 dark:text-emerald-400'
              : moneyBalance < 0 ? 'text-red-500 dark:text-red-400'
              : 'text-gray-400'
            }`}>
              {moneyBalance === 0 ? '—' : `${moneyBalance > 0 ? '+' : ''}${moneyBalance.toFixed(0)}€`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {moneyBalance > 0 ? 'à recevoir' : moneyBalance < 0 ? 'à payer' : 'sans argent'}
            </p>
          </div>
        </div>
      )}

      {active.length > 1 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Priorité manuelle — utilise ▲▼ pour réordonner. Le n°1 est le plus urgent.
        </p>
      )}
      {active.length <= 1 && <div className="mb-2" />}

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

            {/* Mode d'envoi */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mode d&apos;envoi</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setShippingMethod('vinted')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    shippingMethod === 'vinted'
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-teal-300'
                  }`}
                >
                  📦 Envoi Vinted
                </button>
                <button
                  type="button"
                  onClick={() => setShippingMethod('manuel')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    shippingMethod === 'manuel'
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-teal-300'
                  }`}
                >
                  ✉️ Par mes soins
                </button>
              </div>
              {shippingMethod === 'manuel' && (
                <textarea
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  placeholder={"Prénom Nom\n12 rue de la Paix\n75001 Paris"}
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none placeholder:text-gray-300 dark:placeholder:text-gray-500"
                />
              )}
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

      {/* Échanges actifs */}
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
                receivedConflictMap={receivedConflictMap}
                available={available}
                displayIdMap={displayIdMap}
                copies={copies}
                isFirst={idx === 0}
                isLast={idx === active.length - 1}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onMove={handleMove}
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
                alerts={{ missing: [], overused: [], alreadyOwned: [], receivedConflict: [] }}
                usageMap={{}}
                receivedConflictMap={{}}
                available={available}
                displayIdMap={displayIdMap}
                copies={copies}
                isFirst={false}
                isLast={false}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onMove={() => {}}
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
  receivedConflictMap,
  available,
  displayIdMap,
  copies,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onStatusChange,
  onMove,
}: {
  ex: VintedExchange;
  priority: number | null;
  alerts: { missing: string[]; overused: string[]; alreadyOwned: string[]; receivedConflict: string[] };
  usageMap: Record<string, number>;
  receivedConflictMap: Record<string, number>;
  available: (card: string) => number;
  displayIdMap: Record<string, number>;
  copies: Record<number, number>;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (ex: VintedExchange) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: VintedExchange['status']) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
}) {
  const hasAlert = alerts.missing.length > 0 || alerts.overused.length > 0 || alerts.alreadyOwned.length > 0 || alerts.receivedConflict.length > 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden ${
      hasAlert ? 'border-orange-300 dark:border-orange-600' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {/* Flèches de réordonnancement + badge numéro */}
          {priority !== null && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => onMove(ex.id, 'up')}
                disabled={isFirst}
                title="Monter"
                className="w-6 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-[10px]"
              >
                ▲
              </button>
              <button
                onClick={() => onMove(ex.id, 'down')}
                disabled={isLast}
                title="Descendre"
                className="w-6 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-[10px]"
              >
                ▼
              </button>
            </div>
          )}
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
              {ex.cardsGiven.length !== ex.cardsReceived.length && (() => {
                const diff = ex.cardsReceived.length - ex.cardsGiven.length;
                return (
                  <span className={`ml-1.5 font-semibold ${diff > 0 ? 'text-emerald-500' : 'text-orange-400'}`}>
                    ({diff > 0 ? `+${diff}` : diff} pour toi)
                  </span>
                );
              })()}
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
              ⚠️ Tu n&apos;as pas ces doubles : <span className="font-mono">{alerts.missing.join('  ')}</span>
            </p>
          )}
          {alerts.overused.length > 0 && (
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              ⚠️ Stock insuffisant sur plusieurs échanges : <span className="font-mono">{alerts.overused.join('  ')}</span>
            </p>
          )}
          {alerts.alreadyOwned.length > 0 && (
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              ℹ️ Tu as déjà ces cartes : <span className="font-mono">{alerts.alreadyOwned.join('  ')}</span>
            </p>
          )}
          {alerts.receivedConflict.length > 0 && (
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">
              ⚠️ Reçue dans un autre échange aussi : <span className="font-mono">{alerts.receivedConflict.join('  ')}</span>
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
              {ex.cardsReceived.map((card, i) => {
                const numId = displayIdMap[card] ?? displayIdMap[toDisplayId(card)];
                const owned    = numId !== undefined && (copies[numId] ?? 0) >= 1;
                const conflict = (receivedConflictMap[card] ?? 0) > 1;
                return (
                  <span
                    key={i}
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      owned
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                        : conflict
                          ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-bold'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
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
      </div>

      {/* Légende cartes reçues si alertes */}
      {(alerts.alreadyOwned.length > 0 || alerts.receivedConflict.length > 0) && (
        <div className="flex gap-4 px-5 pb-3 text-xs text-gray-400">
          {alerts.alreadyOwned.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-300 dark:bg-blue-700 inline-block" />
              Déjà possédée
            </span>
          )}
          {alerts.receivedConflict.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-300 dark:bg-violet-700 inline-block" />
              Doublon entre échanges
            </span>
          )}
        </div>
      )}

      {/* Envoi */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-start gap-3">
        {ex.shippingMethod === 'manuel' ? (
          <>
            <span className="shrink-0 text-sm font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">✉️ Par mes soins</span>
            {ex.shippingAddress ? (
              <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{ex.shippingAddress}</span>
            ) : (
              <span className="text-xs text-gray-400 italic">Adresse non renseignée</span>
            )}
          </>
        ) : (
          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">📦 Envoi via Vinted</span>
        )}
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
