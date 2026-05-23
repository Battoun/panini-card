'use client';

import { useMemo } from 'react';
import { TEAMS, STICKERS_BY_TEAM, ALL_STICKERS, STICKERS_BY_ID, TOTAL_STICKERS, TOTAL_BASE, TOTAL_CC } from '../data/album';

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

  // ── Stats par équipe ──────────────────────────────────────────────────────
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

  // Top 3 équipes avec le plus de doubles
  const top3doubles = [...teamStats]
    .filter((t) => t.doubles > 0)
    .sort((a, b) => b.doubles - a.doubles)
    .slice(0, 3);

  // Vignettes en triples ou plus (copies >= 3)
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
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-4 text-base">Paquets ouverts</h2>

        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => onPacksChange(packs - 1)}
            disabled={packs <= 0}
            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 text-xl font-bold flex items-center justify-center transition-colors"
          >−</button>
          <input
            type="number"
            min={0}
            value={packs}
            onChange={(e) => onPacksChange(Number(e.target.value))}
            className="w-24 text-center text-2xl font-black text-blue-700 border-2 border-blue-200 rounded-xl py-1.5 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => onPacksChange(packs + 1)}
            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-xl font-bold flex items-center justify-center transition-colors"
          >+</button>
          <span className="text-sm text-gray-500 ml-1">× {PACK_PRICE} €</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Dépensé"           value={`${spent.toFixed(2)} €`}  color="text-red-600"   bg="bg-red-50"   />
          <StatCard label="Reçues (sachets)"  value={String(stickersReceived)} color="text-blue-700"  bg="bg-blue-50"  />
          <StatCard label="Vignettes collées" value={String(collected)}        color="text-green-700" bg="bg-green-50" />
          <StatCard label="Doubles en main"   value={String(totalDoubles)}     color="text-orange-600" bg="bg-orange-50" />
        </div>

        {packs > 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Coût moyen par vignette collée :{' '}
            <span className="font-semibold text-gray-600">
              {collected > 0 ? (spent / collected).toFixed(2) : '–'} €
            </span>
            &nbsp;·&nbsp; Vignettes manquantes : <span className="font-semibold text-gray-600">{missing}</span>
          </p>
        )}
      </section>

      {/* ── Progression album ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 mb-3 text-base">Progression de l'album</h2>
        <div className="flex items-end justify-between mb-1">
          <span className="text-3xl font-black text-blue-700">{pctAlbum}%</span>
          <span className="text-sm text-gray-400">{collected} / {TOTAL_BASE} vignettes standards</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${pctAlbum}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          + {TOTAL_CC} vignettes Coca-Cola trackées séparément
        </p>

      </section>

      {/* ── Top 5 / Flop 5 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TeamRanking title="Top 5 équipes"  emoji="🏆" teams={top5}    color="green" />
        <TeamRanking title="Flop 5 équipes" emoji="📋" teams={bottom5} color="red"   />
      </div>

      {/* ── Top 3 équipes avec le plus de doubles ── */}
      {top3doubles.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-1.5">
            <span>🔁</span> Top 3 équipes – plus de doubles
          </h2>
          <div className="space-y-2.5">
            {top3doubles.map(({ team, doubles, collected: c, total }, i) => (
              <div key={team.id} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
                <span className="text-lg leading-none">{team.flag}</span>
                <span className="flex-1 text-xs font-semibold text-gray-700 truncate">{team.name}</span>
                <span className="text-[11px] text-gray-400 font-mono">{c}/{total} collées</span>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {doubles} double{doubles > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Vignettes en triple ou plus ── */}
      {triples.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-1.5">
            <span>⚡</span> Vignettes en triple ou plus ({triples.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {triples.map(({ sticker, count }) => {
              const team = sticker.teamId ? TEAMS.find((t) => t.id === sticker.teamId) : null;
              return (
                <div
                  key={sticker.id}
                  className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1"
                >
                  {team && <span className="text-base leading-none">{team.flag}</span>}
                  <span className="text-xs font-bold text-gray-700">{sticker.displayId}</span>
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

function StatCard({ label, value, color, bg }: {
  label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</p>
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
  const textColor = color === 'green' ? 'text-green-700' : 'text-red-600';

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-1.5">
        <span>{emoji}</span> {title}
      </h2>
      <div className="space-y-2.5">
        {teams.map(({ team, collected, total, pct }, i) => (
          <div key={team.name} className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 w-4 text-right">{i + 1}</span>
            <span className="text-lg leading-none">{team.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-semibold text-gray-700 truncate">{team.name}</span>
                <span className={`text-xs font-bold ${textColor} ml-1 shrink-0`}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 font-mono shrink-0">{collected}/{total}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
