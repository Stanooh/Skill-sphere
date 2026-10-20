'use client';

import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { ProgressBar, StatCard } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { GraduationCap, CalendarDays, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react';
import { getProgress, getRoadmap, getLearnerProfile, getSkillsByIds } from '@/services/dataService';

export function LearnerProgressPage() {
  const { user } = useAuth();
  if (!user) return null;

  const progress = getProgress(user.id);
  const roadmap = getRoadmap(user.id);
  const profile = getLearnerProfile(user.id);
  const skills = profile ? getSkillsByIds(profile.skillIds) : [];

  return (
    <DashboardLayout>
      <PageHeader title="My Progress" description="Track your learning journey and achievements." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Roadmap Progress" value={`${progress.percentage}%`} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Milestones Done" value={`${progress.milestonesCompleted}/${progress.totalMilestones}`} icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard label="Sessions Completed" value={progress.sessionsCompleted} icon={<CalendarDays className="w-5 h-5" />} />
        <StatCard label="Workshops Attended" value={progress.workshopsCompleted} icon={<BookOpen className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Roadmap progress */}
        <div className="card p-6">
          <h3 className="font-semibold text-ink mb-4">Roadmap Progress</h3>
          {roadmap ? (
            <>
              <p className="text-sm text-ink-400 mb-2">{roadmap.goal}</p>
              <ProgressBar value={progress.percentage} label="Overall progress" className="mb-6" />
              <div className="space-y-2">
                {roadmap.milestones.sort((a, b) => a.order - b.order).map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.completed ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400'}`}>
                      {m.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{m.order}</span>}
                    </div>
                    <span className={`text-sm ${m.completed ? 'text-ink-400 line-through' : 'text-ink'}`}>{m.title}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-400">No roadmap generated yet.</p>
          )}
        </div>

        {/* Skills overview */}
        <div className="card p-6">
          <h3 className="font-semibold text-ink mb-4">Your Skills</h3>
          {skills.length > 0 ? (
            <div className="space-y-3">
              {skills.map((skill) => {
                const level = profile?.skillLevels[skill.id] ?? 'beginner';
                const levelPercent = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 }[level];
                return (
                  <div key={skill.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ink">{skill.name}</span>
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
      </div>

      {/* Learning goal */}
      {profile?.learningGoal && (
        <div className="card p-6 mt-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-ink-400">Learning Goal</p>
              <p className="font-semibold text-ink">{profile.learningGoal}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-400">
            <span>Timeframe: {profile.targetTimeframe}</span>
            <span>Hours/week: {profile.availableHoursPerWeek}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
