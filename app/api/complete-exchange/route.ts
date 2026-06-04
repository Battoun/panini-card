import { createClient }      from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies }            from 'next/headers';
import { NextResponse }       from 'next/server';
import { ALL_STICKERS }       from '../../../data/album';
import type { CollectionData, ExchangeHistoryItem } from '../../../types';

const EMPTY: CollectionData = { copies: {}, packs: 0, lastUpdated: '' };

const STICKER_BY_DISPLAY: Record<string, number> = {};
for (const s of ALL_STICKERS) STICKER_BY_DISPLAY[s.displayId] = s.id;

function applyExchange(col: CollectionData, giveDisplayId: string, recvDisplayId: string): CollectionData {
  const giveId = STICKER_BY_DISPLAY[giveDisplayId];
  const recvId = STICKER_BY_DISPLAY[recvDisplayId];
  const copies = { ...col.copies };

  if (giveId != null) {
    const cur = copies[giveId] ?? 0;
    if (cur <= 1) delete copies[giveId]; else copies[giveId] = cur - 1;
  }
  if (recvId != null) {
    copies[recvId] = (copies[recvId] ?? 0) + 1;
  }

  const entry: ExchangeHistoryItem = {
    id:               Date.now() + Math.floor(Math.random() * 1000),
    date:             new Date().toISOString(),
    giveIds:          giveId != null ? [giveId] : [],
    giveDisplayId,
    receiveIds:       recvId != null ? [recvId] : [],
    receiveDisplayId: recvDisplayId,
  };

  return {
    ...col,
    copies,
    exchangeGiven:    Math.max(0, (col.exchangeGiven    ?? 0) + 1),
    exchangeReceived: Math.max(0, (col.exchangeReceived ?? 0) + 1),
    exchangeHistory:  [entry, ...(col.exchangeHistory ?? [])].slice(0, 20),
    lastUpdated:      new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCollection(admin: any, userId: string): Promise<CollectionData> {
  const { data } = await admin.from('collections').select('copies').eq('user_id', userId).maybeSingle();
  if (!data) return EMPTY;
  const raw = data.copies;
  if (raw && typeof raw === 'object' && 'copies' in (raw as object)) return raw as CollectionData;
  return EMPTY;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveCollection(admin: any, userId: string, col: CollectionData) {
  await admin.from('collections').upsert(
    { user_id: userId, copies: col, packs: col.packs, last_updated: col.lastUpdated },
    { onConflict: 'user_id' },
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userClient  = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { requestId } = await request.json();
  if (!requestId) return NextResponse.json({ error: 'requestId manquant' }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: req } = await admin
    .from('exchange_requests').select('*').eq('id', requestId).single();

  if (!req) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  // Seul le demandeur (from) peut terminer
  if (req.from_user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  if (req.status !== 'accepted') return NextResponse.json({ error: 'L\'échange doit être accepté d\'abord' }, { status: 409 });

  // Mise à jour des deux collections
  const [fromCol, toCol] = await Promise.all([
    getCollection(admin, req.from_user_id),
    getCollection(admin, req.to_user_id),
  ]);

  // from donne give_display_id, reçoit recv_display_id
  // to   donne recv_display_id, reçoit give_display_id
  const newFromCol = applyExchange(fromCol, req.give_display_id, req.recv_display_id);
  const newToCol   = applyExchange(toCol,   req.recv_display_id, req.give_display_id);

  await Promise.all([
    saveCollection(admin, req.from_user_id, newFromCol),
    saveCollection(admin, req.to_user_id,   newToCol),
    admin.from('exchange_requests').update({ status: 'completed' }).eq('id', requestId),
  ]);

  return NextResponse.json({ success: true });
}
