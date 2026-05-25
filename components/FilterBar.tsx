'use client';

import { FilterStatus } from '../types';
import { TEAMS, GROUPS } from '../data/album';

interface Props {
  filter: FilterStatus;
  onFilterChange: (f: FilterStatus) => void;
  teamFilter: string;
  onTeamChange: (t: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onShare: () => void;
  onQuickEntry: () => void;
}

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all',       label: 'Tout'          },
  { value: 'missing',   label: 'Manquantes'    },
  { value: 'collected', label: 'Collées'       },
  { value: 'doubles',   label: 'Doubles'       },
  { value: 'almost',    label: '🎯 Presque'    },
];

export function FilterBar({ filter, onFilterChange, teamFilter, onTeamChange, search, onSearchChange, onShare, onQuickEntry }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2">

        {/* Status filter */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={[
                'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                filter === opt.value
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Team filter */}
        <select
          value={teamFilter}
          onChange={(e) => onTeamChange(e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Toutes les équipes</option>
          {GROUPS.map((g) => (
            <optgroup key={g} label={`Groupe ${g}`}>
              {TEAMS.filter((t) => t.group === g).map((t) => (
                <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
              ))}
            </optgroup>
          ))}
          <option value="__special__">✨ Spéciales / Intro</option>
        </select>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="N° ou nom..."
          className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 w-32 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />

        <div className="ml-auto flex gap-2">
          <button
            onClick={onQuickEntry}
            className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            ⚡ Saisie rapide
          </button>
          <button
            onClick={onShare}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Exporter / Partager
          </button>
        </div>
      </div>
    </div>
  );
}
