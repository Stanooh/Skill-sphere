import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { SkillSelector } from '@/components/profile/SkillSelector';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui';
import { Check, GraduationCap } from 'lucide-react';
import type { SkillLevel } from '@/types';
import {
  getLearnerProfile,
  updateLearnerProfile,
  getSkills,
} from '@/services/dataService';

const steps = ['Basic Info', 'Skills & Interests', 'Skill Levels', 'Learning Goal', 'Preferences'];

export function LearnerProfilePage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);

  const profile = getLearnerProfile(user!.id);
  const skills = getSkills();

  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [education, setEducation] = useState(profile?.education ?? '');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(profile?.skillIds ?? []);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>(profile?.skillLevels ?? {});
  const [learningGoal, setLearningGoal] = useState(profile?.learningGoal ?? '');
  const [targetTimeframe, setTargetTimeframe] = useState(profile?.targetTimeframe ?? '');
  const [availableHours, setAvailableHours] = useState(profile?.availableHoursPerWeek ?? 0);

  const handleSave = () => {
    updateLearnerProfile(user!.id, {
      bio,
      location,
      education,
      skillIds: selectedSkillIds,
      skillLevels,
      learningGoal,
      targetTimeframe,
      availableHoursPerWeek: availableHours,
      profileComplete: true,
    });
    setSaved(true);
    show('Profile saved successfully.', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const canProceed = () => {
    if (step === 0) return bio.trim() && location.trim();
    if (step === 1) return selectedSkillIds.length > 0;
    if (step === 2) return selectedSkillIds.every((id) => skillLevels[id]);
    if (step === 3) return learningGoal.trim();
    return true;
  };

  const progressValue = ((step + 1) / steps.length) * 100;

  return (
    <DashboardLayout>
      <PageHeader title="My Profile" description="Keep your profile up to date to get the best mentor recommendations." />

      <div className="max-w-2xl">
        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      idx < step ? 'bg-brand text-white' : idx === step ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${idx === step ? 'text-ink font-medium' : 'text-ink-400'}`}>
                    {s}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${idx < step ? 'bg-brand' : 'bg-ink-100'}`} />
                )}
              </div>
            ))}
          </div>
          <ProgressBar value={progressValue} />
        </div>

        <div className="card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink mb-2">Basic Information</h3>
              <Textarea label="Bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell mentors about yourself..." />
              <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nairobi, Kenya" />
              <Input label="Education / Background" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="BSc Computer Science, University of Nairobi" />
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">Skills & Interests</h3>
              <p className="text-sm text-ink-400 mb-4">Select the skills you're interested in learning or improving.</p>
              <SkillSelector
                skills={skills}
                selectedIds={selectedSkillIds}
                selectedLevels={skillLevels}
                onChange={(ids, levels) => {
                  setSelectedSkillIds(ids);
                  setSkillLevels(levels);
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">Skill Levels</h3>
              <p className="text-sm text-ink-400 mb-4">Set your current level for each selected skill.</p>
              {selectedSkillIds.length === 0 ? (
                <p className="text-sm text-ink-400">No skills selected. Go back and select skills first.</p>
              ) : (
                <div className="space-y-3">
                  {selectedSkillIds.map((skillId) => {
                    const skill = skills.find((s) => s.id === skillId);
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink mb-2">Learning Goal</h3>
              <Input label="What do you want to achieve?" value={learningGoal} onChange={(e) => setLearningGoal(e.target.value)} placeholder="Become a Full-Stack Developer" />
              <Select label="Target timeframe" value={targetTimeframe} onChange={(e) => setTargetTimeframe(e.target.value)}>
                <option value="">Select a timeframe</option>
                <option value="1 month">1 month</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
                <option value="1 year">1 year</option>
                <option value="No specific deadline">No specific deadline</option>
              </Select>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink mb-2">Availability & Preferences</h3>
              <Input
                label="Available hours per week"
                type="number"
                min={0}
                max={40}
                value={availableHours}
                onChange={(e) => setAvailableHours(Number(e.target.value))}
              />
              <div className="bg-ink-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-ink">Profile Summary</p>
                <p className="text-sm text-ink-400">Skills: {selectedSkillIds.length} selected</p>
                <p className="text-sm text-ink-400">Goal: {learningGoal || 'Not set'}</p>
                <p className="text-sm text-ink-400">Timeframe: {targetTimeframe || 'Not set'}</p>
                <p className="text-sm text-ink-400">Hours/week: {availableHours}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-ink-100">
            <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Previous
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!canProceed()}>
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Complete Profile'}
              </Button>
            )}
          </div>
        </div>

        {profile?.profileComplete && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
            <GraduationCap className="w-4 h-4" />
            Your profile is complete. Mentor recommendations are being generated.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
