import type { CareerAdvisorMessage, LearningRoadmap } from '@/types';

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

  const saved = result.roadmap as {
    id: string;
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
  const data = saved.roadmap_data;
  return {
    id: saved.id,
    learnerId: '',
    careerPath: data.targetCareerOrSkill,
    currentLevel: data.startingLevel as LearningRoadmap['currentLevel'],
    targetTimeline: data.overallEstimatedDuration,
    hoursPerWeek: input.availableHoursPerWeek,
    progress: 0,
    createdAt: new Date().toISOString(),
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
