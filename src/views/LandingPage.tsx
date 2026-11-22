'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Compass,
  GraduationCap,
  LayoutDashboard,
  Map,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Waypoints,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PublicNavigation } from '@/components/layout/PublicNavigation';

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
      <h2 className="mb-4 text-3xl font-bold leading-tight text-ink lg:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-ink-400">{description}</p>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-[24px] border border-ink-200 bg-ink p-5 shadow-card">
      <div className="mb-5 flex items-center justify-between border-b border-ink-200 pb-4">
        <div>
          <p className="text-xs text-ink-400">Learner Dashboard</p>
          <p className="mt-1 font-semibold text-ink-50">Continue your learning</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-brand">
          <LayoutDashboard className="h-4 w-4" />
        </div>
      </div>
      <div className="mb-4 rounded-2xl bg-brand p-4 text-white">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Roadmap progress</span>
          <TrendingUp className="h-4 w-4 text-brand-800" />
        </div>
        <div className="mb-2 h-2 rounded-full bg-white/20">
          <div className="h-2 w-3/5 rounded-full bg-white" />
        </div>
        <p className="text-xs text-white/70">Keep building momentum toward your goals.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { icon: Sparkles, label: 'AI Career Advisor', detail: 'Personalized guidance' },
          { icon: Compass, label: 'Recommended Mentors', detail: 'Matched to your goals' },
          { icon: Map, label: 'AI Roadmap Generator', detail: 'Plan what to learn next' },
          { icon: CalendarDays, label: 'Upcoming Sessions', detail: 'Stay on track' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-900 text-brand">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink-50">{item.label}</span>
              <span className="block truncate text-[11px] text-ink-400">{item.detail}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MentorPreview() {
  return (
    <div className="relative">
      <div className="absolute -bottom-5 -left-5 h-2/3 w-2/3 rounded-[24px] bg-brand-900" />
      <div className="relative overflow-hidden rounded-[24px] border border-ink-200 bg-ink p-5 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://i.pravatar.cc/150?img=45"
              alt="Mentor"
              width={52}
              height={52}
              unoptimized
              className="h-13 w-13 rounded-full"
            />
            <div>
              <p className="font-semibold text-ink-50">Sarah Wanjiku</p>
              <p className="text-sm text-ink-400">Senior Frontend Engineer</p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm text-brand">
            <Star className="h-4 w-4 fill-brand" /> 4.9
          </span>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {['React', 'TypeScript', 'Next.js', 'Tailwind'].map((skill) => (
            <span key={skill} className="badge bg-brand-900 text-brand-200">{skill}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-ink-200 pt-4 text-sm">
          <div>
            <p className="text-xs text-ink-400">Experience</p>
            <p className="mt-1 font-semibold text-ink-50">8 years</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Availability</p>
            <p className="mt-1 font-semibold text-emerald-400">Available</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationPreview() {
  return (
    <div className="rounded-[24px] border border-ink-200 bg-ink p-5 shadow-card">
      <div className="mb-5 flex items-center gap-3 border-b border-ink-200 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-brand">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-ink-50">Mentor verification</p>
          <p className="text-xs text-ink-400">A review process built on trust</p>
        </div>
      </div>
      <div className="space-y-3">
        {[
          ['Application submitted', true],
          ['Competency reviewed', true],
          ['Admin approval', true],
          ['Mentor profile activated', false],
        ].map(([label, complete]) => (
          <div key={label as string} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${complete ? 'bg-brand text-white' : 'bg-ink-100 text-ink-300'}`}>
              {complete ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            <span className={`text-sm ${complete ? 'text-ink-50' : 'text-ink-400'}`}>{label as string}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <PublicNavigation />

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative mx-auto w-full max-w-xl lg:mx-0">
              <div className="absolute -bottom-5 -left-5 h-2/3 w-2/3 rounded-[24px] bg-brand-900" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-ink-800 shadow-card">
                <Image
                  src="/images/hero1.jpg"
                  alt="A learner developing new skills"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  className="object-cover object-center"
                />
              </div>
            </div>
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-900 px-3 py-1.5 text-sm font-medium text-brand-200">
                <Compass className="h-4 w-4" />
                Skill-sharing, mentorship & talent showcase
              </div>
              <h1 className="mb-5 text-4xl font-bold leading-tight text-ink lg:text-5xl">
                Discover skills. Connect with mentors.{' '}
                <span className="text-brand">Grow on your own terms.</span>
              </h1>
              <p className="mb-8 max-w-2xl text-lg leading-8 text-ink-400">
                SkillSphere matches you with expert mentors based on your skills, goals, and learning level —
                then guides you through a personalized roadmap so you always know what to learn next.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register"><Button size="lg" className="w-full sm:w-auto">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/mentors"><Button variant="secondary" size="lg" className="w-full sm:w-auto"><Compass className="h-4 w-4 text-brand" /> Explore Mentors</Button></Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand" /> Free to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand" /> Mentor-vetted talent</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-brand" /> No credit card required</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-ink-200 bg-ink-800 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeading
              eyebrow="One connected ecosystem"
              title="A clear path from curiosity to capability"
              description="SkillSphere brings together guided learning, trusted mentorship, practical workshops, and a place to showcase progress."
              centered
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { icon: Target, title: 'Find your direction', text: 'Explore skills, set learning goals, and use the Career Advisor to turn ambition into a practical next step.', href: '/skills' },
                { icon: Users, title: 'Learn with the right people', text: 'Browse public mentor profiles, compare expertise, and request a session when you are ready to connect.', href: '/mentors' },
                { icon: Waypoints, title: 'Show your progress', text: 'Follow a roadmap, attend workshops, and build a profile that makes your developing skills visible.', href: '/roadmaps' },
              ].map((item, index) => (
                <Link key={item.title} href={item.href} className={`group rounded-[20px] border p-6 shadow-card transition-transform hover:-translate-y-1 ${index === 0 ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-ink text-ink-50'}`}>
                  <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${index === 0 ? 'bg-white/15' : 'bg-brand-900 text-brand'}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className={`text-sm leading-6 ${index === 0 ? 'text-white/75' : 'text-ink-400'}`}>{item.text}</p>
                  <span className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${index === 0 ? 'text-white' : 'text-brand'}`}>Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 lg:order-1">
              <DashboardPreview />
            </div>
            <div className="order-1 lg:order-2">
              <SectionHeading
                eyebrow="Learner experience"
                title="Everything you need to keep moving"
                description="The learner workspace brings your recommendations, conversations, roadmap, workshops, and progress into one focused experience."
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register"><Button size="lg">Explore the Learner Experience <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/roadmaps"><Button variant="secondary" size="lg">View Roadmaps</Button></Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  [Sparkles, 'AI Career Advisor', '/learner/career-advisor'],
                  [Map, 'AI Learning Roadmap', '/learner/roadmap/create'],
                  [BarChart3, 'Learning Progress', '/learner/progress'],
                  [BookOpen, 'Workshops', '/workshops'],
                ].map(([Icon, label, href]) => (
                  <Link key={label as string} href={href as string} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink p-3 transition-colors hover:border-brand">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-900 text-brand"><Icon className="h-4 w-4" /></span>
                    <span className="text-sm font-semibold text-ink-50">{label as string}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-ink-200 bg-ink-800 py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2 lg:gap-20 lg:px-8">
            <div>
              <SectionHeading
                eyebrow="Mentor experience"
                title="Share what you know with purpose"
                description="Mentors build a professional profile, complete competency verification, and then guide learners through sessions and workshops after approval."
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register"><Button size="lg">Become a Mentor <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/about"><Button variant="secondary" size="lg">Learn About SkillSphere</Button></Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link href="/mentor/apply" className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink p-3 transition-colors hover:border-brand">
                  <ShieldCheck className="h-5 w-5 text-brand" />
                  <span className="text-sm font-semibold text-ink-50">Competency application</span>
                </Link>
                <Link href="/workshops" className="flex items-center gap-3 rounded-xl border border-ink-200 bg-ink p-3 transition-colors hover:border-brand">
                  <BookOpen className="h-5 w-5 text-brand" />
                  <span className="text-sm font-semibold text-ink-50">Share workshops</span>
                </Link>
              </div>
            </div>
            <VerificationPreview />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <MentorPreview />
            <div>
              <SectionHeading
                eyebrow="Explore publicly"
                title="Find the expertise that fits your goals"
                description="Browse mentor skills, experience, availability, and approved public profiles before deciding who you want to learn from."
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/mentors"><Button size="lg">Explore Mentors <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/skills"><Button variant="secondary" size="lg"><Search className="h-4 w-4 text-brand" /> Explore Skills</Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-ink-200 bg-ink-50 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <SectionHeading
              eyebrow="For employers and recruiters"
              title="Discover emerging talent endorsed by mentors"
              description="Review motivated candidates who have chosen to make their profiles public, with learning roadmaps, skills, achievements, and mentor recommendations."
              centered
            />
            <div className="mx-auto mt-10 max-w-4xl rounded-[24px] border border-ink-200 bg-ink p-6 shadow-card sm:p-8">
              <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr_auto]">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white">
                  <Briefcase className="h-7 w-7" />
                </div>
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand">
                    <Star className="h-4 w-4 fill-brand" /> Mentor-endorsed profiles
                  </div>
                  <p className="text-sm leading-6 text-ink-400">Use search, skills, career areas, and recommendation sorting to discover candidates whose goals align with your opportunity.</p>
                </div>
                <Link href="/talent"><Button size="lg">Find Talents <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="How SkillSphere works"
            title="A guided journey, one meaningful step at a time"
            description="Start with a goal, build the right connections, and turn steady practice into visible progress."
            centered
          />
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {[
              [Users, '01', 'Create your profile', 'Choose whether you are here to learn or mentor, then set up your starting point.', '/register'],
              [Compass, '02', 'Discover opportunities', 'Explore skills, public mentors, workshops, and emerging talent.', '/mentors'],
              [MessageSquare, '03', 'Connect and learn', 'Request mentorship sessions, ask for guidance, and take part in workshops.', '/mentors'],
              [TrendingUp, '04', 'Track your growth', 'Follow a roadmap, complete milestones, and make your progress visible.', '/roadmaps'],
            ].map(([Icon, step, title, text, href]) => (
              <Link key={step as string} href={href as string} className="group rounded-[20px] border border-ink-200 bg-ink p-5 shadow-card transition-transform hover:-translate-y-1">
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-brand"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-bold tracking-[0.18em] text-brand">{step as string}</span>
                </div>
                <h3 className="mb-2 font-semibold text-ink-50">{title as string}</h3>
                <p className="text-sm leading-6 text-ink-400">{text as string}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-ink-800 py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-800">Start your next chapter</p>
            <h2 className="mb-4 text-3xl font-bold text-white lg:text-4xl">Ready to start your learning journey?</h2>
            <p className="mx-auto mb-8 max-w-xl leading-7 text-ink-400">
              Join SkillSphere today and connect with mentors who can help you reach your goals.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/register"><Button size="lg">Create your free account</Button></Link>
              <Link href="/talent"><Button variant="secondary" size="lg">Find Emerging Talent</Button></Link>
              <Link href="/workshops"><Button variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">Explore Workshops</Button></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink-900 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand"><GraduationCap className="h-4 w-4 text-white" /></span>
            <span className="text-sm font-semibold text-ink-400">SkillSphere</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-400">
            <Link href="/talent" className="hover:text-ink">Find Talent</Link>
            <Link href="/mentors" className="hover:text-ink">Find Mentors</Link>
            <Link href="/skills" className="hover:text-ink">Skills</Link>
            <Link href="/about" className="hover:text-ink">About</Link>
          </div>
          <p className="text-xs text-ink-400">Skill-sharing, mentorship, and personalized learning.</p>
        </div>
      </footer>
    </div>
  );
}
