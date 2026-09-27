import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { getRoadmap, getSkillsByIds } from '@/services/dataService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function PublicRoadmapsPage() {
  const sample = getRoadmap('user-learner-1');

  return (
    <PublicBrowseLayout
      title="Learning Roadmaps"
      description="See how SkillSphere guides you from where you are to where you want to be — step by step."
    >
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-4">A guided path to mastery</h2>
          <p className="text-ink-400 mb-6">
            After you set your skills and goals, SkillSphere generates a personalized roadmap with clear
            milestones — so you always know what to learn next and can track your progress along the way.
          </p>
          <div className="space-y-3">
            {[
              'AI-powered roadmap generation based on your goals',
              'Milestones mapped to the skills you need',
              'Track progress and check off steps as you go',
              'Connect with mentors for each stage of your journey',
            ].map((point) => (
              <div key={point} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                </div>
                <span className="text-sm text-ink-600">{point}</span>
              </div>
            ))}
          </div>
          <Link to="/register" className="inline-block mt-8">
            <Button size="lg">Create your roadmap <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>

        {sample && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-ink-100">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">{sample.goal}</p>
                <p className="text-sm text-ink-400">{sample.timeframe} &middot; {sample.currentLevel} level</p>
              </div>
            </div>
            <div className="space-y-3">
              {sample.milestones.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.completed ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400'}`}>
                    {m.completed && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${m.completed ? 'text-ink-400 line-through' : 'text-ink'}`}>{m.title}</p>
                    <p className="text-xs text-ink-400">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-ink-100">
              {getSkillsByIds(sample.targetSkills).map((s) => (
                <Badge key={s.id} variant="brand">{s.name}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </PublicBrowseLayout>
  );
}
