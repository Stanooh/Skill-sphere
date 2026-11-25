import type { CareerAdvisorMessage, LearningRoadmap } from '@/types';

const CLIENT_TIMEOUT_MS = 50_000;

type DbRoadmapRow = {
  id: string;
  user_id?: string;
  created_at?: string;
  roadmap_data: {
    title: string;
    targetCareerOrSkill: string;
    startingLevel: string;
    targetLevel: string;
    overallEstimatedDuration: string;
    stages: Array<{
      id: string;
      title: string;
      description: string;
      estimatedDuration: string;
      topics: Array<{ id: string; title: string }>;
      exercises: Array<{ id: string; title: string }>;
      projects: Array<{ id: string; title: string }>;
      resources: Array<{ title: string; url?: string; suggestedSearch?: string }>;
      milestones: Array<{ id: string; title: string; completionCriteria: string }>;
    }>;
  };
};

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = CLIENT_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.');
    }
    throw new Error('Network error while contacting the AI service. Please try again.');
  } finally {
    clearTimeout(timer);
  }
}

type DbProgressRow = {
  roadmap_id: string;
  stage_id: string;
  item_id: string;
  item_type: string;
  completed: boolean;
};

function mapDbRoadmap(
  saved: DbRoadmapRow,
  hoursPerWeek = 10,
  completedSet?: Set<string>
): LearningRoadmap {
  const data = saved.roadmap_data;
  const phases = data.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    description: `${stage.description}\n\nEstimated duration: ${stage.estimatedDuration}`,
    milestones: stage.milestones.map((milestone) => {
      const done = completedSet?.has(`${saved.id}:${stage.id}:milestone:${milestone.id}`) ?? false;
      return {
        id: milestone.id,
        title: milestone.title,
        skill: milestone.completionCriteria,
        description: milestone.completionCriteria,
        status: (done ? 'completed' : 'available') as 'completed' | 'available',
        topics: stage.topics.map((topic) => topic.title),
        project: stage.projects.map((project) => project.title).join('; ') || 'Complete the stage exercises',
      };
    }),
  }));

  const allMilestones = phases.flatMap((p) => p.milestones);
  const completedCount = allMilestones.filter((m) => m.status === 'completed').length;
  const progress = allMilestones.length > 0 ? Math.round((completedCount / allMilestones.length) * 100) : 0;

  return {
    id: saved.id,
    learnerId: saved.user_id ?? '',
    careerPath: data.targetCareerOrSkill,
    currentLevel: data.startingLevel as LearningRoadmap['currentLevel'],
    targetTimeline: data.overallEstimatedDuration,
    hoursPerWeek,
    progress,
    createdAt: saved.created_at ?? new Date().toISOString(),
    phases,
  };
}

export async function askCareerAdvisor(
  message: string,
  conversationId?: string
): Promise<{ conversationId: string; message: CareerAdvisorMessage }> {
  const { ok, data } = await fetchJsonWithTimeout('/api/ai/career-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!ok || !data || typeof data.content !== 'string' || typeof data.conversationId !== 'string') {
    const errMsg = typeof data?.error === 'string' ? data.error : 'Could not get a career response.';
    throw new Error(errMsg);
  }

  return {
    conversationId: data.conversationId,
    message: {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: data.content,
      createdAt: new Date().toISOString(),
      includeRoadmapLink: Boolean(data.includeRoadmapLink),
    },
  };
}

export async function getAiRoadmaps(): Promise<LearningRoadmap[]> {
  try {
    const { ok, data } = await fetchJsonWithTimeout('/api/ai/roadmaps', { method: 'GET' }, 15_000);
    if (!ok || !data || !Array.isArray(data.roadmaps)) return [];
    const rows = data.roadmaps as DbRoadmapRow[];
    const progressRows = Array.isArray(data.progress) ? (data.progress as DbProgressRow[]) : [];
    const completedSet = new Set(
      progressRows
        .filter((p) => p.completed)
        .map((p) => `${p.roadmap_id}:${p.stage_id}:${p.item_type}:${p.item_id}`)
    );
    return rows.map((row) => mapDbRoadmap(row, 10, completedSet));
  } catch {
    return [];
  }
}

export async function generateAiRoadmap(input: {
  careerGoal: string;
  startingLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availableHoursPerWeek: number;
  targetTimeframe: string;
  existingSkills: string[];
  interests: string[];
}): Promise<LearningRoadmap> {
  const { ok, data } = await fetchJsonWithTimeout('/api/ai/roadmaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!ok || !data || !data.roadmap) {
    const errMsg = typeof data?.error === 'string' ? data.error : 'Could not generate a roadmap.';
    throw new Error(errMsg);
  }

  return mapDbRoadmap(data.roadmap as DbRoadmapRow, input.availableHoursPerWeek);
}
