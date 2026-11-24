import type { CareerAdvisorMessage, LearningRoadmap } from '@/types';

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

function mapDbRoadmap(saved: DbRoadmapRow, hoursPerWeek = 10): LearningRoadmap {
  const data = saved.roadmap_data;
  return {
    id: saved.id,
    learnerId: saved.user_id ?? '',
    careerPath: data.targetCareerOrSkill,
    currentLevel: data.startingLevel as LearningRoadmap['currentLevel'],
    targetTimeline: data.overallEstimatedDuration,
    hoursPerWeek,
    progress: 0,
    createdAt: saved.created_at ?? new Date().toISOString(),
    phases: data.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: `${stage.description}\n\nEstimated duration: ${stage.estimatedDuration}`,
      milestones: stage.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        skill: milestone.completionCriteria,
        description: milestone.completionCriteria,
        status: 'available',
        topics: stage.topics.map((topic) => topic.title),
        project: stage.projects.map((project) => project.title).join('; ') || 'Complete the stage exercises',
      })),
    })),
  };
}

export async function askCareerAdvisor(
  message: string,
  conversationId?: string
): Promise<{ conversationId: string; message: CareerAdvisorMessage }> {
  const response = await fetch('/api/ai/career-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not get a career response.');
  return {
    conversationId: result.conversationId,
    message: {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: result.content,
      createdAt: new Date().toISOString(),
      includeRoadmapLink: result.includeRoadmapLink,
    },
  };
}

export async function getAiRoadmaps(): Promise<LearningRoadmap[]> {
  const response = await fetch('/api/ai/roadmaps');
  if (!response.ok) return [];
  const result = await response.json();
  const rows = (result.roadmaps ?? []) as DbRoadmapRow[];
  return rows.map((row) => mapDbRoadmap(row));
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
  const response = await fetch('/api/ai/roadmaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not generate a roadmap.');

  return mapDbRoadmap(result.roadmap as DbRoadmapRow, input.availableHoursPerWeek);
}
