import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { error } = await supabase
    .from('career_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ error: 'Could not delete conversation.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
