'use client';

import { memo } from 'react';
import { Sticker } from '../types';

interface Props {
  sticker: Sticker;
  copies: number;
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
}

export const StickerCard = memo(function StickerCard({ sticker, copies, onIncrement, onDecrement }: Props) {
  const collected = copies >= 1;
  const doubles   = Math.max(0, copies - 1);
  const isSpecial = sticker.type === 'badge' || sticker.foil;

  const parts     = sticker.displayId.split(' ');
  const codeLabel = parts.length === 2 ? parts[0] : null;
  const numLabel  = parts.length === 2 ? parts[1] : sticker.displayId;

  return (
    <div
      className={[
        'relative flex flex-col items-center rounded-lg border text-center select-none transition-all duration-150',
        'w-full h-[72px] p-0.5 gap-0 min-w-0 overflow-hidden',
        collected
          ? doubles > 0
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 shadow-sm shadow-orange-200 dark:shadow-none'
            : 'bg-green-50 dark:bg-green-900/20 border-green-400 shadow-sm shadow-green-200 dark:shadow-none'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 opacity-60',
      ].join(' ')}
    >
      <div className="flex flex-col items-center leading-none mt-0.5">
        {codeLabel && (
          <span className="text-[7px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-none">
            {codeLabel}
          </span>
        )}
        <span
          className={[
            'text-xs font-black leading-none',
            isSpecial
              ? 'text-yellow-600 dark:text-yellow-400'
              : collected
                ? doubles > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-400'
                : 'text-gray-400 dark:text-gray-500',
          ].join(' ')}
        >
          {numLabel}
          {isSpecial && <span className="ml-0.5 text-yellow-400 text-[10px]">★</span>}
        </span>
      </div>

      <span className="text-[7px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2 w-full px-0.5 text-center">
        {shortName(sticker)}
      </span>

      <div className="flex items-center gap-0.5 mt-auto">
        <button
          onClick={() => {
            if (copies === 1 && !window.confirm(`Retirer ${sticker.displayId} de ta collection ?`)) return;
            onDecrement(sticker.id);
          }}
          className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Retirer"
        >−</button>
        <span
          className={[
            'w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center',
            collected
              ? doubles > 0 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
          ].join(' ')}
        >
          {copies === 0 ? '–' : copies}
        </span>
        <button
          onClick={() => onIncrement(sticker.id)}
          className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Ajouter"
        >+</button>
      </div>

      {doubles > 0 && (
        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
          +{doubles}
        </span>
      )}
    </div>
  );
});

function shortName(sticker: Sticker): string {
  if (sticker.type === 'badge') return 'Écusson ★';
  if (sticker.type === 'photo') return 'Photo';
  if (sticker.type === 'player') {
    const match = sticker.name.match(/Joueur (\d+)/);
    return match ? `Joueur ${match[1]}` : sticker.name;
  }
  const parts = sticker.name.split('–');
  return parts[parts.length - 1].trim();
}
