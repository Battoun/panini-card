import { createClient }      from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies }            from 'next/headers';
import { NextResponse }       from 'next/server';

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
    .from('exchange_requests').select('to_user_id, status').eq('id', requestId).single();

  if (!req) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  if (req.to_user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  if (req.status !== 'pending') return NextResponse.json({ error: 'Déjà traité' }, { status: 409 });

  // Marque simplement comme accepté — les collections ne bougent pas encore
  await admin.from('exchange_requests').update({ status: 'accepted' }).eq('id', requestId);

  return NextResponse.json({ success: true });
}
