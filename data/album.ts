import { Sticker, Team, Confederation } from '../types';

// Équipes ordonnées par groupe (tirage officiel décembre 2025)
// code = code FIFA officiel à 3 lettres (ex: FRA, ARG…)
const TEAMS_CONFIG: {
  id: string;
  name: string;
  code: string;
  confederation: Confederation;
  flag: string;
  group: string;
}[] = [
  // Groupe A
  { id: 'mexico',       name: 'Mexique',           code: 'MEX', confederation: 'CONCACAF', flag: '🇲🇽', group: 'A' },
  { id: 'south-africa', name: 'Afrique du Sud',     code: 'RSA', confederation: 'CAF',      flag: '🇿🇦', group: 'A' },
  { id: 'south-korea',  name: 'Corée du Sud',       code: 'KOR', confederation: 'AFC',      flag: '🇰🇷', group: 'A' },
  { id: 'czechia',      name: 'Tchéquie',           code: 'CZE', confederation: 'UEFA',     flag: '🇨🇿', group: 'A' },
  // Groupe B
  { id: 'canada',       name: 'Canada',             code: 'CAN', confederation: 'CONCACAF', flag: '🇨🇦', group: 'B' },
  { id: 'bosnia',       name: 'Bosnie-Herzégovine', code: 'BIH', confederation: 'UEFA',     flag: '🇧🇦', group: 'B' },
  { id: 'qatar',        name: 'Qatar',              code: 'QAT', confederation: 'AFC',      flag: '🇶🇦', group: 'B' },
  { id: 'switzerland',  name: 'Suisse',             code: 'SUI', confederation: 'UEFA',     flag: '🇨🇭', group: 'B' },
  // Groupe C
  { id: 'brazil',       name: 'Brésil',             code: 'BRA', confederation: 'CONMEBOL', flag: '🇧🇷', group: 'C' },
  { id: 'morocco',      name: 'Maroc',              code: 'MAR', confederation: 'CAF',      flag: '🇲🇦', group: 'C' },
  { id: 'haiti',        name: 'Haïti',              code: 'HAI', confederation: 'CONCACAF', flag: '🇭🇹', group: 'C' },
  { id: 'scotland',     name: 'Écosse',             code: 'SCO', confederation: 'UEFA',     flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C' },
  // Groupe D
  { id: 'usa',          name: 'États-Unis',         code: 'USA', confederation: 'CONCACAF', flag: '🇺🇸', group: 'D' },
  { id: 'paraguay',     name: 'Paraguay',           code: 'PAR', confederation: 'CONMEBOL', flag: '🇵🇾', group: 'D' },
  { id: 'australia',    name: 'Australie',          code: 'AUS', confederation: 'AFC',      flag: '🇦🇺', group: 'D' },
  { id: 'turkey',       name: 'Türkiye',            code: 'TUR', confederation: 'UEFA',     flag: '🇹🇷', group: 'D' },
  // Groupe E
  { id: 'germany',      name: 'Allemagne',          code: 'GER', confederation: 'UEFA',     flag: '🇩🇪', group: 'E' },
  { id: 'curacao',      name: 'Curaçao',            code: 'CUW', confederation: 'CONCACAF', flag: '🇨🇼', group: 'E' },
  { id: 'ivory-coast',  name: "Côte d'Ivoire",      code: 'CIV', confederation: 'CAF',      flag: '🇨🇮', group: 'E' },
  { id: 'ecuador',      name: 'Équateur',           code: 'ECU', confederation: 'CONMEBOL', flag: '🇪🇨', group: 'E' },
  // Groupe F
  { id: 'netherlands',  name: 'Pays-Bas',           code: 'NED', confederation: 'UEFA',     flag: '🇳🇱', group: 'F' },
  { id: 'japan',        name: 'Japon',              code: 'JPN', confederation: 'AFC',      flag: '🇯🇵', group: 'F' },
  { id: 'sweden',       name: 'Suède',              code: 'SWE', confederation: 'UEFA',     flag: '🇸🇪', group: 'F' },
  { id: 'tunisia',      name: 'Tunisie',            code: 'TUN', confederation: 'CAF',      flag: '🇹🇳', group: 'F' },
  // Groupe G
  { id: 'belgium',      name: 'Belgique',           code: 'BEL', confederation: 'UEFA',     flag: '🇧🇪', group: 'G' },
  { id: 'egypt',        name: 'Égypte',             code: 'EGY', confederation: 'CAF',      flag: '🇪🇬', group: 'G' },
  { id: 'iran',         name: 'Iran',               code: 'IRN', confederation: 'AFC',      flag: '🇮🇷', group: 'G' },
  { id: 'new-zealand',  name: 'Nouvelle-Zélande',   code: 'NZL', confederation: 'OFC',      flag: '🇳🇿', group: 'G' },
  // Groupe H
  { id: 'spain',        name: 'Espagne',            code: 'ESP', confederation: 'UEFA',     flag: '🇪🇸', group: 'H' },
  { id: 'cape-verde',   name: 'Cap-Vert',           code: 'CPV', confederation: 'CAF',      flag: '🇨🇻', group: 'H' },
  { id: 'saudi-arabia', name: 'Arabie Saoudite',    code: 'KSA', confederation: 'AFC',      flag: '🇸🇦', group: 'H' },
  { id: 'uruguay',      name: 'Uruguay',            code: 'URU', confederation: 'CONMEBOL', flag: '🇺🇾', group: 'H' },
  // Groupe I
  { id: 'france',       name: 'France',             code: 'FRA', confederation: 'UEFA',     flag: '🇫🇷', group: 'I' },
  { id: 'senegal',      name: 'Sénégal',            code: 'SEN', confederation: 'CAF',      flag: '🇸🇳', group: 'I' },
  { id: 'iraq',         name: 'Irak',               code: 'IRQ', confederation: 'AFC',      flag: '🇮🇶', group: 'I' },
  { id: 'norway',       name: 'Norvège',            code: 'NOR', confederation: 'UEFA',     flag: '🇳🇴', group: 'I' },
  // Groupe J
  { id: 'argentina',    name: 'Argentine',          code: 'ARG', confederation: 'CONMEBOL', flag: '🇦🇷', group: 'J' },
  { id: 'algeria',      name: 'Algérie',            code: 'ALG', confederation: 'CAF',      flag: '🇩🇿', group: 'J' },
  { id: 'austria',      name: 'Autriche',           code: 'AUT', confederation: 'UEFA',     flag: '🇦🇹', group: 'J' },
  { id: 'jordan',       name: 'Jordanie',           code: 'JOR', confederation: 'AFC',      flag: '🇯🇴', group: 'J' },
  // Groupe K
  { id: 'portugal',     name: 'Portugal',           code: 'POR', confederation: 'UEFA',     flag: '🇵🇹', group: 'K' },
  { id: 'dr-congo',     name: 'RD Congo',           code: 'COD', confederation: 'CAF',      flag: '🇨🇩', group: 'K' },
  { id: 'uzbekistan',   name: 'Ouzbékistan',        code: 'UZB', confederation: 'AFC',      flag: '🇺🇿', group: 'K' },
  { id: 'colombia',     name: 'Colombie',           code: 'COL', confederation: 'CONMEBOL', flag: '🇨🇴', group: 'K' },
  // Groupe L
  { id: 'england',      name: 'Angleterre',         code: 'ENG', confederation: 'UEFA',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L' },
  { id: 'croatia',      name: 'Croatie',            code: 'CRO', confederation: 'UEFA',     flag: '🇭🇷', group: 'L' },
  { id: 'ghana',        name: 'Ghana',              code: 'GHA', confederation: 'CAF',      flag: '🇬🇭', group: 'L' },
  { id: 'panama',       name: 'Panama',             code: 'PAN', confederation: 'CONCACAF', flag: '🇵🇦', group: 'L' },
];

// ─── Numérotation officielle ────────────────────────────────────────────────
// Vignettes intro  : IDs internes 1–20,    affichées FWC0…FWC19
// Vignettes équipes: IDs internes 21–980,  affichées [CODE] 1…[CODE] 20
// Vignettes Coca-Cola: IDs internes 981–992, affichées CC1…CC12
const TEAM_INTERNAL_START = 21;
const CC_INTERNAL_START   = 981;
const STICKERS_PER_TEAM   = 20;

export type TeamWithCode = Team & { group: string; code: string };

export const TEAMS: TeamWithCode[] = TEAMS_CONFIG.map((t, i) => ({
  ...t,
  stickerStart: TEAM_INTERNAL_START + i * STICKERS_PER_TEAM,
  stickerEnd:   TEAM_INTERNAL_START + (i + 1) * STICKERS_PER_TEAM - 1,
}));

// ─── Vignettes spéciales FWC ─────────────────────────────────────────────────
// #00        : Panini couverture
// FWC1–FWC2  : Official Emblem (×2)
// FWC3       : Mascot
// FWC4       : Affiche officielle
// FWC5       : Ballon officiel
// FWC6       : Trophée
// FWC7–FWC8  : Host Country Emblem (×2)
// FWC9–FWC19 : FIFA Museum – éditions sélectionnées (11 stickers)
const FIFA_MUSEUM: { displayId: string; label: string }[] = [
  { displayId: 'FWC9',  label: 'Italie 1934'     },
  { displayId: 'FWC10', label: 'Uruguay 1950'    },
  { displayId: 'FWC11', label: 'Allemagne 1954'  },
  { displayId: 'FWC12', label: 'Brésil 1962'     },
  { displayId: 'FWC13', label: 'Allemagne 1974'  },
  { displayId: 'FWC14', label: 'Argentine 1986'  },
  { displayId: 'FWC15', label: 'Brésil 1994'     },
  { displayId: 'FWC16', label: 'Brésil 2002'     },
  { displayId: 'FWC17', label: 'Italie 2006'     },
  { displayId: 'FWC18', label: 'Allemagne 2014'  },
  { displayId: 'FWC19', label: 'Argentine 2022'  },
];

const SPECIAL_STICKERS: Sticker[] = [
  { id: 1,  displayId: '00',    type: 'special', name: 'Panini – Couverture',                foil: true },
  { id: 2,  displayId: 'FWC1',  type: 'special', name: 'Official Emblem',                   foil: true },
  { id: 3,  displayId: 'FWC2',  type: 'special', name: 'Official Emblem',                   foil: true },
  { id: 4,  displayId: 'FWC3',  type: 'special', name: 'Mascot',                            foil: true },
  { id: 5,  displayId: 'FWC4',  type: 'special', name: 'Affiche officielle'                            },
  { id: 6,  displayId: 'FWC5',  type: 'special', name: 'Ballon officiel'                              },
  { id: 7,  displayId: 'FWC6',  type: 'special', name: 'Trophée FIFA World Cup',            foil: true },
  { id: 8,  displayId: 'FWC7',  type: 'special', name: 'Host Country Emblem',               foil: true },
  { id: 9,  displayId: 'FWC8',  type: 'special', name: 'Host Country Emblem',               foil: true },
  // FWC9–FWC19 : FIFA Museum
  ...FIFA_MUSEUM.map((m, i) => ({
    id:        10 + i,
    displayId: m.displayId,
    type:      'special' as const,
    name:      `FIFA Museum – ${m.label}`,
    foil:      true,
  })),
];

// ─── Vignettes équipes ───────────────────────────────────────────────────────
// Format officiel : [CODE] 1 à [CODE] 20
//   [CODE] 1  = Écusson (foil)
//   [CODE] 2  à [CODE] 12 = Joueurs 1–11
//   [CODE] 13 = Photo d'équipe
//   [CODE] 14 à [CODE] 20 = Joueurs 12–18
function generateTeamStickers(team: TeamWithCode, teamIndex: number): Sticker[] {
  const stickers: Sticker[] = [];
  const internalBase = TEAM_INTERNAL_START + teamIndex * STICKERS_PER_TEAM;
  const c = team.code;

  // Position 1 – Écusson (foil)
  stickers.push({
    id: internalBase,
    displayId: `${c} 1`,
    teamId: team.id,
    type: 'badge',
    name: `${team.name} – Écusson`,
    foil: true,
  });

  // Positions 2–12 – Joueurs 1–11
  for (let i = 1; i <= 11; i++) {
    stickers.push({
      id: internalBase + i,
      displayId: `${c} ${1 + i}`,
      teamId: team.id,
      type: 'player',
      name: `${team.name} – Joueur ${i}`,
    });
  }

  // Position 13 – Photo d'équipe
  stickers.push({
    id: internalBase + 12,
    displayId: `${c} 13`,
    teamId: team.id,
    type: 'photo',
    name: `${team.name} – Photo d'équipe`,
  });

  // Positions 14–20 – Joueurs 12–18
  for (let i = 12; i <= 18; i++) {
    stickers.push({
      id: internalBase + 1 + i,
      displayId: `${c} ${2 + i}`,
      teamId: team.id,
      type: 'player',
      name: `${team.name} – Joueur ${i}`,
    });
  }

  return stickers;
}

// ─── Vignettes Coca-Cola (CC1–CC12) ──────────────────────────────────────────
// Exclusives – étiquettes de bouteilles Coca-Cola (hors packs standards)
// Joueurs exacts visibles sur la page Coca-Cola de l'album (CC1–CC12)
const CC_PLAYERS = [
  'Lamine Yamal',        // CC1
  'Joshua Kimmich',      // CC2
  'Eduardo Camavinga',   // CC3
  'Joško Gvardiol',      // CC4
  'Federico Valverde',   // CC5
  'Virgil van Dijk',     // CC6
  'Alphonso Davies',     // CC7
  'Raúl Jiménez',        // CC8
  'William Saliba',      // CC9
  'Lautaro Martínez',    // CC10
  'Harry Kane',          // CC11
  'Antonee Robinson',    // CC12
];

const COCA_COLA_STICKERS: Sticker[] = CC_PLAYERS.map((player, i) => ({
  id:        CC_INTERNAL_START + i,
  displayId: `CC${i + 1}`,
  type:      'special' as const,
  name:      `Coca-Cola – ${player}`,
  foil:      true,
}));

// ─── Exports ──────────────────────────────────────────────────────────────────
export const ALL_STICKERS: Sticker[] = [
  ...SPECIAL_STICKERS,
  ...TEAMS.flatMap((team, i) => generateTeamStickers(team, i)),
  ...COCA_COLA_STICKERS,
];

export const STICKERS_BY_ID: Record<number, Sticker> = Object.fromEntries(
  ALL_STICKERS.map((s) => [s.id, s])
);

export const STICKERS_BY_TEAM: Record<string, Sticker[]> = Object.fromEntries(
  TEAMS.map((t, i) => [t.id, generateTeamStickers(t, i)])
);

export const TOTAL_STICKERS = ALL_STICKERS.length; // 992 (980 standards + 12 CC)
export const TOTAL_BASE     = 980;
export const TOTAL_CC       = 12;

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type GroupLetter = typeof GROUPS[number];
