import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createGeminiClient, generateContentWithFallback, geminiErrorMessage } from '@/lib/gemini';

const resourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  suggestedSearch: z.string().optional(),
});

const stageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedDuration: z.string(),
  topics: z.array(z.object({ id: z.string(), title: z.string(), completed: z.boolean().optional() })),
  exercises: z.array(z.object({ id: z.string(), title: z.string(), completed: z.boolean().optional() })),
  projects: z.array(z.object({ id: z.string(), title: z.string(), completed: z.boolean().optional() })),
  resources: z.array(resourceSchema),
  milestones: z.array(z.object({ id: z.string(), title: z.string(), completionCriteria: z.string(), completed: z.boolean().optional() })),
});

const roadmapSchema = z.object({
  title: z.string(),
  targetCareerOrSkill: z.string(),
  startingLevel: z.string(),
  targetLevel: z.string(),
  overallEstimatedDuration: z.string(),
  stages: z.array(stageSchema).min(1).max(12),
});

const requestSchema = z.object({
  careerGoal: z.string().trim().min(1).max(150),
  startingLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  targetLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  availableHoursPerWeek: z.number().int().min(1).max(168),
  targetTimeframe: z.string().trim().min(1).max(100),
  existingSkills: z.array(z.string().max(100)).max(50).default([]),
  interests: z.array(z.string().max(100)).max(30).default([]),
});

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data, error } = await supabase
    .from('learning_roadmaps')
    .select('*')
    .eq('user_id', auth.user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load roadmaps.' }, { status: 500 });
  return NextResponse.json({ roadmaps: data ?? [] });
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please provide valid roadmap inputs.' }, { status: 400 });
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
    .eq('endpoint', 'roadmap')
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();
  if ((usage?.request_count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Hourly roadmap generation limit reached. Please try again later.' }, { status: 429 });
  }

  const prompt = [
    'Generate a practical, personalized learning roadmap as valid JSON only.',
    'Do not guarantee jobs or mastery. Do not fabricate resource URLs.',
    'Use official documentation URLs only when certain; otherwise use suggestedSearch instead.',
    `Learner inputs: ${JSON.stringify(parsed.data)}`,
    'Schema: {title,targetCareerOrSkill,startingLevel,targetLevel,overallEstimatedDuration,stages:[{id,title,description,estimatedDuration,topics:[{id,title}],exercises:[{id,title}],projects:[{id,title}],resources:[{title,url?,suggestedSearch?}],milestones:[{id,title,completionCriteria}]}]}',
  ].join('\n');

  try {
    const ai = createGeminiClient();
    const result = await generateContentWithFallback(ai, {
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 8192 },
    });
    const text = result.text ?? '';
    const roadmap = roadmapSchema.parse(JSON.parse(text));

    const { data: saved, error } = await supabase
      .from('learning_roadmaps')
      .insert({
        user_id: user.id,
        title: roadmap.title,
        career_goal: roadmap.targetCareerOrSkill,
        starting_level: roadmap.startingLevel,
        target_level: roadmap.targetLevel,
        estimated_duration: roadmap.overallEstimatedDuration,
        roadmap_data: roadmap,
      })
      .select('*')
      .single();
    if (error || !saved) {
      return NextResponse.json({ error: 'The roadmap was generated but could not be saved.' }, { status: 500 });
    }

    await supabase
      .from('ai_usage')
      .upsert(
        { user_id: user.id, endpoint: 'roadmap', request_count: (usage?.request_count ?? 0) + 1, window_start: windowStart.toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,endpoint,window_start' }
      );
    return NextResponse.json({ roadmap: saved });
  } catch (error) {
    return NextResponse.json({ error: geminiErrorMessage(error) }, { status: 502 });
  }
}
