import { createClient } from '@/lib/supabase/client';
import type { SkillLevel } from '@/types';

export interface RoadmapTopicItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface RoadmapMilestoneItem {
  id: string;
  title: string;
  completionCriteria: string;
  completed: boolean;
  completedAt?: string | null;
}

export interface HydratedRoadmapStage {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  topics: RoadmapTopicItem[];
  projects: Array<{ id: string; title: string }>;
  milestones: RoadmapMilestoneItem[];
}

export interface HydratedRoadmap {
  id: string;
  title: string;
  careerGoal: string;
  startingLevel: string;
  targetLevel: string;
  estimatedDuration: string;
  createdAt: string;
  stages: HydratedRoadmapStage[];
  totalItems: number;
  completedItems: number;
  percentage: number;
}

export interface RecentLearningActivity {
  id: string;
  roadmapId: string;
  roadmapTitle: string;
  stageTitle: string;
  itemTitle: string;
  itemType: 'topic' | 'exercise' | 'project' | 'milestone';
  completedAt: string;
}

export interface LearnerProgressSummary {
  totalRoadmaps: number;
  inProgressRoadmaps: number;
  completedRoadmaps: number;
  totalTopics: number;
  completedTopics: number;
  remainingTopics: number;
  totalMilestones: number;
  completedMilestones: number;
  overallPercentage: number;
  sessionsCompleted: number;
  streakDays: number;
  roadmaps: HydratedRoadmap[];
  recentActivity: RecentLearningActivity[];
  skills: Array<{ id: string; level: SkillLevel }>;
  learningGoal?: string;
  targetTimeframe?: string;
  availableHoursPerWeek?: number;
}

type DbRoadmapRow = {
  id: string;
  title: string;
  career_goal: string;
  starting_level: string;
  target_level: string;
  estimated_duration: string;
  created_at: string;
  roadmap_data: {
    stages?: Array<{
      id: string;
      title: string;
      description: string;
      estimatedDuration: string;
      topics?: Array<{ id: string; title: string }>;
      projects?: Array<{ id: string; title: string }>;
      milestones?: Array<{ id: string; title: string; completionCriteria: string }>;
    }>;
  };
};

type DbProgressRow = {
  id: string;
  roadmap_id: string;
  stage_id: string;
  item_id: string;
  item_type: 'topic' | 'exercise' | 'project' | 'milestone';
  completed: boolean;
  completed_at: string | null;
};

