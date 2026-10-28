'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { ALL_STICKERS, TEAMS, STICKERS_BY_TEAM, STICKERS_BY_ID, TOTAL_BASE, TOTAL_CC, GROUPS } from '../data/album';
import { FilterStatus } from '../types';
import { useCollection } from '../hooks/useCollection';
import { FilterBar } from './FilterBar';
import { StatsBar } from './StatsBar';
import { TeamSection } from './TeamSection';
import { StickerCard } from './StickerCard';
import { SharePanel } from './SharePanel';
import { StatsView } from './StatsView';
import { QuickEntryPanel } from './QuickEntryPanel';
import { SharedDoublesPanel } from './SharedDoublesPanel';
import { CompletionToast, ToastItem } from './CompletionToast';
import { ComparePanel } from './ComparePanel';
import { VintedView } from './VintedView';
import { RareCardsSection } from './RareCardsSection';
import { decodeDoubles } from '../utils/share';

type Tab = 'album' | 'stats' | 'vinted';

export function AlbumView() {
  const { copies, hydrated, increment, decrement, setPacks, packs, importData, exportData, resetAll, stats, recordBatchExchange, recordExchange, undoExchange, setExchangeGiven, setExchangeReceived, exchangeGiven, exchangeReceived, exchangeHistory, saveNow, setRareCard, rareCards } = useCollection();
  const [tab, setTab] = useState<Tab>('album');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showShare, setShowShare]           = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showCompare, setShowCompare]       = useState(false);
  const [sharedDoubles, setSharedDoubles]   = useState<Record<number, number> | null>(null);
  const [toasts, setToasts]                 = useState<ToastItem[]>([]);

  const handleIncrement = useCallback((id: number) => {
    const sticker = STICKERS_BY_ID[id];
    if (sticker?.teamId) {
      const teamStickers = STICKERS_BY_TEAM[sticker.teamId] ?? [];
      const currentCollected = teamStickers.filter((s) => (copies[s.id] ?? 0) >= 1).length;
      if ((copies[id] ?? 0) === 0 && currentCollected === teamStickers.length - 1) {
        const team = TEAMS.find((t) => t.id === sticker.teamId)!;
        const toastId = Date.now();
        setToasts((prev) => [...prev, { id: toastId, teamName: team.name, flag: team.flag }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toastId)), 3500);
      }
    }
    increment(id);
  }, [copies, increment]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('share');
    if (token) {
      const decoded = decodeDoubles(token);
      if (Object.keys(decoded).length > 0) setSharedDoubles(decoded);
      // Nettoie l'URL sans recharger la page
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const specialStickers = useMemo(() => ALL_STICKERS.filter((s) => !s.teamId && !s.displayId.startsWith('CC')), []);
  const ccStickers      = useMemo(() => ALL_STICKERS.filter((s) => s.displayId.startsWith('CC')), []);

  const ccIds = useMemo(() => new Set(ccStickers.map((s) => s.id)), [ccStickers]);
  const collectedBase = useMemo(() =>
    Object.entries(copies).filter(([id, v]) => v >= 1 && !ccIds.has(Number(id))).length,
  [copies, ccIds]);
  const collectedCC = useMemo(() =>
    Object.entries(copies).filter(([id, v]) => v >= 1 && ccIds.has(Number(id))).length,
  [copies, ccIds]);

  const showSpecial = (!teamFilter || teamFilter === '__special__') && filter !== 'almost';
  const showCC      = (!teamFilter || teamFilter === '__special__') && filter !== 'almost';
  const showTeams   = !teamFilter || teamFilter !== '__special__';

  // Teams to display (single team filter or all)
  const visibleTeams = useMemo(() => {
    if (teamFilter && teamFilter !== '__special__') return TEAMS.filter((t) => t.id === teamFilter);
    return TEAMS;
  }, [teamFilter]);

  // Apply search filter on teams
  const searchFilteredTeams = useMemo(() => {
    if (!search) return visibleTeams;
    const q = search.toLowerCase();
    return visibleTeams.filter((t) => {
      if (t.name.toLowerCase().includes(q)) return true;
      return (STICKERS_BY_TEAM[t.id] ?? []).some(
        (s) => String(s.id).includes(q) || s.name.toLowerCase().includes(q)
      );
    });
  }, [visibleTeams, search]);

  // Stickers per team filtered by search
  const filteredStickersByTeam = useMemo(() => {
    if (!search) return STICKERS_BY_TEAM;
    const q = search.toLowerCase();
    const result: typeof STICKERS_BY_TEAM = {};
    for (const t of searchFilteredTeams) {
      result[t.id] = (STICKERS_BY_TEAM[t.id] ?? []).filter(
        (s) => String(s.id).includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchFilteredTeams, search]);

  const filterStickers = (list: typeof specialStickers) =>
    list.filter((s) => {
      const c = copies[s.id] ?? 0;
      if (search) {
        const q = search.toLowerCase();
        return s.displayId.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      }
      if (filter === 'missing')   return c === 0;
      if (filter === 'collected') return c >= 1;
      if (filter === 'doubles')   return c >= 2;
      return true;
    });

  const filteredSpecial = useMemo(() => filterStickers(specialStickers), [specialStickers, copies, filter, search]);
  const filteredCC      = useMemo(() => filterStickers(ccStickers),      [ccStickers, copies, filter, search]);

  // Teams grouped by group letter (only shown groups)
  const teamsByGroup = useMemo(() => {
    const map: Record<string, typeof TEAMS> = {};
    for (const t of searchFilteredTeams) {
      if (!map[t.group]) map[t.group] = [];
      map[t.group].push(t);
    }
    return map;
  }, [searchFilteredTeams]);

  const almostTeams = useMemo(() => {
    if (filter !== 'almost') return null;
    return new Set(
      TEAMS.filter((t) => {
        const stickers = STICKERS_BY_TEAM[t.id] ?? [];
        if (stickers.length === 0) return false;
        const collected = stickers.filter((s) => (copies[s.id] ?? 0) >= 1).length;
        return collected / stickers.length >= 0.9;
      }).map((t) => t.id)
    );
  }, [filter, copies]);

  const activeFilter = search ? 'all' : filter === 'almost' ? 'missing' : filter;
  const isEmpty = filteredSpecial.length === 0 && filteredCC.length === 0 && searchFilteredTeams.length === 0;

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <StatsBar collected={stats.collected} collectedBase={collectedBase} doubles={stats.doubles} totalDoubles={stats.totalDoubles} />

      {/* Onglets navigation */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex gap-0">
          {([['album', 'Mon Album'], ['stats', 'Statistiques']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setTab('vinted')}
            className={[
              'px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
              tab === 'vinted'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            ].join(' ')}
          >
            Vinted
          </button>
        </div>
      </div>

      {tab === 'stats' && (
        <StatsView
          copies={copies}
          packs={packs}
          onPacksChange={setPacks}
          spent={stats.spent}
          collected={stats.collected}
          collectedBase={collectedBase}
          collectedCC={collectedCC}
          totalDoubles={stats.totalDoubles}
          exchangeGiven={exchangeGiven}
          exchangeReceived={exchangeReceived}
          onExchangeGivenChange={setExchangeGiven}
          onExchangeReceivedChange={setExchangeReceived}
          exchangeHistory={exchangeHistory}
          onUndoExchangeEntry={(entry) => {
            (entry.receiveIds ?? []).forEach((id) => decrement(id));
            (entry.giveIds ?? []).forEach((id) => increment(id));
            undoExchange(entry.id);
          }}
        />
      )}

      {tab === 'vinted' && <VintedView copies={copies} onIncrement={handleIncrement} onDecrement={decrement} onSaveCollection={saveNow} />}

      {tab === 'album' && <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        teamFilter={teamFilter}
        onTeamChange={setTeamFilter}
        search={search}
        onSearchChange={setSearch}
        onShare={() => setShowShare(true)}
        onQuickEntry={() => setShowQuickEntry(true)}
        onCompare={() => setShowCompare(true)}
      />}

      {tab === 'album' && <main className="w-full max-w-7xl mx-auto px-1 sm:px-4 py-4 flex-1 overflow-x-hidden">
        {/* Vignettes spéciales */}
        {showSpecial && filteredSpecial.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✨</span>
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Vignettes spéciales</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">N°1–20</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-0.5 sm:gap-1">
              {filteredSpecial.map((s) => (
                <StickerCard
                  key={s.id}
                  sticker={s}
                  copies={copies[s.id] ?? 0}
                  onIncrement={handleIncrement}
                  onDecrement={decrement}
                />
              ))}
            </div>
          </section>
        )}

        {/* Équipes par groupe A–L */}
        {showTeams && GROUPS.map((g) => {
          const teamsInGroup = teamsByGroup[g];
          if (!teamsInGroup || teamsInGroup.length === 0) return null;

          // Check if any team in group has visible stickers under current filter
          const groupHasContent = teamsInGroup.some((t) => {
            const stickers = filteredStickersByTeam[t.id] ?? STICKERS_BY_TEAM[t.id] ?? [];
            return stickers.some((s) => {
              const c = copies[s.id] ?? 0;
              if (activeFilter === 'missing') return c === 0;
              if (activeFilter === 'collected') return c >= 1;
              if (activeFilter === 'doubles') return c >= 2;
              return true;
            });
          });

          if (!groupHasContent) return null;

          return (
            <div key={g} className="mb-2">
              {/* Group header */}
              {(() => {
                const groupTotal     = teamsInGroup.reduce((acc, t) => acc + (STICKERS_BY_TEAM[t.id]?.length ?? 0), 0);
                const groupCollected = teamsInGroup.reduce((acc, t) =>
                  acc + (STICKERS_BY_TEAM[t.id] ?? []).filter((s) => (copies[s.id] ?? 0) >= 1).length, 0);
                const groupPct = groupTotal > 0 ? Math.round((groupCollected / groupTotal) * 100) : 0;
                return (
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                      {g}
                    </div>
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide shrink-0">Groupe {g}</h3>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${groupPct}%` }} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">{groupPct}%</span>
                    </div>
                  </div>
                );
              })()}

              {teamsInGroup
                .filter((team) => !almostTeams || almostTeams.has(team.id))
                .map((team) => (
                <TeamSection
                  key={team.id}
                  team={team}
                  stickers={filteredStickersByTeam[team.id] ?? STICKERS_BY_TEAM[team.id] ?? []}
                  copies={copies}
                  filter={activeFilter}
                  onIncrement={handleIncrement}
                  onDecrement={decrement}
                />
              ))}
            </div>
          );
        })}

        {isEmpty && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">Aucune vignette trouvée pour ces filtres.</p>
          </div>
        )}

        {/* Section Coca-Cola */}
        {showCC && filteredCC.length > 0 && (
          <section className="mt-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-bold text-xs">
                CC
              </div>
              <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wide">
                Coca-Cola – Vignettes exclusives
              </h3>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 ml-11">
              12 vignettes exclusives trouvées sur les étiquettes de bouteilles Coca-Cola (hors packs)
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-0.5 sm:gap-1">
              {filteredCC.map((s) => (
                <StickerCard
                  key={s.id}
                  sticker={s}
                  copies={copies[s.id] ?? 0}
                  onIncrement={handleIncrement}
                  onDecrement={decrement}
                />
              ))}
            </div>
          </section>
        )}

        <RareCardsSection rareCards={rareCards} onSet={setRareCard} />

        <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-4 mb-4">
          {TOTAL_BASE} vignettes standards + {TOTAL_CC} Coca-Cola · 48 équipes · 12 groupes · FIFA World Cup 2026
        </p>
      </main>}

      <CompletionToast toasts={toasts} />

      {showCompare && (
        <ComparePanel
          copies={copies}
          onIncrement={handleIncrement}
          onDecrement={decrement}
          onRecordExchange={recordExchange}
          onUndoExchange={undoExchange}
          exchangeHistory={exchangeHistory}
          onClose={() => setShowCompare(false)}
        />
      )}

      {sharedDoubles && (
        <SharedDoublesPanel
          sharedDoubles={sharedDoubles}
          onClose={() => setSharedDoubles(null)}
        />
      )}

      {showQuickEntry && (
        <QuickEntryPanel
          copies={copies}
          onIncrement={handleIncrement}
          onDecrement={decrement}
          onAddPack={() => setPacks(packs + 1)}
          onRecordBatchExchange={recordBatchExchange}
          onClose={() => setShowQuickEntry(false)}
        />
      )}

      {showShare && (
        <SharePanel
          copies={copies}
          onImport={importData}
          onExport={exportData}
          onReset={resetAll}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
