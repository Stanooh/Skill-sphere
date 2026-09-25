import { Link } from 'react-router-dom';
import { GraduationCap, Compass, MapPin, TrendingUp, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">SkillSphere</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/about" className="btn-ghost hidden sm:inline-flex">About</Link>
            <Link to="/login"><Button variant="secondary" size="sm">Sign In</Button></Link>
            <Link to="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 lg:pt-24 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-6">
            <Compass className="w-4 h-4" />
            Skill-sharing & mentorship platform
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-ink leading-tight mb-5">
            Discover skills. Connect with mentors.{' '}
            <span className="text-brand">Grow on your own terms.</span>
          </h1>
          <p className="text-lg text-ink-400 mb-8 max-w-2xl">
            SkillSphere matches you with expert mentors based on your skills, goals, and learning level —
            then guides you through a personalized roadmap so you always know what to learn next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start Learning <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-6 mt-8 text-sm text-ink-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand" /> Free to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand" /> No credit card</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink-50 py-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-ink mb-3">How SkillSphere works</h2>
            <p className="text-ink-400 max-w-xl mx-auto">A guided path from skill discovery to mastery, powered by smart mentor matching.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Users className="w-6 h-6" />, step: '01', title: 'Build your profile', desc: 'Select your skills, set your current level, and define your learning goal. Your profile drives everything that follows.' },
              { icon: <Compass className="w-6 h-6" />, step: '02', title: 'Get matched with mentors', desc: 'Our recommendation engine evaluates mentor expertise against your skills and goals to surface the best matches.' },
              { icon: <TrendingUp className="w-6 h-6" />, step: '03', title: 'Follow your roadmap', desc: 'Track milestones, attend workshops, and book sessions — all mapped to your personal learning journey.' },
            ].map((item) => (
              <div key={item.step} className="card p-6">
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <p className="text-xs font-semibold text-brand mb-2">STEP {item.step}</p>
                <h3 className="text-lg font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-ink-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-ink mb-4">Smart mentor recommendations</h2>
            <p className="text-ink-400 mb-6">
              No need to search blindly. After you set your skills and goals, SkillSphere calculates a match score
              for every mentor based on shared expertise, related skills, experience, and availability.
            </p>
            <div className="space-y-3">
              {[
                'Skill-level matching with weighted scoring',
                'Related skill detection for broader coverage',
                'Availability and experience factored in',
                'Transparent match percentages you can trust',
              ].map((point) => (
                <div key={point} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <span className="text-sm text-ink-600">{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-ink-100">
              <img src="https://i.pravatar.cc/150?img=45" alt="Mentor" className="w-12 h-12 rounded-full" />
              <div className="flex-1">
                <p className="font-semibold text-ink">Sarah Wanjiku</p>
                <p className="text-sm text-ink-400">Senior Frontend Engineer</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brand">92%</p>
                <p className="text-xs text-ink-400">Skill Match</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['React', 'JavaScript', 'Next.js', 'TypeScript'].map((s) => (
                <span key={s} className="badge bg-brand-50 text-brand-700">{s}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Available this week
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink-700 py-20">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start your learning journey?</h2>
          <p className="text-ink-200 mb-8 max-w-xl mx-auto">
            Join SkillSphere today and connect with mentors who can help you reach your goals.
          </p>
          <Link to="/register">
            <Button size="lg">Create your free account</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink-900 py-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-ink-200">SkillSphere</span>
          </div>
          <p className="text-sm text-ink-400">Skill-sharing, mentorship, and personalized learning.</p>
        </div>
      </footer>
    </div>
  );
}
