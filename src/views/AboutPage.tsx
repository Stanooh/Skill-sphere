import Link from 'next/link';
import { GraduationCap, Compass, TrendingUp, Users, Target, BookOpen, CalendarDays, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">SkillSphere</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="secondary" size="sm">Sign In</Button></Link>
            <Link href="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

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
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-400">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-ink mb-4">Demo Accounts</h2>
          <p className="text-ink-400 mb-6">Use these accounts to explore SkillSphere. Any password will work.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { role: 'Learner', email: 'learner@skillsphere.demo', icon: <GraduationCap className="w-4 h-4" /> },
              { role: 'Mentor', email: 'mentor@skillsphere.demo', icon: <Compass className="w-4 h-4" /> },
              { role: 'Admin', email: 'admin@skillsphere.demo', icon: <Shield className="w-4 h-4" /> },
            ].map((acc) => (
              <div key={acc.role} className="border border-ink-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-brand mb-2">
                  {acc.icon}
                  <span className="text-sm font-semibold">{acc.role}</span>
                </div>
                <p className="text-sm text-ink-600 font-mono">{acc.email}</p>
              </div>
            ))}
          </div>
          <Link href="/login" className="mt-6 inline-block">
            <Button>Try the demo</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
