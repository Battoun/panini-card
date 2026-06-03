'use client';

import { TOTAL_BASE, TOTAL_STICKERS, TOTAL_CC, TEAMS, STICKERS_BY_TEAM } from '../data/album';
import { CollectionData } from '../types';

interface Profile { id: string; username: string }

interface Props {
  friend: Profile;
  collection: CollectionData | null;
  onClose: () => void;
}

function computeStats(collection: CollectionData | null) {
  if (!collection) return null;
  const copies = collection.copies ?? {};
  const collected     = Object.values(copies).filter((v) => v >= 1).length;
  const totalDoubles  = Object.values(copies).reduce((acc, v) => acc + Math.max(0, v - 1), 0);
  const pctBase       = Math.round((collected / TOTAL_BASE) * 100);

  const teamStats = TEAMS.map((team) => {
    const stickers  = STICKERS_BY_TEAM[team.id] ?? [];
    const c         = stickers.filter((s) => (copies[s.id] ?? 0) >= 1).length;
    const pct       = stickers.length > 0 ? Math.round((c / stickers.length) * 100) : 0;
    return { team, collected: c, total: stickers.length, pct };
  });

  const top5  = [...teamStats].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const flop5 = [...teamStats].sort((a, b) => a.pct - b.pct).slice(0, 5);
  const completed = teamStats.filter((t) => t.pct === 100);

  return { collected, totalDoubles, pctBase, top5, flop5, completed };
}

const AVATAR_COLORS = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500','bg-teal-500'];

export function FriendDetailModal({ friend, collection, onClose }: Props) {
  const stats      = computeStats(collection);
  const avatarColor = AVATAR_COLORS[friend.username.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-sm font-black text-white shrink-0`}>
            {friend.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 dark:text-gray-100">@{friend.username}</p>
            {stats && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {stats.collected} vignettes · {stats.pctBase}% de l'album
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {!collection && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">
              Cet ami n'a pas encore synchronisé sa collection.
            </p>
          )}

          {stats && (
            <>
              {/* Progression globale */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4">
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Progression</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.pctBase}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-linear-to-r from-blue-500 to-green-400 rounded-full transition-all duration-500" style={{ width: `${stats.pctBase}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{stats.collected} / {TOTAL_BASE} standards</span>
                  <span>{stats.totalDoubles} doubles</span>
                </div>
              </div>

              {/* Équipes complètes */}
              {stats.completed.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Équipes complètes ({stats.completed.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.completed.map(({ team }) => (
                      <span key={team.id} className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {team.flag} {team.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top 5 */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🏆 Top 5 équipes</p>
                <div className="space-y-2">
                  {stats.top5.map(({ team, collected, total, pct }, i) => (
                    <div key={team.id} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-4 text-right shrink-0">{i + 1}</span>
                      <span className="text-base leading-none shrink-0">{team.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{team.name}</span>
                          <span className="text-xs font-bold text-green-600 dark:text-green-400 ml-1 shrink-0">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0">{collected}/{total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Échange — bientôt */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-center">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-1">🔄 Demande d'échange</p>
            <p className="text-xs text-blue-500 dark:text-blue-500">
              Bientôt — voir ses doubles, proposer un échange directement
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
