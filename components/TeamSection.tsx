'use client';

import { memo, useMemo } from 'react';
import { Sticker, FilterStatus } from '../types';
import { TEAMS } from '../data/album';
type Team = typeof TEAMS[number];
import { StickerCard } from './StickerCard';

interface Props {
  team: Team;
  stickers: Sticker[];
  copies: Record<number, number>;
  filter: FilterStatus;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
}

export const TeamSection = memo(function TeamSection({
  team,
  stickers,
  copies,
  filter,
  onIncrement,
  onDecrement,
}: Props) {
  const filtered = useMemo(() => {
    return stickers.filter((s) => {
      const c = copies[s.id] ?? 0;
      if (filter === 'missing') return c === 0;
      if (filter === 'collected') return c >= 1;
      if (filter === 'doubles') return c >= 2;
      return true;
    });
  }, [stickers, copies, filter]);

  const teamCollected = stickers.filter((s) => (copies[s.id] ?? 0) >= 1).length;
  const teamDoubles = stickers.filter((s) => (copies[s.id] ?? 0) >= 2).length;
  const pct = Math.round((teamCollected / stickers.length) * 100);

  if (filtered.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl leading-none">{team.flag}</span>
        <h2 className="font-bold text-gray-800 text-sm">{team.name}</h2>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Gr. {team.group}</span>
        <span className="text-xs text-gray-400 font-mono">{team.confederation}</span>
        <div className="flex items-center gap-1 ml-auto">
          {teamDoubles > 0 && (
            <span className="text-[11px] bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded-full">
              {teamDoubles} doubles
            </span>
          )}
          <span className="text-[11px] text-gray-500 font-mono">
            {teamCollected}/{stickers.length}
          </span>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((s) => (
          <StickerCard
            key={s.id}
            sticker={s}
            copies={copies[s.id] ?? 0}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        ))}
      </div>
    </section>
  );
});
