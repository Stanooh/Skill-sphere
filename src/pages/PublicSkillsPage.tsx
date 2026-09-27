import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { getSkills, getAllMentors } from '@/services/dataService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function PublicSkillsPage() {
  const skills = getSkills();
  const mentors = getAllMentors();

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <PublicBrowseLayout
      title="Explore Skills"
      description="Browse the skills our mentors can help you master. Sign up to add skills to your profile and get matched."
    >
      <div className="space-y-10">
        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="text-lg font-semibold text-ink mb-3">{cat}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills.filter((s) => s.category === cat).map((skill) => {
                const mentorCount = mentors.filter((m) => m.skills.some((ms) => ms.id === skill.id)).length;
                return (
                  <div key={skill.id} className="card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink">{skill.name}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{mentorCount} {mentorCount === 1 ? 'mentor' : 'mentors'} available</p>
                    </div>
                    <Badge variant="gray">{skill.category}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 card p-8 text-center bg-ink-50">
        <h2 className="text-2xl font-bold text-ink mb-2">Ready to start learning?</h2>
        <p className="text-ink-400 mb-6 max-w-xl mx-auto">Create a free account, pick your skills, and get matched with mentors today.</p>
        <Link to="/register">
          <Button size="lg">Get Started <ArrowRight className="w-4 h-4" /></Button>
        </Link>
      </div>
    </PublicBrowseLayout>
  );
}
