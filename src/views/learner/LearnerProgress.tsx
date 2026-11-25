'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { ProgressBar, StatCard } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  GraduationCap,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  getLearnerProgressSummary,
  subscribeToRoadmapProgress,
  type LearnerProgressSummary,
} from '@/services/roadmapProgressService';
import { getSkillsByIds } from '@/services/dataService';

export function LearnerProgressPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LearnerProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!user) return;
    const data = await getLearnerProgressSummary(user.id);
    setSummary(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const run = async () => {
      const data = await getLearnerProgressSummary(user.id);
      if (!active) return;
      setSummary(data);
      setLoading(false);
    };
    void run();

    const unsubscribe = subscribeToRoadmapProgress(user.id, () => {
      void loadSummary();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, loadSummary]);

  if (!user) return null;

  const skillMap = new Map(
    getSkillsByIds(summary?.skills.map((s) => s.id) ?? []).map((s) => [s.id, s])
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="My Progress"
        description="Track your genuine learning activity across your saved roadmaps."
        action={
          <Link href="/learner/roadmap">
            <Button variant="secondary" size="sm">
              View Roadmaps <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        }
      />

      {loading || !summary ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading your progress...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Overall Progress"
              value={`${summary.overallPercentage}%`}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              label="Topics Completed"
              value={`${summary.completedTopics}/${summary.totalTopics}`}
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
            <StatCard
              label="Roadmaps"
              value={`${summary.completedRoadmaps}/${summary.totalRoadmaps}`}
              icon={<BookOpen className="w-5 h-5" />}
            />
            <StatCard
              label="Learning Streak"
              value={`${summary.streakDays}d`}
              icon={<Flame className="w-5 h-5" />}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="card p-4">
              <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">In Progress Roadmaps</p>
              <p className="text-2xl font-bold text-ink mt-1">{summary.inProgressRoadmaps}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">Remaining Topics</p>
              <p className="text-2xl font-bold text-ink mt-1">{summary.remainingTopics}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-ink-400 uppercase tracking-wider">Sessions Completed</p>
              <p className="text-2xl font-bold text-ink mt-1 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand" />
                {summary.sessionsCompleted}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Individual roadmaps progress */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink">Roadmap Progress</h3>
                <Link href="/learner/roadmap/create" className="text-xs font-medium text-brand hover:underline">
                  + New Roadmap
                </Link>
              </div>
              {summary.roadmaps.length > 0 ? (
                <div className="space-y-5">
                  {summary.roadmaps.map((rm) => (
                    <div key={rm.id} className="border border-ink-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <Link href="/learner/roadmap" className="font-medium text-ink hover:text-brand break-words">
                            {rm.title}
                          </Link>
                          <p className="text-xs text-ink-400 mt-0.5">
                            {rm.completedItems} of {rm.totalItems} topics &amp; milestones completed
                          </p>
                        </div>
                        <Badge variant={rm.percentage === 100 ? 'green' : rm.percentage > 0 ? 'brand' : 'gray'}>
                          {rm.percentage}%
                        </Badge>
                      </div>
                      <ProgressBar value={rm.percentage} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-ink-400 space-y-3">
                  <p>No roadmaps generated yet.</p>
                  <Link href="/learner/roadmap/create">
                    <Button size="sm">Generate AI Roadmap</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Recent learning activity */}
            <div className="card p-6">
              <h3 className="font-semibold text-ink mb-4">Recent Learning Activity</h3>
              {summary.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {summary.recentActivity.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-ink-100 last:border-b-0 last:pb-0">
                      <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink break-words">{act.itemTitle}</p>
                        <p className="text-xs text-ink-400">
                          {act.roadmapTitle} • {act.stageTitle} ({act.itemType})
                        </p>
                      </div>
                      <span className="text-xs text-ink-300 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(act.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-400">
                  Complete topics or milestones on your roadmap to record learning activity.
                </p>
              )}
            </div>
          </div>

          {/* Skills overview */}
          <div className="card p-6 mt-6">
            <h3 className="font-semibold text-ink mb-4">Your Skills</h3>
            {summary.skills.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {summary.skills.map(({ id, level }) => {
                  const skill = skillMap.get(id);
                  const levelPercent = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 }[level];
                  return (
                    <div key={id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink">{skill?.name ?? id}</span>
                        <Badge variant="outline">{level}</Badge>
                      </div>
                      <ProgressBar value={levelPercent} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-400">No skills selected. Update your profile to add skills.</p>
            )}
          </div>

          {/* Learning goal */}
          {summary.learningGoal && (
            <div className="card p-6 mt-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm text-ink-400">Learning Goal</p>
                  <p className="font-semibold text-ink">{summary.learningGoal}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-400">
                {summary.targetTimeframe && <span>Timeframe: {summary.targetTimeframe}</span>}
                {summary.availableHoursPerWeek ? <span>Hours/week: {summary.availableHoursPerWeek}</span> : null}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
