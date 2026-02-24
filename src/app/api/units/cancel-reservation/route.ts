import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const unit_id = String(body?.unit_id || '').trim();
    if (!unit_id) return NextResponse.json({ ok: false, error: 'missing_unit_id' }, { status: 400 });
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

    await supabase.from('temporary_reservations').delete().eq('unit_id', unit_id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
