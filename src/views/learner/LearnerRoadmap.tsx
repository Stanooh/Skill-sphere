'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ProgressBar } from '@/components/ui';
import { GraduationCap, Check, Sparkles, MessageSquare, Wand2, BookOpen, Circle } from 'lucide-react';
import {
  getLearnerProgressSummary,
  toggleRoadmapItemProgress,
  subscribeToRoadmapProgress,
  type HydratedRoadmap,
} from '@/services/roadmapProgressService';

export function LearnerRoadmapPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [roadmaps, setRoadmaps] = useState<HydratedRoadmap[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadRoadmaps = useCallback(async () => {
    if (!user) return;
    const summary = await getLearnerProgressSummary(user.id);
    setRoadmaps(summary.roadmaps);
    setSelectedId((prev) => (prev && summary.roadmaps.some((r) => r.id === prev) ? prev : summary.roadmaps[0]?.id ?? null));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const init = async () => {
      const summary = await getLearnerProgressSummary(user.id);
      if (!active) return;
      setRoadmaps(summary.roadmaps);
      setSelectedId(summary.roadmaps[0]?.id ?? null);
      setLoading(false);
    };
    void init();

    const unsubscribe = subscribeToRoadmapProgress(user.id, () => {
      void loadRoadmaps();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, loadRoadmaps]);

  if (!user) return null;

  const activeRoadmap = roadmaps.find((r) => r.id === selectedId) ?? roadmaps[0] ?? null;

  const handleToggleItem = async (
    roadmapId: string,
    stageId: string,
    itemId: string,
    itemType: 'topic' | 'milestone',
    currentCompleted: boolean
  ) => {
    const key = `${roadmapId}:${stageId}:${itemType}:${itemId}`;
    if (savingKey === key) return;
    setSavingKey(key);
    const nextCompleted = !currentCompleted;

    // Optimistic update
    const previous = roadmaps;
    setRoadmaps((curr) =>
      curr.map((rm) => {
        if (rm.id !== roadmapId) return rm;
        let completedItems = 0;
        let totalItems = 0;
        const stages = rm.stages.map((st) => {
          const topics = st.topics.map((t) => {
            const done = st.id === stageId && itemType === 'topic' && t.id === itemId ? nextCompleted : t.completed;
            totalItems += 1;
            if (done) completedItems += 1;
            return { ...t, completed: done };
          });
          const milestones = st.milestones.map((m) => {
            const done = st.id === stageId && itemType === 'milestone' && m.id === itemId ? nextCompleted : m.completed;
            totalItems += 1;
            if (done) completedItems += 1;
            return { ...m, completed: done };
          });
          return { ...st, topics, milestones };
        });
        return {
          ...rm,
          stages,
          totalItems,
          completedItems,
          percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        };
      })
    );

    try {
      await toggleRoadmapItemProgress({
        roadmapId,
        stageId,
        itemId,
        itemType,
        completed: nextCompleted,
      });
    } catch (err) {
      console.error(err);
      setRoadmaps(previous);
      show('Could not save progress. Please try again.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Learning Roadmap"
        description="Check off topics and milestones as you learn — your progress syncs to My Progress."
        action={
          <Link href="/learner/roadmap/create">
            <Button>
              <Sparkles className="w-4 h-4" /> Generate AI Roadmap
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading your roadmaps...</div>
      ) : !activeRoadmap ? (
        <div className="card">
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title="No roadmap yet"
            description="Generate a personalized AI learning roadmap based on your skills, goals, and timeframe."
            action={
              <Link href="/learner/roadmap/create">
                <Button><Sparkles className="w-4 h-4" /> Generate Roadmap</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {roadmaps.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {roadmaps.map((rm) => (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => setSelectedId(rm.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    rm.id === activeRoadmap.id
                      ? 'border-brand bg-brand-50 text-brand-700'
                      : 'border-ink-200 text-ink-500 hover:border-ink-300'
                  }`}
                >
                  {rm.title} ({rm.percentage}%)
                </button>
              ))}
            </div>
          )}

          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{activeRoadmap.title}</h2>
                <p className="text-sm text-ink-400">
                  {activeRoadmap.careerGoal} • {activeRoadmap.estimatedDuration} • {activeRoadmap.completedItems}/{activeRoadmap.totalItems} completed
                </p>
              </div>
              <span className="text-2xl font-bold text-brand shrink-0">{activeRoadmap.percentage}%</span>
            </div>
            <ProgressBar value={activeRoadmap.percentage} />
          </div>

          <div className="space-y-5">
            {activeRoadmap.stages.map((stage, idx) => {
              const stageDone =
                stage.topics.every((t) => t.completed) &&
                stage.milestones.every((m) => m.completed) &&
                stage.topics.length + stage.milestones.length > 0;

              return (
                <div key={stage.id} className="card p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          stageDone ? 'bg-brand text-white' : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {stageDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-ink">{stage.title}</h3>
                        <p className="text-sm text-ink-400 mt-0.5">{stage.description}</p>
                      </div>
                    </div>
                    <Badge variant={stageDone ? 'green' : 'gray'}>{stage.estimatedDuration}</Badge>
                  </div>

                  {stage.topics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Topics</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {stage.topics.map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() =>
                              void handleToggleItem(activeRoadmap.id, stage.id, topic.id, 'topic', topic.completed)
                            }
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                              topic.completed
                                ? 'border-brand/40 bg-brand-50/40 text-ink-400'
                                : 'border-ink-200 text-ink hover:border-brand'
                            }`}
                          >
                            {topic.completed ? (
                              <Check className="w-4 h-4 text-brand shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-ink-300 shrink-0" />
                            )}
                            <span className={topic.completed ? 'line-through' : ''}>{topic.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {stage.projects.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Projects</p>
                      <div className="flex flex-wrap gap-2">
                        {stage.projects.map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-1.5 text-sm text-ink-600">
                            <BookOpen className="w-4 h-4 text-brand" /> {p.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {stage.milestones.length > 0 && (
                    <div className="pt-3 border-t border-ink-100 space-y-2">
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider">Milestones</p>
                      {stage.milestones.map((m) => (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-ink-50 rounded-lg px-3 py-2.5">
                          <div>
                            <p className={`text-sm font-medium ${m.completed ? 'line-through text-ink-400' : 'text-ink'}`}>
                              {m.title}
                            </p>
                            <p className="text-xs text-ink-400">{m.completionCriteria}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={m.completed ? 'secondary' : 'primary'}
                            onClick={() =>
                              void handleToggleItem(activeRoadmap.id, stage.id, m.id, 'milestone', m.completed)
                            }
                          >
                            <Check className="w-3.5 h-3.5" />
                            {m.completed ? 'Completed' : 'Mark Complete'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Roadmap Generator banner */}
      <div className="card p-5 mt-6 bg-brand-50 border-brand-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">AI-Powered Roadmap Generator</h3>
              <p className="text-sm text-ink-400">Create another tailored roadmap with phases, topics, projects, and milestones.</p>
            </div>
          </div>
          <Link href="/learner/roadmap/create" className="shrink-0">
            <Button size="sm"><Sparkles className="w-4 h-4" /> AI Roadmap</Button>
          </Link>
        </div>
      </div>

      {/* Link to Career Advisor */}
      <div className="mt-6 text-center">
        <p className="text-sm text-ink-400 mb-2">Have questions about your learning path?</p>
        <Link href="/learner/career-advisor">
          <Button variant="secondary" size="sm"><MessageSquare className="w-4 h-4" /> Ask AI Career Advisor</Button>
        </Link>
      </div>
    </DashboardLayout>
  );
}
