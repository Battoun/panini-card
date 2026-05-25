export type StickerType = 'special' | 'badge' | 'photo' | 'jersey' | 'player';

export interface Sticker {
  id: number;
  displayId: string;
  teamId?: string;
  type: StickerType;
  name: string;
  foil?: boolean;
}

export interface Team {
  id: string;
  name: string;
  confederation: Confederation;
  flag: string;
  group: string;
  stickerStart: number;
  stickerEnd: number;
}

export type Confederation = 'CONMEBOL' | 'UEFA' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC' | 'Playoff';

export type FilterStatus = 'all' | 'missing' | 'collected' | 'doubles' | 'almost';

export interface CollectionData {
  copies: Record<number, number>;
  packs: number;
  lastUpdated: string;
  exchangeGiven?: number;
  exchangeReceived?: number;
}