function computeStreakDays(completedDatesIso: string[]): number {
  if (completedDatesIso.length === 0) return 0;
  const daySet = new Set(
    completedDatesIso.map((iso) => new Date(iso).toISOString().slice(0, 10))
  );
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let cursor: Date;
  if (daySet.has(todayStr)) {
    cursor = new Date(todayStr + 'T00:00:00Z');
  } else if (daySet.has(yesterdayStr)) {
    cursor = new Date(yesterdayStr + 'T00:00:00Z');
  } else {
    return 0;
  }

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getLearnerProgressSummary(userId: string): Promise<LearnerProgressSummary> {
  const supabase = createClient();

  const [roadmapsRes, progressRes, sessionsRes, profileRes] = await Promise.all([
    supabase
      .from('learning_roadmaps')
      .select('id, title, career_goal, starting_level, target_level, estimated_duration, created_at, roadmap_data')
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false }),
    supabase
      .from('roadmap_progress')
      .select('id, roadmap_id, stage_id, item_id, item_type, completed, completed_at')
      .eq('user_id', userId),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('learner_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('learner_profiles')
      .select('skill_ids, skill_levels, learning_goal, target_timeframe, available_hours_per_week')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const roadmapRows = (roadmapsRes.data ?? []) as DbRoadmapRow[];
  const progressRows = (progressRes.data ?? []) as DbProgressRow[];

  const progressMap = new Map<string, DbProgressRow>();
  for (const row of progressRows) {
    progressMap.set(`${row.roadmap_id}:${row.stage_id}:${row.item_type}:${row.item_id}`, row);
  }

  let totalTopics = 0;
  let completedTopics = 0;
  let totalMilestones = 0;
  let completedMilestones = 0;
  let inProgressRoadmaps = 0;
  let completedRoadmaps = 0;

  const itemTitleLookup = new Map<string, { roadmapTitle: string; stageTitle: string; itemTitle: string }>();

  const roadmaps: HydratedRoadmap[] = roadmapRows.map((rm) => {
    const rawStages = rm.roadmap_data?.stages ?? [];
    let rmTotal = 0;
    let rmCompleted = 0;

    const stages: HydratedRoadmapStage[] = rawStages.map((stage) => {
      const topics: RoadmapTopicItem[] = (stage.topics ?? []).map((t) => {
        const key = `${rm.id}:${stage.id}:topic:${t.id}`;
        const prog = progressMap.get(key);
        const isDone = Boolean(prog?.completed);
        totalTopics += 1;
        rmTotal += 1;
        if (isDone) {
          completedTopics += 1;
          rmCompleted += 1;
        }
        itemTitleLookup.set(key, { roadmapTitle: rm.title, stageTitle: stage.title, itemTitle: t.title });
        return {
          id: t.id,
          title: t.title,
          completed: isDone,
          completedAt: prog?.completed_at ?? null,
        };
      });

      const milestones: RoadmapMilestoneItem[] = (stage.milestones ?? []).map((m) => {
        const key = `${rm.id}:${stage.id}:milestone:${m.id}`;
        const prog = progressMap.get(key);
        const isDone = Boolean(prog?.completed);
        totalMilestones += 1;
        rmTotal += 1;
        if (isDone) {
          completedMilestones += 1;
          rmCompleted += 1;
        }
        itemTitleLookup.set(key, { roadmapTitle: rm.title, stageTitle: stage.title, itemTitle: m.title });
        return {
          id: m.id,
          title: m.title,
          completionCriteria: m.completionCriteria,
          completed: isDone,
          completedAt: prog?.completed_at ?? null,
        };
      });

      return {
        id: stage.id,
        title: stage.title,
        description: stage.description,
        estimatedDuration: stage.estimatedDuration,
        topics,
        projects: stage.projects ?? [],
        milestones,
      };
    });

    const percentage = rmTotal > 0 ? Math.round((rmCompleted / rmTotal) * 100) : 0;
    if (rmTotal > 0 && rmCompleted === rmTotal) {
      completedRoadmaps += 1;
    } else if (rmCompleted > 0) {
      inProgressRoadmaps += 1;
    }

    return {
      id: rm.id,
      title: rm.title,
      careerGoal: rm.career_goal,
      startingLevel: rm.starting_level,
      targetLevel: rm.target_level,
      estimatedDuration: rm.estimated_duration,
      createdAt: rm.created_at,
      stages,
      totalItems: rmTotal,
      completedItems: rmCompleted,
      percentage,
    };
  });

  const totalTrackable = totalTopics + totalMilestones;
  const completedTrackable = completedTopics + completedMilestones;
  const overallPercentage = totalTrackable > 0 ? Math.round((completedTrackable / totalTrackable) * 100) : 0;

  const completedRows = progressRows
    .filter((r) => r.completed && r.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  const recentActivity: RecentLearningActivity[] = completedRows.slice(0, 10).map((r) => {
    const key = `${r.roadmap_id}:${r.stage_id}:${r.item_type}:${r.item_id}`;
    const meta = itemTitleLookup.get(key);
    return {
      id: r.id,
      roadmapId: r.roadmap_id,
      roadmapTitle: meta?.roadmapTitle ?? 'Learning Roadmap',
      stageTitle: meta?.stageTitle ?? 'Stage',
      itemTitle: meta?.itemTitle ?? r.item_id,
      itemType: r.item_type,
      completedAt: r.completed_at!,
    };
  });

  const streakDays = computeStreakDays(completedRows.map((r) => r.completed_at!));

  const lp = profileRes.data;
  const skillIds = Array.isArray(lp?.skill_ids) ? (lp.skill_ids as string[]) : [];
  const skillLevels = (lp?.skill_levels as Record<string, SkillLevel>) ?? {};

  return {
    totalRoadmaps: roadmaps.length,
    inProgressRoadmaps,
    completedRoadmaps,
    totalTopics,
    completedTopics,
    remainingTopics: Math.max(0, totalTopics - completedTopics),
    totalMilestones,
    completedMilestones,
    overallPercentage,
    sessionsCompleted: sessionsRes.count ?? 0,
    streakDays,
    roadmaps,
    recentActivity,
    skills: skillIds.map((id) => ({ id, level: skillLevels[id] ?? 'beginner' })),
    learningGoal: (lp?.learning_goal as string) || undefined,
    targetTimeframe: (lp?.target_timeframe as string) || undefined,
    availableHoursPerWeek: lp?.available_hours_per_week ? Number(lp.available_hours_per_week) : undefined,
  };
}

export async function toggleRoadmapItemProgress(input: {
  roadmapId: string;
  stageId: string;
  itemId: string;
  itemType: 'topic' | 'exercise' | 'project' | 'milestone';
  completed: boolean;
}): Promise<boolean> {
  const response = await fetch(`/api/ai/roadmaps/${input.roadmapId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stageId: input.stageId,
      itemId: input.itemId,
      itemType: input.itemType,
      completed: input.completed,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error || 'Could not save progress.');
  }
  return true;
}

export function subscribeToRoadmapProgress(userId: string, onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`roadmap_progress:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'roadmap_progress', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
