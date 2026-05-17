'use client';

import { useMemo, useState } from 'react';
import { ALL_STICKERS, TEAMS, STICKERS_BY_TEAM, TOTAL_STICKERS, TOTAL_BASE, TOTAL_CC, GROUPS } from '../data/album';
import { FilterStatus } from '../types';
import { useCollection } from '../hooks/useCollection';
import { FilterBar } from './FilterBar';
import { StatsBar } from './StatsBar';
import { TeamSection } from './TeamSection';
import { StickerCard } from './StickerCard';
import { SharePanel } from './SharePanel';
import { StatsView } from './StatsView';

type Tab = 'album' | 'stats';

export function AlbumView() {
  const { copies, hydrated, increment, decrement, setPacks, packs, importData, exportData, resetAll, stats } = useCollection();
  const [tab, setTab] = useState<Tab>('album');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showShare, setShowShare] = useState(false);

  const specialStickers = useMemo(() => ALL_STICKERS.filter((s) => !s.teamId && !s.displayId.startsWith('CC')), []);
  const ccStickers      = useMemo(() => ALL_STICKERS.filter((s) => s.displayId.startsWith('CC')), []);

  const showSpecial = !teamFilter || teamFilter === '__special__';
  const showCC      = !teamFilter || teamFilter === '__special__';
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

  const activeFilter = search ? 'all' : filter;
  const isEmpty = filteredSpecial.length === 0 && filteredCC.length === 0 && searchFilteredTeams.length === 0;

  if (!hydrated) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Chargement...
      </div>
    );
  }

  return (
    <>
      <StatsBar collected={stats.collected} doubles={stats.doubles} totalDoubles={stats.totalDoubles} />

      {/* Onglets navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-0">
          {([['album', 'Mon Album'], ['stats', 'Statistiques']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-5 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'stats' && (
        <StatsView
          copies={copies}
          packs={packs}
          onPacksChange={setPacks}
          spent={stats.spent}
          collected={stats.collected}
          totalDoubles={stats.totalDoubles}
        />
      )}

      {tab === 'album' && <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        teamFilter={teamFilter}
        onTeamChange={setTeamFilter}
        search={search}
        onSearchChange={setSearch}
        onShare={() => setShowShare(true)}
      />}

      {tab === 'album' && <main className="max-w-7xl mx-auto px-4 py-4 flex-1">
        {/* Vignettes spéciales */}
        {showSpecial && filteredSpecial.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✨</span>
              <h2 className="font-bold text-gray-800 text-sm">Vignettes spéciales</h2>
              <span className="text-xs text-gray-400 font-mono">N°1–20</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredSpecial.map((s) => (
                <StickerCard
                  key={s.id}
                  sticker={s}
                  copies={copies[s.id] ?? 0}
                  onIncrement={increment}
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
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                  {g}
                </div>
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Groupe {g}</h3>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {teamsInGroup.map((team) => (
                <TeamSection
                  key={team.id}
                  team={team}
                  stickers={filteredStickersByTeam[team.id] ?? STICKERS_BY_TEAM[team.id] ?? []}
                  copies={copies}
                  filter={activeFilter}
                  onIncrement={increment}
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
              <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
                Coca-Cola – Vignettes exclusives
              </h3>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <p className="text-xs text-gray-400 mb-2 ml-11">
              12 vignettes exclusives trouvées sur les étiquettes de bouteilles Coca-Cola (hors packs)
            </p>
            <div className="flex flex-wrap gap-1.5 ml-0">
              {filteredCC.map((s) => (
                <StickerCard
                  key={s.id}
                  sticker={s}
                  copies={copies[s.id] ?? 0}
                  onIncrement={increment}
                  onDecrement={decrement}
                />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-300 mt-8 mb-4">
          {TOTAL_BASE} vignettes standards + {TOTAL_CC} Coca-Cola · 48 équipes · 12 groupes · FIFA World Cup 2026
        </p>
      </main>}

      {showShare && (
        <SharePanel
          copies={copies}
          onImport={importData}
          onExport={exportData}
          onReset={resetAll}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
