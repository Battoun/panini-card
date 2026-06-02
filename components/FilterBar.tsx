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
  onCompare: () => void;
}

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all',       label: 'Tout'       },
  { value: 'missing',   label: 'Manquantes' },
  { value: 'collected', label: 'Collées'    },
  { value: 'doubles',   label: 'Doubles'    },
  { value: 'almost',    label: '🎯 Presque' },
];

export function FilterBar({ filter, onFilterChange, teamFilter, onTeamChange, search, onSearchChange, onShare, onQuickEntry, onCompare }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">

      {/* Ligne 1 : filtres statuts + boutons action */}
      <div className="max-w-7xl mx-auto px-3 pt-2 pb-1 flex items-center gap-2">

        {/* Filtres statut — scrollable horizontalement sur mobile */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5 overflow-x-auto shrink-0 max-w-full">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={[
                'px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
                filter === opt.value
                  ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Boutons action — icône seul sur mobile, label sur md+ */}
        <div className="ml-auto flex gap-1.5 shrink-0">
          <ActionBtn onClick={onCompare}    icon="🔄" label="Comparer"      color="bg-purple-600 hover:bg-purple-700" />
          <ActionBtn onClick={onQuickEntry} icon="⚡" label="Saisie rapide" color="bg-green-600 hover:bg-green-700"   />
          <ActionBtn onClick={onShare}      icon="📤" label="Partager"      color="bg-blue-600 hover:bg-blue-700"     />
        </div>
      </div>

      {/* Ligne 2 : équipe + recherche */}
      <div className="max-w-7xl mx-auto px-3 pb-2 flex gap-2">
        <select
          value={teamFilter}
          onChange={(e) => onTeamChange(e.target.value)}
          className="flex-1 min-w-0 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
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

        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="N° ou nom..."
          className="w-28 text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

    </div>
  );
}

function ActionBtn({ onClick, icon, label, color }: {
  onClick: () => void; icon: string; label: string; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white rounded-lg transition-colors flex items-center gap-1 px-2 py-1.5`}
      title={label}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="hidden sm:inline text-xs font-semibold">{label}</span>
    </button>
  );
}
