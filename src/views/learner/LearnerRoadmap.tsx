'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui';
import { RoadmapTimeline } from '@/components/roadmap/RoadmapTimeline';
import { Modal } from '@/components/ui/Modal';
import { GraduationCap, Plus, Sparkles, MessageSquare, Wand2 } from 'lucide-react';
import type { SkillLevel } from '@/types';
import {
  getRoadmap,
  getLearnerProfile,
  getSkills,
  generateRoadmap,
  toggleMilestone,
} from '@/services/dataService';

export function LearnerRoadmapPage() {
  const { user } = useAuth();
  if (!user) return null;

  return <LearnerRoadmapContent key={user.id} userId={user.id} />;
}

function LearnerRoadmapContent({ userId }: { userId: string }) {
  const { show } = useToast();
  const [genOpen, setGenOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const roadmap = getRoadmap(userId);
  const profile = getLearnerProfile(userId);
  const skills = getSkills();

  const [goal, setGoal] = useState(profile?.learningGoal ?? '');
  const [currentLevel, setCurrentLevel] = useState<SkillLevel>((profile?.skillLevels[profile.skillIds[0]] ?? 'beginner') as SkillLevel);
  const [targetSkills, setTargetSkills] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState(profile?.targetTimeframe ?? '6 months');

  const handleGenerate = () => {
    if (!goal || targetSkills.length === 0) {
      show('Please enter a goal and select target skills.', 'error');
      return;
    }
    generateRoadmap({
      learnerId: userId,
      goal,
      currentLevel,
      existingSkills: profile?.skillIds ?? [],
      targetSkills,
      timeframe,
    });
    show('Roadmap generated!', 'success');
    setGenOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleToggleMilestone = (milestoneId: string) => {
    if (!roadmap) return;
    toggleMilestone(roadmap.id, milestoneId);
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader
        title="Learning Roadmap"
        description="Your personalized path to achieving your learning goals."
        action={
          <Button onClick={() => setGenOpen(true)}>
            <Plus className="w-4 h-4" /> {roadmap ? 'Regenerate' : 'Generate'} Roadmap
          </Button>
        }
      />

      {roadmap ? (
        <div className="card p-6 lg:p-8">
          <RoadmapTimeline roadmap={roadmap} onToggleMilestone={handleToggleMilestone} />
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title="No roadmap yet"
            description="Generate a personalized learning roadmap based on your skills, goals, and timeframe."
            action={<Button onClick={() => setGenOpen(true)}><Sparkles className="w-4 h-4" /> Generate Roadmap</Button>}
          />
        </div>
      )}

      {/* AI Roadmap Generator banner */}
      <div className="card p-5 mt-6 bg-brand-50 border-brand-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-ink">AI-Powered Roadmap Generator</h3>
              <p className="text-sm text-ink-400">Want a more detailed roadmap with phases, projects, and milestones? Try our AI generator.</p>
            </div>
          </div>
          <Link href="/learner/roadmap/create">
            <Button size="sm"><Sparkles className="w-4 h-4" /> Try AI Roadmap</Button>
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

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate Learning Roadmap" size="lg">
        <div className="space-y-4">
          <Input label="Learning goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Become a Full-Stack Developer" />
          <Select label="Current level" value={currentLevel} onChange={(e) => setCurrentLevel(e.target.value as SkillLevel)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </Select>
          <Select label="Timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="1 month">1 month</option>
            <option value="3 months">3 months</option>
            <option value="6 months">6 months</option>
            <option value="1 year">1 year</option>
          </Select>
          <div>
            <label className="label">Target skills</label>
            <p className="text-sm text-ink-400 mb-3">Select the skills you want to learn. These will become your roadmap milestones.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {skills.map((skill) => {
                const isSelected = targetSkills.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    onClick={() => {
                      if (isSelected) setTargetSkills(targetSkills.filter((id) => id !== skill.id));
                      else setTargetSkills([...targetSkills, skill.id]);
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-all ${
                      isSelected ? 'border-brand bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-ink-300'
                    }`}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleGenerate}><Sparkles className="w-4 h-4" /> Generate</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
