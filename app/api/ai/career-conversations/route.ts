import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data, error } = await supabase
    .from('career_conversations')
    .select('id,title,created_at,updated_at,career_messages(role,content,created_at)')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load conversations.' }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}
