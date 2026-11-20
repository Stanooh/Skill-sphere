import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const progressSchema = z.object({
  stageId: z.string().min(1).max(200),
  itemId: z.string().min(1).max(200),
  itemType: z.enum(['topic', 'exercise', 'project', 'milestone']),
  completed: z.boolean(),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const parsed = progressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid progress update.' }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: owned } = await supabase
    .from('learning_roadmaps')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });

  const { error } = await supabase
    .from('roadmap_progress')
    .upsert({
      roadmap_id: id,
      user_id: auth.user.id,
      stage_id: parsed.data.stageId,
      item_id: parsed.data.itemId,
      item_type: parsed.data.itemType,
      completed: parsed.data.completed,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'roadmap_id,stage_id,item_id,item_type' });
  if (error) return NextResponse.json({ error: 'Could not save progress.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
