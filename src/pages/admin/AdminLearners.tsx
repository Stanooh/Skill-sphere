import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui';
import { GraduationCap, MapPin } from 'lucide-react';
import { getUsersByRole, getLearnerProfile, getSkillsByIds, getRoadmap, getProgress } from '@/services/dataService';

export function AdminLearnersPage() {
  const learners = getUsersByRole('learner');

  return (
    <DashboardLayout>
      <PageHeader title="Learners" description="View all learner profiles and progress." />

      {learners.length === 0 ? (
        <div className="card">
          <EmptyState icon={<GraduationCap className="w-6 h-6" />} title="No learners yet" description="Learners will appear here once they register." />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {learners.map((learner) => {
            const profile = getLearnerProfile(learner.id);
            const skills = profile ? getSkillsByIds(profile.skillIds) : [];
            const roadmap = getRoadmap(learner.id);
            const progress = getProgress(learner.id);
            return (
              <div key={learner.id} className="card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar src={learner.avatar} name={learner.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">{learner.name}</h3>
                    <p className="text-sm text-ink-400 truncate">{profile?.education || 'No education listed'}</p>
                    {profile?.location && (
                      <p className="text-xs text-ink-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {profile.location}</p>
                    )}
                  </div>
                </div>

                {profile?.learningGoal && (
                  <div className="bg-ink-50 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-ink-400">Goal</p>
                    <p className="text-sm font-medium text-ink">{profile.learningGoal}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {skills.slice(0, 4).map((s) => (
                    <Badge key={s.id} variant="gray">{s.name}</Badge>
                  ))}
                  {skills.length > 4 && <Badge variant="outline">+{skills.length - 4}</Badge>}
                </div>

                <div className="flex items-center justify-between text-sm text-ink-400 pt-3 border-t border-ink-50">
                  <span>Progress: <span className="font-semibold text-ink">{progress.percentage}%</span></span>
                  <span>{roadmap ? `${progress.milestonesCompleted}/${progress.totalMilestones} milestones` : 'No roadmap'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
