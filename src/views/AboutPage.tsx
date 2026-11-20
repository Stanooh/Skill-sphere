import Link from 'next/link';
import { Compass, Users, Target, BookOpen, CalendarDays, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PublicNavigation } from '@/components/layout/PublicNavigation';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation />

      <section className="max-w-4xl mx-auto px-4 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-ink mb-4">About SkillSphere</h1>
        <p className="text-lg text-ink-400 mb-12 max-w-2xl">
          SkillSphere is a skill-sharing, mentorship, and personalized learning platform. We connect learners with
          expert mentors, provide smart recommendations, and guide each learner through a structured roadmap toward
          their goals.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {[
            { icon: <Compass className="w-5 h-5" />, title: 'Mentor Recommendations', desc: 'Our matching engine evaluates skills, levels, experience, and availability to recommend the right mentors for you.' },
            { icon: <Target className="w-5 h-5" />, title: 'Goal-Driven Roadmaps', desc: 'Set a learning goal and get a structured roadmap with milestones you can track as you progress.' },
            { icon: <CalendarDays className="w-5 h-5" />, title: 'Mentorship Sessions', desc: 'Book one-on-one sessions with mentors to get personalized guidance on your learning journey.' },
            { icon: <BookOpen className="w-5 h-5" />, title: 'Workshops', desc: 'Attend workshops hosted by mentors to learn new skills in a collaborative environment.' },
            { icon: <BarChart3 className="w-5 h-5" />, title: 'Progress Tracking', desc: 'Track milestones, completed sessions, and workshops all in one dashboard.' },
            { icon: <Users className="w-5 h-5" />, title: 'Three Roles', desc: 'Learners, Mentors, and Admins — each with dedicated dashboards and tools.' },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-brand-900 text-brand-300 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-400">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="card p-8 text-center bg-brand-50/50 border border-brand-100">
          <h2 className="text-2xl font-bold text-ink mb-3">Ready to start your journey?</h2>
          <p className="text-ink-400 mb-6 max-w-md mx-auto text-sm">
            Join SkillSphere today as a learner or apply as an industry mentor.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg">Create Free Account</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
