'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { uploadUserAvatar, removeUserAvatar } from '@/services/avatarService';
import {
  getMyMentorProfile,
  saveMentorProfile,
  getMentorVerifiedCompetencies,
  type VerifiedCompetency,
} from '@/services/mentorProfileService';
import { MentorPublicCard } from '@/components/mentors/MentorPublicCard';
import type {
  User,
  WorkExperienceEntry,
  EducationEntry,
} from '@/types';
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  Save,
  Globe,
  Linkedin,
  Github,
  Link as LinkIcon,
  Briefcase,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

type ProfileTabKey = 'info' | 'experience' | 'skills' | 'mentorship' | 'availability' | 'links';

const LEARNER_LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const FORMAT_OPTIONS = ['One-on-one', 'Group sessions', 'Workshops'];
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOT_OPTIONS = [
  'Morning (9am – 12pm)',
  'Afternoon (12pm – 5pm)',
  'Evening (5pm – 9pm)',
  'Flexible / On-demand',
];

export function MentorProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return <MentorProfileContent key={user.id} user={user} logout={logout} />;
}

function MentorProfileContent({ user }: { user: User; logout: () => Promise<void> }) {
  const { show } = useToast();

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('info');

  // Verified Competencies from Supabase
  const [verifiedCompetencies, setVerifiedCompetencies] = useState<VerifiedCompetency[]>([]);

  // Section A: Profile Information
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar ?? null);
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');

  // Section B: Professional Experience
  const [company, setCompany] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([]);
  const [educationHistory, setEducationHistory] = useState<EducationEntry[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certInput, setCertInput] = useState('');

  // Section C: Skills & Expertise (Selected from verified competencies)
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Section D: Mentorship Information
  const [mentorshipAreas, setMentorshipAreas] = useState<string[]>([]);
  const [areaInput, setAreaInput] = useState('');
  const [learnerLevels, setLearnerLevels] = useState<string[]>([]);
  const [mentorshipApproach, setMentorshipApproach] = useState('');
  const [preferredFormats, setPreferredFormats] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [languageInput, setLanguageInput] = useState('');

  // Section E: Availability
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [preferredTimeSlots, setPreferredTimeSlots] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('');
  const [acceptingLearners, setAcceptingLearners] = useState(true);

  // Section F: Professional Links
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Profile publication state
  const [isPublished, setIsPublished] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Load existing profile & verified competencies from Supabase
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [profile, competencies] = await Promise.all([
          getMyMentorProfile(user.id),
          getMentorVerifiedCompetencies(user.id),
        ]);

        if (!active) return;

        setVerifiedCompetencies(competencies);

        if (profile) {
          setProfessionalTitle(profile.professionalTitle || '');
          setLocation(profile.location || '');
          setBio(profile.bio || '');
          setCompany(profile.company || '');
          setExperienceYears(profile.experienceYears || 0);
          setWorkExperience(profile.workExperience || []);
          setEducationHistory(profile.educationHistory || []);
          setCertifications(profile.certifications || []);
          setMentorshipAreas(profile.mentorshipAreas || []);
          setLearnerLevels(profile.learnerLevels || []);
          setMentorshipApproach(profile.mentorshipApproach || '');
          setPreferredFormats(profile.preferredFormats || []);
          if (profile.languages && profile.languages.length > 0) {
            setLanguages(profile.languages);
          }
          setAvailableDays(profile.availableDays || []);
          setPreferredTimeSlots(profile.preferredTimeSlots || []);
          setTimezone(profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '');
          setAcceptingLearners(profile.acceptingLearners !== false && profile.availability !== 'unavailable');
          setLinkedinUrl(profile.linkedinUrl || '');
          setGithubUrl(profile.githubUrl || '');
          setPortfolioUrl(profile.portfolioUrl || '');
          setWebsiteUrl(profile.websiteUrl || '');
          setIsPublished(profile.published || (profile.activated && profile.profileComplete));
          setRating(profile.rating || 0);
          setReviewCount(profile.reviewCount || 0);
          if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);

          // If mentor already has selected skills, use them; otherwise pre-select all verified competencies
          if (profile.skillIds && profile.skillIds.length > 0) {
            setSelectedSkillIds(profile.skillIds);
          } else if (competencies.length > 0) {
            setSelectedSkillIds(competencies.map((c) => c.skillId));
          }
        } else if (competencies.length > 0) {
          // Pre-select verified skills for new profile
          setSelectedSkillIds(competencies.map((c) => c.skillId));
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
        }
      } catch (err) {
        console.error('Error loading mentor profile:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [user.id]);

  // Derived selected skills formatted for preview and card
  const selectedSkillsObjects = useMemo(() => {
    return selectedSkillIds.map((id) => {
      const verified = verifiedCompetencies.find((c) => c.skillId === id);
      return { id, name: verified?.skillName || id };
    });
  }, [selectedSkillIds, verifiedCompetencies]);

  // Calculate actual completion percentage
  const completionStats = useMemo(() => {
    const checks = [
      { name: 'Profile Photo', done: Boolean(avatarUrl || user.avatar), weight: 10 },
      { name: 'Professional Headline', done: professionalTitle.trim().length > 0, weight: 15 },
      { name: 'Location', done: location.trim().length > 0, weight: 10 },
      { name: 'Biography', done: bio.trim().length >= 30, weight: 15 },
      { name: 'Experience Years', done: experienceYears > 0, weight: 10 },
      { name: 'Verified Skills Selected', done: selectedSkillIds.length > 0, weight: 15 },
      { name: 'Learner Levels', done: learnerLevels.length > 0, weight: 10 },
      { name: 'Mentorship Approach', done: mentorshipApproach.trim().length >= 20, weight: 10 },
      { name: 'Available Days', done: availableDays.length > 0, weight: 5 },
    ];

    const completedWeight = checks.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
    const missing = checks.filter((c) => !c.done).map((c) => c.name);

    return { percentage: completedWeight, missing };
  }, [
    avatarUrl,
    user.avatar,
    professionalTitle,
    location,
    bio,
    experienceYears,
    selectedSkillIds,
    learnerLevels,
    mentorshipApproach,
    availableDays,
  ]);

  // Work experience entries helper
  const addWorkExperience = () => {
    setWorkExperience([
      ...workExperience,
      { id: Date.now().toString(), title: '', company: '', duration: '', description: '' },
    ]);
  };

  const updateWorkExperience = (index: number, field: keyof WorkExperienceEntry, value: string) => {
    const updated = [...workExperience];
    updated[index] = { ...updated[index], [field]: value };
    setWorkExperience(updated);
  };

  const removeWorkExperience = (index: number) => {
    setWorkExperience(workExperience.filter((_, i) => i !== index));
  };

  // Education entries helper
  const addEducation = () => {
    setEducationHistory([
      ...educationHistory,
      { id: Date.now().toString(), degree: '', institution: '', year: '' },
    ]);
  };

  const updateEducation = (index: number, field: keyof EducationEntry, value: string) => {
    const updated = [...educationHistory];
    updated[index] = { ...updated[index], [field]: value };
    setEducationHistory(updated);
  };

  const removeEducation = (index: number) => {
    setEducationHistory(educationHistory.filter((_, i) => i !== index));
  };

  // Skill selection toggle
  const toggleSkill = (skillId: string) => {
    if (selectedSkillIds.includes(skillId)) {
      setSelectedSkillIds(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      setSelectedSkillIds([...selectedSkillIds, skillId]);
    }
  };

  // Toggle multi-select array values
  const toggleArrayItem = (list: string[], setList: (vals: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Handle Save Draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const res = await saveMentorProfile(user.id, {
        professionalTitle,
        bio,
        location,
        experienceYears,
        company,
        workExperience,
        educationHistory,
        certifications,
        mentorshipAreas,
        skillIds: selectedSkillIds,
        learnerLevels,
        mentorshipApproach,
        preferredFormats,
        languages,
        availableDays,
        preferredTimeSlots,
        timezone,
        acceptingLearners,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        websiteUrl,
        avatarUrl: avatarUrl ?? undefined,
        publish: false,
      });

      if (res.error || !res.profile) {
        show(res.error || 'Failed to save draft.', 'error');
      } else {
        show('Draft saved to Supabase. You can return anytime to finish and publish.', 'success');
      }
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to save draft', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  // Handle Publish Profile
  const handlePublish = async () => {
    if (completionStats.percentage < 60 || selectedSkillIds.length === 0 || !professionalTitle.trim() || !bio.trim()) {
      show(`Please complete the required fields before publishing: ${completionStats.missing.slice(0, 3).join(', ')}`, 'error');
      return;
    }

    setPublishing(true);
    try {
      const res = await saveMentorProfile(user.id, {
        professionalTitle,
        bio,
        location,
        experienceYears,
        company,
        workExperience,
        educationHistory,
        certifications,
        mentorshipAreas,
        skillIds: selectedSkillIds,
        learnerLevels,
        mentorshipApproach,
        preferredFormats,
        languages,
        availableDays,
        preferredTimeSlots,
        timezone,
        acceptingLearners,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        websiteUrl,
        avatarUrl: avatarUrl ?? undefined,
        publish: true,
      });

      if (res.error || !res.profile) {
        show(res.error || 'Failed to publish profile.', 'error');
      } else {
        setIsPublished(true);
        show('🎉 Your mentor profile is now published and visible to learners!', 'success');
      }
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to publish profile', 'error');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-ink-400">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading your mentor profile…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Complete Your Mentor Profile"
        description="Your expertise has been verified! Now introduce yourself to learners by completing your professional profile."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-brand-600" />
              <span>Preview Profile</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing}
              className="flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{savingDraft ? 'Saving…' : 'Save Draft'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePublish}
              disabled={publishing || savingDraft}
              className="flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{publishing ? 'Publishing…' : isPublished ? 'Save & Republish' : 'Publish Profile'}</span>
            </Button>
          </div>
        }
      />

      {/* Published Status Banner */}
      {isPublished && (
        <div className="card p-4 mb-6 border-l-4 border-emerald-500 bg-emerald-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">Your profile is published and live!</p>
              <p className="text-xs text-emerald-700">Learners can discover your profile, book mentorship sessions, and connect with you.</p>
            </div>
          </div>
          <Link
            href={`/mentors/${user.id}`}
            target="_blank"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1 shrink-0"
          >
            <span>View Public Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Progress & Completion Meter */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <span className="text-sm font-semibold text-ink">Profile Strength</span>
            <span className="text-xs text-ink-400 ml-2">
              {completionStats.percentage === 100 ? 'All sections complete' : `${completionStats.percentage}% completed`}
            </span>
          </div>
          {completionStats.missing.length > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Next: {completionStats.missing[0]}
            </span>
          )}
        </div>
        <div className="w-full h-2.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              completionStats.percentage >= 80
                ? 'bg-emerald-500'
                : completionStats.percentage >= 50
                ? 'bg-brand-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${Math.max(5, completionStats.percentage)}%` }}
          />
        </div>
      </div>

      {/* Form Navigation Tabs */}
      <div className="flex border-b border-ink-100 mb-6 overflow-x-auto scrollbar-none gap-2">
        {[
          { key: 'info', label: 'A. Basic Info' },
          { key: 'experience', label: 'B. Experience' },
          { key: 'skills', label: 'C. Verified Skills' },
          { key: 'mentorship', label: 'D. Mentorship' },
          { key: 'availability', label: 'E. Availability' },
          { key: 'links', label: 'F. Social Links' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as ProfileTabKey)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600 font-semibold'
                : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-6">

          {/* SECTION A: PROFILE INFORMATION */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-4">
                <div className="border-b border-ink-100 pb-3">
                  <h3 className="text-lg font-bold text-ink">Section A: Profile Information</h3>
                  <p className="text-xs text-ink-400">Introduce your identity and background to prospective learners.</p>
                </div>

                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">
                    Profile Photograph <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-ink-400 mb-3">Upload a friendly, professional photo. (Square JPG, PNG, or WebP up to 5MB)</p>
                  <div className="p-4 bg-ink-50 rounded-xl border border-ink-100">
                    <ProfilePictureUpload
                      currentAvatarUrl={avatarUrl ?? user.avatar}
                      userName={user.name}
                      showSaveButton={true}
                      onSave={async (file) => {
                        const res = await uploadUserAvatar(user.id, file);
                        if (res.success && res.avatarUrl) {
                          setAvatarUrl(res.avatarUrl);
                          show('Profile photograph updated successfully.', 'success');
                        }
                        return res;
                      }}
                      onRemove={async () => {
                        const res = await removeUserAvatar(user.id);
                        if (res.success) {
                          setAvatarUrl(null);
                          show('Profile photograph removed.', 'info');
                        }
                        return res;
                      }}
                    />
                  </div>
                </div>

                {/* Full Name (Read-only from account) */}
                <div>
                  <Input
                    label="Full name"
                    value={user.name}
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-ink-400 mt-1">Full name is populated from your verified SkillSphere account profile.</p>
                </div>

                {/* Professional Headline */}
                <div>
                  <Input
                    label="Professional headline"
                    required
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    placeholder="e.g. Full-Stack Developer & Mentor, Senior Machine Learning Engineer"
                  />
                  <p className="text-xs text-ink-400 mt-1">A punchy title summarizing your primary engineering role.</p>
                </div>

                {/* Location */}
                <div>
                  <Input
                    label="Location (City and Country)"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Nairobi, Kenya or London, United Kingdom"
                  />
                </div>

                {/* Professional Biography */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-ink">
                      Professional biography <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-xs ${bio.length < 30 ? 'text-amber-500' : 'text-ink-400'}`}>
                      {bio.length} characters (min 30)
                    </span>
                  </div>
                  <Textarea
                    rows={5}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. I help aspiring developers build practical web development skills through hands-on projects, code reviews, and structured learning..."
                  />
                  <p className="text-xs text-ink-400 mt-1">
                    Explain who you are, your passion for mentorship, and how you guide students to success.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('experience')}
                    className="flex items-center gap-1.5"
                  >
                    <span>Save & Continue to Experience</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: PROFESSIONAL EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-5">
                <div className="border-b border-ink-100 pb-3">
                  <h3 className="text-lg font-bold text-ink">Section B: Professional Experience</h3>
                  <p className="text-xs text-ink-400">Highlight your career background, education, and credentials.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Organization or Company (Optional)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google, Safaricom, Freelance"
                  />
                  <Input
                    label="Years of professional experience"
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                </div>

                {/* Previous Work Experience Entries */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-ink-500" /> Work Experience (Optional)
                      </h4>
                      <p className="text-xs text-ink-400">Add key positions you have held.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={addWorkExperience} className="flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Experience
                    </Button>
                  </div>

                  {workExperience.length === 0 ? (
                    <div className="p-4 bg-ink-50 rounded-xl border border-dashed border-ink-200 text-center text-xs text-ink-400">
                      No previous roles added yet. Click &quot;Add Experience&quot; to list your career background.
                    </div>
                  ) : (
                    workExperience.map((work, idx) => (
                      <div key={work.id || idx} className="p-4 bg-ink-50 rounded-xl border border-ink-100 space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-ink-500">Role #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeWorkExperience(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <Input
                            label="Job title"
                            placeholder="e.g. Frontend Engineer"
                            value={work.title}
                            onChange={(e) => updateWorkExperience(idx, 'title', e.target.value)}
                          />
                          <Input
                            label="Company"
                            placeholder="e.g. TechCorp"
                            value={work.company}
                            onChange={(e) => updateWorkExperience(idx, 'company', e.target.value)}
                          />
                          <Input
                            label="Duration"
                            placeholder="e.g. 2021 – 2024"
                            value={work.duration || ''}
                            onChange={(e) => updateWorkExperience(idx, 'duration', e.target.value)}
                          />
                        </div>
                        <Textarea
                          label="Description (Optional)"
                          rows={2}
                          placeholder="Brief summary of projects, architecture, and tech stack utilized..."
                          value={work.description || ''}
                          onChange={(e) => updateWorkExperience(idx, 'description', e.target.value)}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Educational Background Entries */}
                <div className="space-y-3 pt-4 border-t border-ink-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-ink-500" /> Educational Background (Optional)
                      </h4>
                      <p className="text-xs text-ink-400">Degrees, diplomas, and academic credentials.</p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={addEducation} className="flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Education
                    </Button>
                  </div>

                  {educationHistory.length === 0 ? (
                    <div className="p-4 bg-ink-50 rounded-xl border border-dashed border-ink-200 text-center text-xs text-ink-400">
                      No education entries added yet.
                    </div>
                  ) : (
                    educationHistory.map((edu, idx) => (
                      <div key={edu.id || idx} className="p-4 bg-ink-50 rounded-xl border border-ink-100 space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-ink-500">Degree #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeEducation(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove degree"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <Input
                            label="Degree / Major"
                            placeholder="e.g. BSc Computer Science"
                            value={edu.degree}
                            onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                          />
                          <Input
                            label="Institution"
                            placeholder="e.g. Strathmore University"
                            value={edu.institution}
                            onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                          />
                          <Input
                            label="Graduation Year"
                            placeholder="e.g. 2022"
                            value={edu.year || ''}
                            onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Certifications */}
                <div className="space-y-3 pt-4 border-t border-ink-100">
                  <h4 className="text-sm font-semibold text-ink">Certifications (Optional)</h4>
                  <div className="flex gap-2">
                    <Input
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      placeholder="e.g. AWS Certified Developer, Meta React Specialization"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (certInput.trim()) {
                            setCertifications([...certifications, certInput.trim()]);
                            setCertInput('');
                          }
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (certInput.trim()) {
                          setCertifications([...certifications, certInput.trim()]);
                          setCertInput('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {certifications.map((cert, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-ink-100 text-ink-800 rounded-lg text-xs font-medium"
                      >
                        {cert}
                        <button
                          type="button"
                          onClick={() => setCertifications(certifications.filter((_, idx) => idx !== i))}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('info')}>
                    Back
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('skills')} className="flex items-center gap-1.5">
                    <span>Save & Continue to Skills</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION C: SKILLS AND EXPERTISE */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-4">
                <div className="border-b border-ink-100 pb-3">
                  <h3 className="text-lg font-bold text-ink">Section C: Verified Skills & Expertise</h3>
                  <p className="text-xs text-ink-400">
                    These are competencies that passed SkillSphere verification during your application. Select which ones to highlight on your public profile.
                  </p>
                </div>

                {verifiedCompetencies.length === 0 ? (
                  <div className="p-6 bg-amber-50/60 rounded-xl border border-amber-200 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                    <p className="text-sm font-semibold text-amber-900">No verified competencies found</p>
                    <p className="text-xs text-amber-700 max-w-md mx-auto">
                      Competencies are automatically linked once verified by administrators. If you recently passed verification, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-ink">
                        Verified Competencies ({verifiedCompetencies.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSkillIds(verifiedCompetencies.map((c) => c.skillId))}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        Select all
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {verifiedCompetencies.map((comp) => {
                        const isSelected = selectedSkillIds.includes(comp.skillId);
                        return (
                          <div
                            key={comp.skillId}
                            onClick={() => toggleSkill(comp.skillId)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                                : 'bg-ink-50/40 border-ink-200 hover:border-ink-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent onClick
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                              />
                              <div>
                                <p className="text-sm font-semibold text-ink">{comp.skillName}</p>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" /> Verified Competency
                                </span>
                              </div>
                            </div>
                            <Badge variant={isSelected ? 'brand' : 'gray'}>
                              {isSelected ? 'Highlighted' : 'Hidden'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-ink-400 mt-3">
                      At least one verified skill must be highlighted on your public profile.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('experience')}>
                    Back
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('mentorship')} className="flex items-center gap-1.5">
                    <span>Save & Continue to Mentorship</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION D: MENTORSHIP INFORMATION */}
          {activeTab === 'mentorship' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-5">
                <div className="border-b border-ink-100 pb-3">
                  <h3 className="text-lg font-bold text-ink">Section D: Mentorship Details</h3>
                  <p className="text-xs text-ink-400">Tell learners about your teaching style, target levels, and focus areas.</p>
                </div>

                {/* Mentorship Areas */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Mentorship Areas</label>
                  <p className="text-xs text-ink-400 mb-2">Key domains where you provide hands-on guidance.</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={areaInput}
                      onChange={(e) => setAreaInput(e.target.value)}
                      placeholder="e.g. Web Development, System Design, Career Transition"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (areaInput.trim()) {
                            setMentorshipAreas([...mentorshipAreas, areaInput.trim()]);
                            setAreaInput('');
                          }
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (areaInput.trim()) {
                          setMentorshipAreas([...mentorshipAreas, areaInput.trim()]);
                          setAreaInput('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mentorshipAreas.map((area, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-ink-100 text-ink-800 rounded-lg text-xs font-medium"
                      >
                        {area}
                        <button
                          type="button"
                          onClick={() => setMentorshipAreas(mentorshipAreas.filter((_, idx) => idx !== i))}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Learner Levels Supported */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">
                    Learner Levels Supported <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-ink-400 mb-3">Which student experience stages are best suited for your mentorship?</p>
                  <div className="grid grid-cols-3 gap-3">
                    {LEARNER_LEVEL_OPTIONS.map((level) => {
                      const isSelected = learnerLevels.includes(level);
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => toggleArrayItem(learnerLevels, setLearnerLevels, level)}
                          className={`p-3 rounded-xl border text-center text-sm font-semibold transition-all ${
                            isSelected
                              ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-xs'
                              : 'bg-ink-50/50 border-ink-200 text-ink-600 hover:border-ink-300'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mentorship Approach */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-ink">
                      Mentorship Approach <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-ink-400">{mentorshipApproach.length} characters</span>
                  </div>
                  <Textarea
                    rows={4}
                    value={mentorshipApproach}
                    onChange={(e) => setMentorshipApproach(e.target.value)}
                    placeholder="e.g. My mentorship approach centers on project-based learning and asynchronous code reviews. In our sessions, we walk through real challenges, debug live issues, and establish milestones..."
                  />
                  <p className="text-xs text-ink-400 mt-1">
                    Describe your pedagogical approach, session structure, and feedback cadence.
                  </p>
                </div>

                {/* Preferred Mentorship Formats */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1">Preferred Mentorship Formats</label>
                  <div className="grid sm:grid-cols-3 gap-3 mt-2">
                    {FORMAT_OPTIONS.map((fmt) => {
                      const isSelected = preferredFormats.includes(fmt);
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => toggleArrayItem(preferredFormats, setPreferredFormats, fmt)}
                          className={`p-3 rounded-xl border text-center text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-brand-50 border-brand-500 text-brand-700'
                              : 'bg-ink-50/50 border-ink-200 text-ink-600 hover:border-ink-300'
                          }`}
                        >
                          {fmt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Languages Spoken */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Languages Spoken</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={languageInput}
                      onChange={(e) => setLanguageInput(e.target.value)}
                      placeholder="e.g. English, Swahili, French"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (languageInput.trim()) {
                            setLanguages([...languages, languageInput.trim()]);
                            setLanguageInput('');
                          }
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (languageInput.trim()) {
                          setLanguages([...languages, languageInput.trim()]);
                          setLanguageInput('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-ink-100 text-ink-800 rounded-lg text-xs font-medium"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => setLanguages(languages.filter((_, idx) => idx !== i))}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('skills')}>
                    Back
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('availability')} className="flex items-center gap-1.5">
                    <span>Save & Continue to Availability</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION E: AVAILABILITY */}
          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-5">
                <div className="border-b border-ink-100 pb-3">
                  <h3 className="text-lg font-bold text-ink">Section E: Schedule & Availability</h3>
                  <p className="text-xs text-ink-400">Specify when you are generally reachable for mentorship sessions.</p>
                </div>

                {/* Accepting Learners Switch */}
                <div className="p-4 bg-ink-50 rounded-xl border border-ink-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">Currently Accepting Learners</p>
                    <p className="text-xs text-ink-400">When enabled, students can request mentorship sessions.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptingLearners}
                      onChange={(e) => setAcceptingLearners(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-ink-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-ink-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Available Days */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Available Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((day) => {
                      const isSelected = availableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleArrayItem(availableDays, setAvailableDays, day)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white text-ink-600 border-ink-200 hover:border-ink-300'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred Time Slots */}
                <div>
                  <label className="block text-sm font-semibold text-ink mb-1.5">Preferred Time Slots</label>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {TIME_SLOT_OPTIONS.map((slot) => {
                      const isSelected = preferredTimeSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleArrayItem(preferredTimeSlots, setPreferredTimeSlots, slot)}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-brand-50 border-brand-500 text-brand-700'
                              : 'bg-white border-ink-200 text-ink-600 hover:border-ink-300'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Zone */}
                <div>
                  <Input
                    label="Time Zone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. Africa/Nairobi (UTC+3) or America/New_York (UTC-5)"
                  />
                </div>

                <div className="pt-2 flex justify-between">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('mentorship')}>
                    Back
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('links')} className="flex items-center gap-1.5">
                    <span>Save & Continue to Links</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION F: PROFESSIONAL LINKS */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              <div className="card p-6 space-y-4">
                <div className="border-b border-ink-100 pb-3">
                  <h3 className="text-lg font-bold text-ink">Section F: Professional Links (Optional)</h3>
                  <p className="text-xs text-ink-400">Share your external profiles to help learners learn more about your work.</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Linkedin className="w-4 h-4 text-blue-600 absolute left-3 top-9" />
                    <Input
                      label="LinkedIn profile URL"
                      className="pl-9"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <Github className="w-4 h-4 text-ink-700 absolute left-3 top-9" />
                    <Input
                      label="GitHub profile URL"
                      className="pl-9"
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <Globe className="w-4 h-4 text-emerald-600 absolute left-3 top-9" />
                    <Input
                      label="Personal portfolio URL"
                      className="pl-9"
                      placeholder="https://myportfolio.dev"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-purple-600 absolute left-3 top-9" />
                    <Input
                      label="Personal website / blog"
                      className="pl-9"
                      placeholder="https://myblog.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" size="sm" onClick={() => setActiveTab('availability')}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{publishing ? 'Publishing…' : 'Publish My Profile'}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Live Profile Preview Card */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">Live Public Card</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Full preview
              </button>
            </div>

            {/* Exact Reference Public Card Preview */}
            <MentorPublicCard
              fullName={user.name}
              professionalHeadline={professionalTitle}
              biography={bio}
              avatarUrl={avatarUrl ?? user.avatar}
              skills={selectedSkillsObjects}
              experienceYears={experienceYears}
              learnerLevels={learnerLevels}
              rating={rating}
              reviewCount={reviewCount}
              isPreview={true}
            />

            {/* Actions Panel */}
            <div className="card p-5 space-y-3 bg-ink-50/50">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center justify-center gap-2 font-bold"
              >
                <Sparkles className="w-5 h-5" />
                <span>{publishing ? 'Publishing…' : isPublished ? 'Save & Republish' : 'Publish Profile'}</span>
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={handleSaveDraft}
                disabled={savingDraft || publishing}
                className="flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingDraft ? 'Saving Draft…' : 'Save Draft'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Public Profile Preview">
        <div className="space-y-4 p-2">
          <p className="text-xs text-ink-400 mb-2">
            This is exactly how prospective students and employers will view your verified mentor card across SkillSphere.
          </p>
          <MentorPublicCard
            fullName={user.name}
            professionalHeadline={professionalTitle}
            biography={bio}
            avatarUrl={avatarUrl ?? user.avatar}
            skills={selectedSkillsObjects}
            experienceYears={experienceYears}
            learnerLevels={learnerLevels}
            rating={rating}
            reviewCount={reviewCount}
            isPreview={true}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPreviewOpen(false);
                void handlePublish();
              }}
              disabled={publishing}
            >
              Publish Now
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
