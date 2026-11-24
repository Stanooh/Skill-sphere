'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { uploadUserAvatar, removeUserAvatar, createAvatarPreview } from '@/services/avatarService';
import {
  getMyMentorProfile,
  saveMentorProfile,
  syncMentorProfileAvatar,
  getMentorVerifiedCompetencies,
  type VerifiedCompetency,
} from '@/services/mentorProfileService';
import { getMentorRatingSummary } from '@/services/mentorReviewService';
import { checkMentorAccess } from '@/services/mentorVerificationService';
import { MentorPublicCard } from '@/components/mentors/MentorPublicCard';
import type { User, MentorRatingSummary, MentorProfile as MentorProfileRecord } from '@/types';
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  ExternalLink,
  Calendar,
  XCircle,
} from 'lucide-react';

const LEARNER_LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];

export function MentorProfilePage() {
  const { user, refreshUser } = useAuth();
  if (!user) return null;

  return <MentorProfileContent key={user.id} user={user} refreshUser={refreshUser} />;
}

function MentorProfileContent({
  user,
  refreshUser,
}: {
  user: User;
  refreshUser: () => Promise<void>;
}) {
  const { show } = useToast();

  // Lifecycle & Access states
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Verified Competencies from Supabase
  const [verifiedCompetencies, setVerifiedCompetencies] = useState<VerifiedCompetency[]>([]);

  // Form fields
  // 1. Profile photo
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar ?? null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // 2. Professional title
  const [professionalTitle, setProfessionalTitle] = useState('');
  // 3. Biography
  const [bio, setBio] = useState('');
  // 4. Expertise (selected from verified competencies)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  // 5. Experience (number of years)
  const [experienceYears, setExperienceYears] = useState<number>(0);
  // 6. Learner level (multi-selection)
  const [learnerLevels, setLearnerLevels] = useState<string[]>([]);
  // 7. Availability status ('available' | 'unavailable')
  const [availability, setAvailability] = useState<'available' | 'unavailable'>('available');

  useEffect(() => {
    return () => {
      if (localPhotoPreview) URL.revokeObjectURL(localPhotoPreview);
    };
  }, [localPhotoPreview]);

  const effectiveAvatarUrl = localPhotoPreview || avatarUrl;

  // Publication state & ratings from Supabase
  const [isPublished, setIsPublished] = useState(false);
  const [savedProfile, setSavedProfile] = useState<MentorProfileRecord | null>(null);
  const [ratingSummary, setRatingSummary] = useState<MentorRatingSummary | null>(null);

  // Load existing profile, verified competencies, and rating summary from Supabase
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        // Enforce access rule: only mentors who passed competency verification and received admin approval
        const accessCheck = await checkMentorAccess();
        if (!active) return;

        if (!accessCheck.hasAccess) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const [profile, competencies, summary] = await Promise.all([
          getMyMentorProfile(user.id),
          getMentorVerifiedCompetencies(user.id),
          getMentorRatingSummary(user.id),
        ]);

        if (!active) return;

        setVerifiedCompetencies(competencies);
        if (summary) setRatingSummary(summary);

        if (profile) {
          setSavedProfile(profile);
          setProfessionalTitle(profile.professionalTitle || '');
          setBio(profile.bio || '');
          setExperienceYears(profile.experienceYears || 0);
          setLearnerLevels(profile.learnerLevels || []);
          setAvatarUrl((prev) => profile.avatarUrl ?? prev);

          const published = Boolean(profile.published || (profile.activated && profile.profileComplete));
          setIsPublished(published);
          setAvailability(
            published ? (profile.availability === 'unavailable' ? 'unavailable' : 'available') : 'available'
          );

          // If profile is already complete/published, start in view mode (unless they have no title/bio yet)
          if (published && profile.professionalTitle && profile.bio) {
            setIsEditing(false);
          } else {
            setIsEditing(true);
          }

          // Pre-select skills: either existing saved skill IDs or all verified competencies
          if (profile.skillIds && profile.skillIds.length > 0) {
            setSelectedSkillIds(profile.skillIds);
          } else if (competencies.length > 0) {
            setSelectedSkillIds(competencies.map((c) => c.skillId));
          }
        } else {
          // New mentor completing profile for the first time
          setIsEditing(true);
          setAvailability('available');
          if (competencies.length > 0) {
            setSelectedSkillIds(competencies.map((c) => c.skillId));
          }
        }
      } catch (err) {
        console.error('[MentorProfile] Error loading profile:', err);
        show('Failed to load mentor profile data. Please refresh.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [user.id, show]);

  // Derived selected skills for preview
  const previewSkills = useMemo(() => {
    return selectedSkillIds.map((id) => {
      const match = verifiedCompetencies.find((c) => c.skillId === id);
      return {
        id,
        name: match?.skillName || id.replace(/^skill-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    });
  }, [selectedSkillIds, verifiedCompetencies]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const toggleLearnerLevel = (level: string) => {
    setLearnerLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleSelectAllSkills = () => {
    if (selectedSkillIds.length === verifiedCompetencies.length) {
      setSelectedSkillIds([]);
    } else {
      setSelectedSkillIds(verifiedCompetencies.map((c) => c.skillId));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required field validation
    if (!professionalTitle.trim()) {
      show('Please provide a professional title.', 'error');
      return;
    }
    if (!bio.trim()) {
      show('Please provide a brief biography.', 'error');
      return;
    }
    if (selectedSkillIds.length === 0) {
      show('Please select at least one verified competency to display in your expertise.', 'error');
      return;
    }
    if (learnerLevels.length === 0) {
      show('Please select at least one learner level.', 'error');
      return;
    }
    if (experienceYears < 0) {
      show('Experience years cannot be negative.', 'error');
      return;
    }
    if (uploadingPhoto) {
      show('Please wait for your profile photo upload to finish before saving.', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await saveMentorProfile(user.id, {
        professionalTitle: professionalTitle.trim(),
        bio: bio.trim(),
        skillIds: selectedSkillIds,
        experienceYears: Number(experienceYears) || 0,
        learnerLevels,
        availability,
        acceptingLearners: availability === 'available',
        avatarUrl: avatarUrl ?? null,
        publish: true, // Mark published and complete
      });

      if (result.error || !result.profile) {
        show(result.error || 'Failed to save profile.', 'error');
        return;
      }

      setSavedProfile(result.profile);
      setAvatarUrl(result.profile.avatarUrl ?? null);
      setAvailability(result.profile.availability === 'unavailable' ? 'unavailable' : 'available');
      setIsPublished(true);
      setIsEditing(false);
      await refreshUser();
      show('Profile saved and published successfully!', 'success');
    } catch (err) {
      console.error('[MentorProfile] Error saving profile:', err);
      show('An unexpected error occurred while saving your profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-3 border-[#3770FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-ink-500">Loading mentor profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="card p-8 max-w-xl mx-auto my-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-ink">Access Restricted</h2>
          <p className="text-sm text-ink-500 leading-relaxed">
            This profile creation page is only available to mentors who have completed competency verification and received administrator approval.
          </p>
          <div className="pt-2">
            <Link href="/mentor/verification">
              <Button variant="primary">Check Application Status</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={isPublished && !isEditing ? 'Your Mentor Profile' : 'Complete Your Mentor Profile'}
        description="Your expertise has been verified! Now introduce yourself to learners by completing your professional profile."
      />

      {/* Published State: View Mode */}
      {isPublished && !isEditing ? (
        <div className="space-y-6">
          {/* Status banner */}
          <div className="card p-5 bg-emerald-950/30 border border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-emerald-300">Profile is Published & Live</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      availability === 'unavailable'
                        ? 'bg-red-950/70 text-red-300 border-red-800/70'
                        : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70'
                    }`}
                  >
                    {availability === 'unavailable' ? 'Unavailable' : 'Available'}
                  </span>
                </div>
                <p className="text-xs text-ink-400 mt-0.5">
                  {availability === 'unavailable'
                    ? 'Your profile remains published, but learners see that you are not accepting mentorship requests.'
                    : 'Your profile is actively discoverable by learners and accepting mentorship requests.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-ink-600" />
                Edit Profile
              </Button>
              <Link href={`/mentors/${user.id}`} target="_blank">
                <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-[#3770FF]">
                  <ExternalLink className="w-4 h-4" />
                  View Public Page
                </Button>
              </Link>
            </div>
          </div>

          {/* Automatic Public Profile Card */}
          <div className="flex justify-center pt-2 pb-8">
            <MentorPublicCard
              fullName={user.name}
              professionalHeadline={professionalTitle}
              biography={bio}
              avatarUrl={effectiveAvatarUrl}
              skills={previewSkills}
              experienceYears={experienceYears}
              learnerLevels={learnerLevels}
              availability={availability}
              rating={ratingSummary?.averageRating || 0}
              reviewCount={ratingSummary?.totalReviews || 0}
              isPreview={false}
            />
          </div>
        </div>
      ) : (
        /* Form & Live Preview Mode */
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form containing ONLY the 6 fields */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSaveProfile} className="card p-6 sm:p-8 space-y-6 bg-ink-800 border border-ink-200 shadow-sm rounded-2xl">
              <div>
                <h3 className="text-lg font-bold text-ink">Profile Information</h3>
                <p className="text-xs text-ink-400 mt-1">
                  Fill in your professional details below to generate your public mentor profile.
                </p>
              </div>

              {/* Read-only Full Name from Authenticated Account */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={user.name}
                  disabled
                  className="input bg-ink-50 text-ink-700 cursor-not-allowed opacity-90 font-medium"
                />
                <p className="text-xs text-ink-400">Retrieved automatically from your verified account.</p>
              </div>

              {/* Field 1: Profile Photo */}
              <div className="space-y-2 pt-2 border-t border-ink-200">
                <label className="block text-sm font-semibold text-ink">
                  1. Profile Photo
                </label>
                <p className="text-xs text-ink-400 mb-3">
                  Upload a clear, professional picture of yourself.
                </p>
                <ProfilePictureUpload
                  currentAvatarUrl={avatarUrl ?? undefined}
                  userName={user.name}
                  autoUpload={true}
                  onFileSelect={(file) => {
                    setLocalPhotoPreview(file ? createAvatarPreview(file) : null);
                  }}
                  onSave={async (file) => {
                    setUploadingPhoto(true);
                    try {
                      const res = await uploadUserAvatar(user.id, file);
                      if (res.success && res.avatarUrl) {
                        setAvatarUrl(res.avatarUrl);
                        setLocalPhotoPreview(null);
                        await syncMentorProfileAvatar(user.id, res.avatarUrl);
                        await refreshUser();
                        show('Profile photo uploaded!', 'success');
                      } else if (res.error) {
                        setLocalPhotoPreview(null);
                        show(res.error, 'error');
                      }
                      return res;
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }}
                  onRemove={async () => {
                    setUploadingPhoto(true);
                    try {
                      const res = await removeUserAvatar(user.id);
                      if (res.success) {
                        setAvatarUrl(null);
                        setLocalPhotoPreview(null);
                        await syncMentorProfileAvatar(user.id, null);
                        await refreshUser();
                        show('Profile photo removed.', 'info');
                      } else if (res.error) {
                        show(res.error, 'error');
                      }
                      return res;
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }}
                />
              </div>

              {/* Field 2: Professional Title */}
              <div className="space-y-1 pt-2 border-t border-ink-200">
                <Input
                  label="2. Professional Title *"
                  placeholder="e.g. Full-Stack Developer & Mentor"
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value)}
                  required
                />
                <p className="text-xs text-ink-400">Example: Full-Stack Developer & Mentor</p>
              </div>

              {/* Field 3: Biography */}
              <div className="space-y-1 pt-2 border-t border-ink-200">
                <Textarea
                  label="3. Biography *"
                  rows={4}
                  placeholder="A short description of yourself and what you teach..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  required
                />
                <p className="text-xs text-ink-400">
                  A concise description of your background and mentoring approach.
                </p>
              </div>

              {/* Field 4: Expertise (Competency-Approved Skills from Supabase) */}
              <div className="space-y-3 pt-2 border-t border-ink-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-ink">
                      4. Expertise (Approved Skills) *
                    </label>
                    <p className="text-xs text-ink-400 mt-0.5">
                      Select which verified competencies to display on your public profile.
                    </p>
                  </div>
                  {verifiedCompetencies.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllSkills}
                      className="text-xs font-semibold text-[#3770FF] hover:underline"
                    >
                      {selectedSkillIds.length === verifiedCompetencies.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {verifiedCompetencies.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-700/50 text-xs text-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>No verified competencies found. Only skills approved by administrators can be displayed.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {verifiedCompetencies.map((comp) => {
                      const isSelected = selectedSkillIds.includes(comp.skillId);
                      return (
                        <button
                          key={comp.skillId}
                          type="button"
                          onClick={() => toggleSkill(comp.skillId)}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#EBF2FF] border-[#3770FF] text-[#3770FF] shadow-xs'
                              : 'bg-ink-100/60 border-ink-200 text-ink-400 hover:border-brand-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              isSelected ? 'bg-[#3770FF] border-[#3770FF] text-white' : 'border-ink-300 bg-ink-50'
                            }`}
                          >
                            {isSelected && <span className="text-[10px] font-bold">✓</span>}
                          </div>
                          <span className="truncate">{comp.skillName}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Field 5: Experience */}
              <div className="space-y-1 pt-2 border-t border-ink-200">
                <Input
                  label="5. Experience (Years) *"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="e.g. 4"
                  value={experienceYears === 0 ? '' : experienceYears.toString()}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setExperienceYears(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  required
                />
                <p className="text-xs text-ink-400">Total number of years of professional industry experience.</p>
              </div>

              {/* Field 6: Learner Level */}
              <div className="space-y-2 pt-2 border-t border-ink-200">
                <label className="block text-sm font-semibold text-ink">
                  6. Learner Level *
                </label>
                <p className="text-xs text-ink-400">
                  Select which learner levels you are comfortable mentoring (select all that apply):
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {LEARNER_LEVEL_OPTIONS.map((level) => {
                    const isSelected = learnerLevels.includes(level);
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => toggleLearnerLevel(level)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#3770FF] text-white border-[#3770FF] shadow-sm'
                            : 'bg-ink-100/60 text-ink-400 border-ink-200 hover:border-brand-300'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 7: Availability Status */}
              <div className="space-y-2 pt-2 border-t border-ink-200">
                <label className="block text-sm font-semibold text-ink">
                  7. Availability *
                </label>
                <p className="text-xs text-ink-400">
                  Control whether learners see you as accepting new mentorship requests.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setAvailability('available')}
                    aria-pressed={availability === 'available'}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      availability === 'available'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-sm'
                        : 'bg-ink-100/60 border-ink-200 text-ink-400 hover:border-brand-300'
                    }`}
                  >
                    <Calendar
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        availability === 'available' ? 'text-emerald-400' : 'text-ink-300'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold">Available</p>
                      <p className="text-xs opacity-80 mt-0.5">Accepting mentorship requests</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvailability('unavailable')}
                    aria-pressed={availability === 'unavailable'}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      availability === 'unavailable'
                        ? 'bg-red-950/60 border-red-500 text-red-200 shadow-sm'
                        : 'bg-ink-100/60 border-ink-200 text-ink-400 hover:border-brand-300'
                    }`}
                  >
                    <XCircle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        availability === 'unavailable' ? 'text-red-400' : 'text-ink-300'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold">Unavailable</p>
                      <p className="text-xs opacity-80 mt-0.5">Not accepting new requests</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-6 border-t border-ink-200 flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={saving || uploadingPhoto}
                  className="flex-1 sm:flex-none sm:min-w-[180px] bg-[#3770FF] hover:bg-[#2c5ad4] text-white"
                >
                  {saving ? 'Saving Profile...' : uploadingPhoto ? 'Uploading Photo...' : 'Save Profile'}
                </Button>

                {isPublished && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      if (savedProfile) {
                        setProfessionalTitle(savedProfile.professionalTitle || '');
                        setBio(savedProfile.bio || '');
                        setExperienceYears(savedProfile.experienceYears || 0);
                        setLearnerLevels(savedProfile.learnerLevels || []);
                        setSelectedSkillIds(savedProfile.skillIds || []);
                        setAvailability(savedProfile.availability === 'unavailable' ? 'unavailable' : 'available');
                      }
                      setIsEditing(false);
                    }}
                    disabled={saving || uploadingPhoto}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Right Column: Live Generated Public Profile Preview */}
          <div className="lg:col-span-5 sticky top-6 space-y-3">
            <div className="flex items-center gap-2 text-ink-400 font-semibold text-xs uppercase tracking-wider">
              <Eye className="w-4 h-4 text-[#3770FF]" />
              <span>Live Public Profile Preview</span>
            </div>

            <MentorPublicCard
              fullName={user.name}
              professionalHeadline={professionalTitle}
              biography={bio}
              avatarUrl={effectiveAvatarUrl}
              skills={previewSkills}
              experienceYears={experienceYears}
              learnerLevels={learnerLevels}
              availability={availability}
              rating={ratingSummary?.averageRating || 0}
              reviewCount={ratingSummary?.totalReviews || 0}
              isPreview={false}
            />

            <p className="text-xs text-ink-400 text-center px-4">
              Your profile will be generated automatically and published to the learner directory once you click <strong>Save Profile</strong>.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
