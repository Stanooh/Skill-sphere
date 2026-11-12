'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { SkillSelector } from '@/components/profile/SkillSelector';
import { ProgressBar } from '@/components/ui';
import {
  Check,
  Eye,
  EyeOff,
  Trash2,
  Star,
  Building,
} from 'lucide-react';
import type { SkillLevel, RecommendationApprovalStatus } from '@/types';
import {
  getLearnerProfile,
  updateLearnerProfile,
  getSkills,
  getUserById,
} from '@/services/dataService';
import {
  getRecommendationsForStudent,
  updateStudentApproval,
} from '@/services/recommendationService';
import {
  getEmployerContactRequestsForLearner,
} from '@/services/talentService';
import { deleteLearnerAccount } from '@/services/accountService';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';

const steps = ['Basic Info', 'Skills & Interests', 'Skill Levels', 'Learning Goal', 'Preferences'];

export function LearnerProfilePage() {
  const { user, logout } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const profile = user ? getLearnerProfile(user.id) : undefined;
  const skills = getSkills();

  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [education, setEducation] = useState(profile?.education ?? '');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(profile?.skillIds ?? []);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>(profile?.skillLevels ?? {});
  const [learningGoal, setLearningGoal] = useState(profile?.learningGoal ?? '');
  const [targetTimeframe, setTargetTimeframe] = useState(profile?.targetTimeframe ?? '');
  const [availableHours, setAvailableHours] = useState(profile?.availableHoursPerWeek ?? 0);
  const [employerVisibility, setEmployerVisibility] = useState<boolean>(
    profile?.employerVisibility ?? false
  );

  const [, setRecommendationsRefreshKey] = useState(0);
  const recommendations = user ? getRecommendationsForStudent(user.id) : [];
  const contactRequests = user ? getEmployerContactRequestsForLearner(user.id) : [];

  if (!user) return null;

  const handleSave = () => {
    updateLearnerProfile(user.id, {
      bio,
      location,
      education,
      skillIds: selectedSkillIds,
      skillLevels,
      learningGoal,
      targetTimeframe,
      availableHoursPerWeek: availableHours,
      profileComplete: true,
      employerVisibility,
    });
    setSaved(true);
    show('Profile saved successfully.', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggleVisibility = () => {
    const nextVal = !employerVisibility;
    setEmployerVisibility(nextVal);
    updateLearnerProfile(user.id, {
      employerVisibility: nextVal,
    });
    show(
      nextVal
        ? 'Your profile is now publicly visible to employers on the Find Talent page.'
        : 'Your profile has been made private and removed from employer search.',
      'info'
    );
  };

  const handleRecommendationDecision = (
    recId: string,
    status: RecommendationApprovalStatus
  ) => {
    updateStudentApproval(recId, user.id, status);
    setRecommendationsRefreshKey((key) => key + 1);
    show(
      status === 'accepted'
        ? 'Recommendation accepted. It is now displayed on your public profile.'
        : 'Recommendation declined and hidden from public display.',
      'success'
    );
  };

  const handleDeleteAccount = async () => {
    deleteLearnerAccount(user.id);
    await logout();
    router.push('/');
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
      <PageHeader
        title="My Profile & Settings"
        description="Manage your learning profile, mentor recommendations, employer visibility, and account settings."
      />

      <div className="max-w-2xl space-y-8">
        {/* Step indicator */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, idx) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      idx < step
                        ? 'bg-brand text-white'
                        : idx === step
                        ? 'bg-brand text-white'
                        : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 hidden sm:block ${
                      idx === step ? 'text-ink font-medium' : 'text-ink-400'
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      idx < step ? 'bg-brand' : 'bg-ink-100'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <ProgressBar value={progressValue} />
        </div>

        {/* Profile Wizard Form */}
        <div className="card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink mb-2">Basic Information</h3>
              <Textarea
                label="Bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell mentors and employers about yourself, your passion, and background..."
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Nairobi, Kenya"
              />
              <Input
                label="Education / Academic Background"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. BSc Computer Science, University of Nairobi"
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-ink mb-2">Skills & Interests</h3>
              <p className="text-sm text-ink-400 mb-4">
                Select the technical skills you are currently developing.
              </p>
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
              <p className="text-sm text-ink-400 mb-4">
                Specify your current proficiency level for each chosen skill.
              </p>
              {selectedSkillIds.length === 0 ? (
                <p className="text-sm text-ink-400">No skills selected. Go back and select skills first.</p>
              ) : (
                <div className="space-y-3">
                  {selectedSkillIds.map((skillId) => {
                    const skill = skills.find((s) => s.id === skillId);
                    if (!skill) return null;
                    return (
                      <div
                        key={skillId}
                        className="flex items-center justify-between bg-ink-100 rounded-lg px-4 py-3 border border-ink-200"
                      >
                        <span className="text-sm font-medium text-ink">{skill.name}</span>
                        <Select
                          value={skillLevels[skillId] ?? 'beginner'}
                          onChange={(e) =>
                            setSkillLevels({
                              ...skillLevels,
                              [skillId]: e.target.value as SkillLevel,
                            })
                          }
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
              <h3 className="text-lg font-semibold text-ink mb-2">Learning Goal & Career Aspiration</h3>
              <Input
                label="What role or goal are you working towards?"
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                placeholder="e.g. Become a Full-Stack Developer"
              />
              <Select
                label="Target timeframe"
                value={targetTimeframe}
                onChange={(e) => setTargetTimeframe(e.target.value)}
              >
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
                label="Available study hours per week"
                type="number"
                min={0}
                max={60}
                value={availableHours}
                onChange={(e) => setAvailableHours(Number(e.target.value))}
              />
              <div className="bg-ink-100 rounded-lg p-4 space-y-1.5 border border-ink-200 text-sm">
                <p className="font-medium text-ink">Summary Preview</p>
                <p className="text-ink-400">Skills selected: {selectedSkillIds.length}</p>
                <p className="text-ink-400">Target Goal: {learningGoal || 'Not set'}</p>
                <p className="text-ink-400">Timeframe: {targetTimeframe || 'Not specified'}</p>
                <p className="text-ink-400">Commitment: {availableHours} hrs/week</p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-ink-100">
            <Button
              variant="secondary"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Previous
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!canProceed()}>
                {saved ? (
                  <>
                    <Check className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  'Complete & Save Profile'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Employer Visibility Setting */}
        <div className="card p-6 space-y-4 border border-ink-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-ink">
                  Allow Employers to Discover My Profile
                </h3>
                {employerVisibility ? (
                  <span className="badge bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs">
                    Public to Employers
                  </span>
                ) : (
                  <span className="badge bg-ink-100 text-ink-400 text-xs">Private</span>
                )}
              </div>
              <p className="text-sm text-ink-400 mt-1 max-w-xl">
                Make your professional profile, skills, portfolio, and approved mentor recommendations
                visible to employers looking for talent on SkillSphere. Private contact details (such as
                your email and phone) are never shown publicly.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleVisibility}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                employerVisibility ? 'bg-brand' : 'bg-ink-200'
              }`}
              role="switch"
              aria-checked={employerVisibility}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  employerVisibility ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-3 rounded-lg bg-ink-100 text-xs text-ink-400 flex items-center gap-2">
            {employerVisibility ? (
              <>
                <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Your profile is actively visible at <strong>/talent</strong>. Employers can review
                  your skills and send contact requests.
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-ink-300 shrink-0" />
                <span>
                  Your profile is currently private. You will not appear in the employer talent directory.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mentor Recommendations Section */}
        <div className="card p-6 space-y-4 border border-ink-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Mentor Recommendations</h3>
              <p className="text-sm text-ink-400 mt-0.5">
                Review endorsements from your mentors and control whether they appear on your public profile.
              </p>
            </div>
            <span className="badge bg-ink-100 text-ink-400">
              {recommendations.length} Received
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div className="p-6 text-center bg-ink-100 rounded-lg text-ink-400 text-sm">
              <Star className="w-6 h-6 mx-auto mb-2 text-ink-300" />
              You haven&apos;t received any mentor recommendations yet. When a mentor you&apos;ve worked with
              submits one, you&apos;ll be able to review and approve it here.
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => {
                const mentor = getUserById(rec.mentorId);
                const isAccepted = rec.studentApprovalStatus === 'accepted';
                const isDeclined = rec.studentApprovalStatus === 'declined';
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl bg-ink-100 border border-ink-200 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {mentor?.avatar && (
                          <Image
                            src={mentor.avatar}
                            alt={mentor.name}
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-ink">{mentor?.name ?? 'Mentor'}</p>
                          <p className="text-xs text-ink-400">
                            Submitted on {new Date(rec.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isAccepted && (
                          <span className="badge bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs">
                            Approved for Public Display
                          </span>
                        )}
                        {isDeclined && (
                          <span className="badge bg-ink-200 text-ink-400 text-xs">
                            Declined
                          </span>
                        )}
                        {rec.studentApprovalStatus === 'pending' && (
                          <span className="badge bg-amber-950 text-amber-300 border border-amber-800 text-xs">
                            Pending Your Approval
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-ink-400 italic">&quot;{rec.recommendation}&quot;</p>

                    {rec.strengths.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-ink-400 mr-1">Strengths:</span>
                        {rec.strengths.map((s) => (
                          <span key={s} className="badge bg-ink-200 text-ink-400 text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-200">
                      {!isAccepted ? (
                        <Button
                          size="sm"
                          onClick={() => handleRecommendationDecision(rec.id, 'accepted')}
                        >
                          Accept for Public Display
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRecommendationDecision(rec.id, 'declined')}
                        >
                          Withdraw Public Permission
                        </Button>
                      )}
                      {!isDeclined && !isAccepted && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRecommendationDecision(rec.id, 'declined')}
                        >
                          Decline
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Employer Inquiries / Contact Requests */}
        {contactRequests.length > 0 && (
          <div className="card p-6 space-y-4 border border-ink-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink">Employer Inquiries</h3>
                <p className="text-sm text-ink-400 mt-0.5">
                  Messages received from employers who discovered your talent profile.
                </p>
              </div>
              <span className="badge bg-brand-900 text-brand-200">
                {contactRequests.length} Received
              </span>
            </div>

            <div className="space-y-3">
              {contactRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-xl bg-ink-100 border border-ink-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-brand" /> {req.companyName}
                      </p>
                      <p className="text-xs text-ink-400">
                        From: {req.employerName} ({req.employerEmail}) • {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="badge bg-ink-200 text-ink-400 text-xs uppercase">{req.status}</span>
                  </div>
                  <p className="text-sm text-ink-400 bg-ink-50/50 p-2.5 rounded-lg border border-ink-200">
                    &quot;{req.message}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="card p-6 border border-red-800 bg-red-950/10 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            <p className="text-sm text-ink-400 mt-1">
              If you no longer wish to use SkillSphere, you can delete your account and associated
              personal information. This action cannot be undone.
            </p>
          </div>

          <Button
            className="!bg-red-600 hover:!bg-red-700 !text-white !border-0"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4" /> Delete Your Account
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <DeleteAccountDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        userName={user.name}
      />
    </DashboardLayout>
  );
}
