'use client';

import { useMemo } from 'react';
import { TEAMS, STICKERS_BY_TEAM, ALL_STICKERS, TOTAL_STICKERS, TOTAL_BASE, TOTAL_CC } from '../data/album';

const PACK_PRICE = 1.5;

interface Props {
  copies: Record<number, number>;
  packs: number;
  onPacksChange: (n: number) => void;
  spent: number;
  collected: number;
  totalDoubles: number;
}

export function StatsView({ copies, packs, onPacksChange, spent, collected, totalDoubles }: Props) {

  const teamStats = useMemo(() =>
    TEAMS.map((team) => {
      const stickers = STICKERS_BY_TEAM[team.id] ?? [];
      const c        = stickers.filter((s) => (copies[s.id] ?? 0) >= 1).length;
      const d        = stickers.reduce((acc, s) => acc + Math.max(0, (copies[s.id] ?? 0) - 1), 0);
      return { team, collected: c, doubles: d, total: stickers.length, pct: Math.round((c / stickers.length) * 100) };
    }),
  [copies]);

  const sorted  = [...teamStats].sort((a, b) => b.pct - a.pct);
  const top5    = sorted.slice(0, 5);
  const bottom5 = [...sorted].reverse().slice(0, 5);

  const completedTeams = teamStats.filter((t) => t.pct === 100);

  const top3doubles = [...teamStats]
    .filter((t) => t.doubles > 0)
    .sort((a, b) => b.doubles - a.doubles)
    .slice(0, 3);

  const triples = useMemo(() =>
    ALL_STICKERS
      .filter((s) => (copies[s.id] ?? 0) >= 3)
      .map((s) => ({ sticker: s, count: copies[s.id] }))
      .sort((a, b) => b.count - a.count),
  [copies]);

  const stickersReceived = packs * 7;
  const missing          = TOTAL_STICKERS - collected;
  const pctAlbum         = Math.round((collected / TOTAL_BASE) * 100);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex-1 space-y-6">

      {/* ── Paquets & budget ── */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4 text-base">Paquets ouverts</h2>

        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => onPacksChange(packs - 1)}
            disabled={packs <= 0}
            className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 text-xl font-bold flex items-center justify-center transition-colors dark:text-gray-200"
          >−</button>
          <input
            type="number"
            min={0}
            value={packs}
            onChange={(e) => onPacksChange(Number(e.target.value))}
            className="w-24 text-center text-2xl font-black text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-700 rounded-xl py-1.5 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => onPacksChange(packs + 1)}
            className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xl font-bold flex items-center justify-center transition-colors dark:text-gray-200"
          >+</button>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">× {PACK_PRICE} €</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Dépensé"          value={`${spent.toFixed(2)} €`}  color="text-red-600 dark:text-red-400"    bg="bg-red-50 dark:bg-red-900/20"    />
          <StatCard label="Reçues (sachets)" value={String(stickersReceived)} color="text-blue-700 dark:text-blue-400"  bg="bg-blue-50 dark:bg-blue-900/20"  />
          <StatCard label="Vignettes collées" value={String(collected)}       color="text-green-700 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
          <StatCard label="Doubles en main"  value={String(totalDoubles)}     color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/20" />
        </div>

        {packs > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
            Coût moyen par vignette collée :{' '}
            <span className="font-semibold text-gray-600 dark:text-gray-300">
              {collected > 0 ? (spent / collected).toFixed(2) : '–'} €
            </span>
            &nbsp;·&nbsp; Vignettes manquantes : <span className="font-semibold text-gray-600 dark:text-gray-300">{missing}</span>
          </p>
        )}
      </section>

      {/* ── Progression album ── */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-base">Progression de l'album</h2>
        <div className="flex items-end justify-between mb-1">
          <span className="text-3xl font-black text-blue-700 dark:text-blue-400">{pctAlbum}%</span>
          <span className="text-sm text-gray-400 dark:text-gray-500">{collected} / {TOTAL_BASE} vignettes standards</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${pctAlbum}%` }} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
          + {TOTAL_CC} vignettes Coca-Cola trackées séparément
        </p>
      </section>

      {/* ── Équipes complètes ── */}
      {completedTeams.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-base flex items-center gap-2">
            <span>🏅</span> Équipes complètes
            <span className="ml-auto text-sm font-black text-green-600 dark:text-green-400">{completedTeams.length} / {TEAMS.length}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {completedTeams.map(({ team, total }) => (
              <div
                key={team.id}
                className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-3 py-1.5"
              >
                <span className="text-lg leading-none">{team.flag}</span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{team.name}</span>
                <span className="text-[10px] text-green-600 dark:text-green-400 font-bold ml-0.5">✓ {total}/{total}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Top 5 / Flop 5 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TeamRanking title="Top 5 équipes"  emoji="🏆" teams={top5}    color="green" />
        <TeamRanking title="Flop 5 équipes" emoji="📋" teams={bottom5} color="red"   />
      </div>

      {/* ── Top 3 équipes avec le plus de doubles ── */}
      {top3doubles.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-sm flex items-center gap-1.5">
            <span>🔁</span> Top 3 équipes – plus de doubles
          </h2>
          <div className="space-y-2.5">
            {top3doubles.map(({ team, doubles, collected: c, total }, i) => (
              <div key={team.id} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-4 text-right">{i + 1}</span>
                <span className="text-lg leading-none">{team.flag}</span>
                <span className="flex-1 text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{team.name}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{c}/{total} collées</span>
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {doubles} double{doubles > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Vignettes en triple ou plus ── */}
      {triples.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-sm flex items-center gap-1.5">
            <span>⚡</span> Vignettes en triple ou plus ({triples.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {triples.map(({ sticker, count }) => {
              const team = sticker.teamId ? TEAMS.find((t) => t.id === sticker.teamId) : null;
              return (
                <div
                  key={sticker.id}
                  className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1"
                >
                  {team && <span className="text-base leading-none">{team.flag}</span>}
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{sticker.displayId}</span>
                  <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    ×{count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </main>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function TeamRanking({
  title, emoji, teams, color,
}: {
  title: string;
  emoji: string;
  teams: { team: { name: string; flag: string; group: string }; collected: number; total: number; pct: number }[];
  color: 'green' | 'red';
}) {
  const barColor  = color === 'green' ? 'bg-green-400' : 'bg-red-400';
  const textColor = color === 'green' ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 text-sm flex items-center gap-1.5">
        <span>{emoji}</span> {title}
      </h2>
      <div className="space-y-2.5">
        {teams.map(({ team, collected, total, pct }, i) => (
          <div key={team.name} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-4 text-right">{i + 1}</span>
            <span className="text-lg leading-none">{team.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{team.name}</span>
                <span className={`text-xs font-bold ${textColor} ml-1 shrink-0`}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0">{collected}/{total}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
