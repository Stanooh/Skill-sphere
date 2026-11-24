import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createGeminiClient, generateContentWithFallback, geminiErrorMessage } from '@/lib/gemini';

const requestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

const responseSchema = z.object({
  content: z.string().trim().min(1).max(12000),
  includeRoadmapLink: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid question.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'learner') {
    return NextResponse.json({ error: 'Learner access required.' }, { status: 403 });
  }

  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('endpoint', 'career-advisor')
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();

  if ((usage?.request_count ?? 0) >= 20) {
    return NextResponse.json({ error: 'Hourly AI usage limit reached. Please try again later.' }, { status: 429 });
  }

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { data: owned } = await supabase
      .from('career_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!owned) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  } else {
    const { data: created, error: createError } = await supabase
      .from('career_conversations')
      .insert({ user_id: user.id, title: 'Career conversation' })
      .select('id')
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: 'Could not start a conversation.' }, { status: 500 });
    }
    conversationId = created.id;
  }

  const [{ data: learnerProfile }, { data: messages }] = await Promise.all([
    supabase.from('learner_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('career_messages')
      .select('role,content')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(16),
  ]);

  const context = {
    name: user.user_metadata?.name ?? user.email,
    profile: learnerProfile
      ? {
          education: learnerProfile.education,
          learningGoal: learnerProfile.learning_goal,
          targetTimeframe: learnerProfile.target_timeframe,
          availableHoursPerWeek: learnerProfile.available_hours_per_week,
          skillIds: learnerProfile.skill_ids,
          skillLevels: learnerProfile.skill_levels,
        }
      : null,
  };

  const prompt = [
    'You are the SkillSphere Career Advisor. Give practical, personalized career guidance.',
    'Do not promise jobs or guaranteed employment. Do not invent qualifications or profile data.',
    'Adapt to the learner information supplied below. Distinguish estimates and suggestions.',
    'Return only JSON with keys content and includeRoadmapLink.',
    `Learner context: ${JSON.stringify(context)}`,
    `Recent conversation: ${JSON.stringify(messages ?? [])}`,
    `Learner question: ${parsed.data.message}`,
  ].join('\n');

  try {
    const ai = createGeminiClient();
    const result = await generateContentWithFallback(ai, {
      contents: prompt,
      config: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
    });
    const text = result.text ?? '';
    const response = responseSchema.parse(JSON.parse(text));

    await supabase.from('career_messages').insert([
      { conversation_id: conversationId, user_id: user.id, role: 'user', content: parsed.data.message },
      { conversation_id: conversationId, user_id: user.id, role: 'assistant', content: response.content },
    ]);
    await supabase
      .from('career_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    await supabase
      .from('ai_usage')
      .upsert(
        { user_id: user.id, endpoint: 'career-advisor', request_count: (usage?.request_count ?? 0) + 1, window_start: windowStart.toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,endpoint,window_start' }
      );

    return NextResponse.json({ conversationId, ...response });
  } catch (error) {
    return NextResponse.json({ error: geminiErrorMessage(error) }, { status: 502 });
  }
}
