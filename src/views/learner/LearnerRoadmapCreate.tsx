'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui';
import { Sparkles, Check, ArrowRight, ArrowLeft, Compass, BookOpen, MessageSquare, Search } from 'lucide-react';
import type { SkillLevel, LearningRoadmap, MilestoneStatus } from '@/types';
import {
  getCareerPaths,
  generateAIRoadmap,
  getAIRoadmap,
  toggleMilestoneComplete,
  getRoadmapProgress,
} from '@/services/ai/roadmapService';
import { getLearnerProfile, getSkills } from '@/services/dataService';

const steps = ['Career Path', 'Current Skills', 'Skill Level', 'Interests', 'Availability', 'Timeline'];

const interestOptions = ['Frontend', 'Backend', 'UI/UX', 'Web Performance', 'DevOps', 'Mobile', 'Data', 'Security', 'Testing', 'Cloud'];

export function LearnerRoadmapCreatePage() {
  const { user } = useAuth();
  if (!user) return null;

  return <LearnerRoadmapCreateContent key={user.id} userId={user.id} userName={user.name} />;
}

function LearnerRoadmapCreateContent({ userId, userName }: { userId: string; userName: string }) {
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<LearningRoadmap | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const profile = getLearnerProfile(userId);
  const allSkills = getSkills();
  const careerPaths = getCareerPaths();
  const existingRoadmap = getAIRoadmap();

  const [careerPath, setCareerPath] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skillIds ?? []);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>(profile?.skillLevels ?? {});
  const [interests, setInterests] = useState<string[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState(profile?.availableHoursPerWeek ?? 10);
  const [targetTimeline, setTargetTimeline] = useState(profile?.targetTimeframe ?? '6 months');

  const canProceed = () => {
    if (step === 0) return !!careerPath;
    if (step === 1) return selectedSkills.length > 0;
    if (step === 2) return selectedSkills.every((id) => skillLevels[id]);
    if (step === 3) return interests.length > 0;
    if (step === 4) return hoursPerWeek > 0;
    return !!targetTimeline;
  };

  const handleGenerate = () => {
    setGenerating(true);
    setGenStep(0);

    const genSteps = [
      'Analyzing your current skills',
      'Identifying skill gaps',
      'Mapping your career path',
      'Creating learning milestones',
    ];

    genSteps.forEach((_, idx) => {
      setTimeout(() => {
        setGenStep(idx + 1);
        if (idx === genSteps.length - 1) {
          setTimeout(() => {
            const roadmap = generateAIRoadmap({
              learnerId: userId,
              careerPath,
              currentSkills: selectedSkills,
              skillLevels,
              interests,
              hoursPerWeek,
              targetTimeline,
            });
            setGeneratedRoadmap(roadmap);
            setGenerating(false);
            show('Your personalized roadmap is ready!', 'success');
          }, 500);
        }
      }, (idx + 1) * 600);
    });
  };

  const handleToggleMilestone = (phaseId: string, milestoneId: string) => {
    if (!generatedRoadmap) return;
    const updated = toggleMilestoneComplete(generatedRoadmap.id, phaseId, milestoneId);
    if (updated) {
      setGeneratedRoadmap(updated);
      setRefreshKey((k) => k + 1);
    }
  };

  // Generation loading screen
  if (generating) {
    const genSteps = [
      'Analyzing your current skills',
      'Identifying skill gaps',
      'Mapping your career path',
      'Creating learning milestones',
    ];
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-brand animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-ink mb-2">Building your personalized roadmap...</h2>
          <p className="text-sm text-ink-400 mb-8">This will only take a moment.</p>
          <div className="w-full max-w-md space-y-3">
            {genSteps.map((label, idx) => {
              const done = genStep > idx;
              const current = genStep === idx;
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-brand text-white' : current ? 'bg-brand-50 text-brand border-2 border-brand' : 'bg-ink-100 text-ink-300'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : current ? <span className="w-3 h-3 rounded-full bg-brand animate-pulse" /> : <span className="text-xs">{idx + 1}</span>}
                  </div>
                  <span className={`text-sm ${done ? 'text-ink-600' : current ? 'text-ink font-medium' : 'text-ink-300'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Generated roadmap display
  if (generatedRoadmap) {
    return (
      <DashboardLayout key={refreshKey}>
        <PageHeader
          title={`${generatedRoadmap.careerPath} Roadmap`}
          description={`Personalized for ${userName.split(' ')[0]} • ${generatedRoadmap.targetTimeline} • ${generatedRoadmap.hoursPerWeek}h/week`}
          action={
            <div className="flex gap-2">
              <Link href="/learner/career-advisor">
                <Button variant="secondary" size="sm"><MessageSquare className="w-4 h-4" /> Ask Career Advisor</Button>
              </Link>
              <Button size="sm" onClick={() => { setGeneratedRoadmap(null); setStep(0); }}>
                <Sparkles className="w-4 h-4" /> Regenerate
              </Button>
            </div>
          }
        />

        {/* Progress overview */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Roadmap Progress</h2>
              <p className="text-sm text-ink-400">
                {generatedRoadmap.phases.flatMap((p) => p.milestones).filter((m) => m.status === 'completed').length} of {generatedRoadmap.phases.flatMap((p) => p.milestones).length} milestones completed
              </p>
            </div>
            <span className="text-3xl font-bold text-brand">{getRoadmapProgress(generatedRoadmap)}%</span>
          </div>
          <ProgressBar value={getRoadmapProgress(generatedRoadmap)} />
        </div>

        {/* Phases */}
        <div className="space-y-6">
          {generatedRoadmap.phases.map((phase, phaseIdx) => (
            <div key={phase.id} className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  phase.milestones[0].status === 'completed' ? 'bg-brand text-white' : 'bg-ink-100 text-ink-500'
                }`}>
                  {phase.milestones[0].status === 'completed' ? <Check className="w-5 h-5" /> : phaseIdx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink">{phase.title}</h3>
                  <p className="text-sm text-ink-400">{phase.description}</p>
                </div>
                <MilestoneStatusBadge status={phase.milestones[0].status} />
              </div>

              {/* Milestone details */}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.milestones[0].topics.map((topic) => (
                      <Badge key={topic} variant="gray">{topic}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Project</p>
                  <div className="flex items-center gap-2 text-sm text-ink-600">
                    <BookOpen className="w-4 h-4 text-brand" />
                    {phase.milestones[0].project}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-ink-50">
                {phase.milestones[0].status !== 'locked' && (
                  <Button
                    size="sm"
                    variant={phase.milestones[0].status === 'completed' ? 'secondary' : 'primary'}
                    onClick={() => handleToggleMilestone(phase.id, phase.milestones[0].id)}
                  >
                    {phase.milestones[0].status === 'completed' ? (
                      <><Check className="w-4 h-4" /> Mark Incomplete</>
                    ) : (
                      <><Check className="w-4 h-4" /> Mark Complete</>
                    )}
                  </Button>
                )}
                {phase.milestones[0].status !== 'locked' && (
                  <Link href="/learner/mentors">
                    <Button size="sm" variant="ghost">
                      <Search className="w-4 h-4" /> Find a Mentor for {phase.milestones[0].skill}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  // Multi-step form
  const progressValue = ((step + 1) / steps.length) * 100;

  return (
    <DashboardLayout>
      <PageHeader title="AI Learning Roadmap" description="Generate a personalized learning plan based on your career path and current skills." />

      {existingRoadmap && !generatedRoadmap && (
        <div className="card p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">You have an existing AI roadmap for {existingRoadmap.careerPath}</p>
            <p className="text-xs text-ink-400">Generating a new one will replace it.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setGeneratedRoadmap(existingRoadmap)}>View Existing</Button>
        </div>
      )}

      <div className="max-w-2xl">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    idx < step ? 'bg-brand text-white' : idx === step ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400'
                  }`}>
                    {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${idx === step ? 'text-ink font-medium' : 'text-ink-400'}`}>{s}</span>
                </div>
                {idx < steps.length - 1 && <div className={`h-0.5 flex-1 mx-2 ${idx < step ? 'bg-brand' : 'bg-ink-100'}`} />}
              </div>
            ))}
          </div>
          <ProgressBar value={progressValue} />
        </div>

        <div className="card p-6">
          {step === 0 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">What career are you working toward?</h3>
              <p className="text-sm text-ink-400 mb-4">Select a career path and we&apos;ll build a roadmap to get you there.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {careerPaths.map((path) => (
                  <button
                    key={path}
                    onClick={() => setCareerPath(path)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                      careerPath === path ? 'border-brand bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-ink-300'
                    }`}
                  >
                    <Compass className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium">{path}</span>
                    {careerPath === path && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">What skills do you already have?</h3>
              <p className="text-sm text-ink-400 mb-4">Select the skills you&apos;re already familiar with.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
                {allSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSkills(selectedSkills.filter((id) => id !== skill.id));
                          const newLevels = { ...skillLevels };
                          delete newLevels[skill.id];
                          setSkillLevels(newLevels);
                        } else {
                          setSelectedSkills([...selectedSkills, skill.id]);
                          setSkillLevels({ ...skillLevels, [skill.id]: 'beginner' });
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all ${
                        isSelected ? 'border-brand bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-ink-300'
                      }`}
                    >
                      {skill.name}
                      {isSelected ? <Check className="w-4 h-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">What&apos;s your skill level?</h3>
              <p className="text-sm text-ink-400 mb-4">Set your current level for each selected skill.</p>
              {selectedSkills.length === 0 ? (
                <p className="text-sm text-ink-400">No skills selected. Go back and select skills.</p>
              ) : (
                <div className="space-y-3">
                  {selectedSkills.map((skillId) => {
                    const skill = allSkills.find((s) => s.id === skillId);
                    if (!skill) return null;
                    return (
                      <div key={skillId} className="flex items-center justify-between bg-ink-50 rounded-lg px-4 py-3">
                        <span className="text-sm font-medium text-ink">{skill.name}</span>
                        <Select
                          value={skillLevels[skillId] ?? 'beginner'}
                          onChange={(e) => setSkillLevels({ ...skillLevels, [skillId]: e.target.value as SkillLevel })}
                          className="w-40"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">What areas interest you?</h3>
              <p className="text-sm text-ink-400 mb-4">Select areas you&apos;d like to explore.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {interestOptions.map((interest) => {
                  const isSelected = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => {
                        if (isSelected) setInterests(interests.filter((i) => i !== interest));
                        else setInterests([...interests, interest]);
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        isSelected ? 'border-brand bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-ink-300'
                      }`}
                    >
                      {interest}
                      {isSelected ? <Check className="w-4 h-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink mb-2">How much time can you dedicate?</h3>
              <p className="text-sm text-ink-400 mb-4">This helps us pace your roadmap realistically.</p>
              <Input
                label="Hours per week"
                type="number"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              />
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((h) => (
                  <button key={h} onClick={() => setHoursPerWeek(h)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${hoursPerWeek === h ? 'border-brand bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'}`}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink mb-2">Target timeframe</h3>
              <p className="text-sm text-ink-400 mb-4">When do you want to achieve this career path?</p>
              <Select label="Timeline" value={targetTimeline} onChange={(e) => setTargetTimeline(e.target.value)}>
                <option value="1 month">1 month (intensive)</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="1 year">1 year</option>
                <option value="No specific deadline">No specific deadline</option>
              </Select>
              <div className="bg-ink-50 rounded-lg p-4 space-y-2 mt-4">
                <p className="text-sm font-medium text-ink">Roadmap Summary</p>
                <p className="text-sm text-ink-400">Career: {careerPath}</p>
                <p className="text-sm text-ink-400">Current skills: {selectedSkills.length} selected</p>
                <p className="text-sm text-ink-400">Interests: {interests.join(', ')}</p>
                <p className="text-sm text-ink-400">Time: {hoursPerWeek}h/week</p>
                <p className="text-sm text-ink-400">Timeline: {targetTimeline}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-ink-100">
            <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={!canProceed()}>
                <Sparkles className="w-4 h-4" /> Generate My Learning Roadmap
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config: Record<MilestoneStatus, { label: string; variant: 'gray' | 'brand' | 'amber' | 'green' }> = {
    locked: { label: 'Locked', variant: 'gray' },
    available: { label: 'Available', variant: 'brand' },
    'in-progress': { label: 'In Progress', variant: 'amber' },
    completed: { label: 'Completed', variant: 'green' },
  };
  const cfg = config[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
