'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SkillSelector } from '@/components/profile/SkillSelector';
import { getSkills } from '@/services/dataService';
import { getMyMentorProfile, saveMentorProfile } from '@/services/mentorProfileService';
import { uploadUserAvatar, removeUserAvatar } from '@/services/avatarService';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { deleteMentorAccount } from '@/services/accountService';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { useRouter } from 'next/navigation';
import type { Availability, SkillLevel, User } from '@/types';
import { Check, Trash2 } from 'lucide-react';

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'unavailable', label: 'Unavailable' },
];

export function MentorProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return <MentorProfileContent key={user.id} user={user} logout={logout} />;
}

function MentorProfileContent({ user, logout }: { user: User; logout: () => Promise<void> }) {
  const { show } = useToast();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [certInput, setCertInput] = useState('');
  const [areaInput, setAreaInput] = useState('');

  const skills = getSkills();
  const [loading, setLoading] = useState(true);

  const [professionalTitle, setProfessionalTitle] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>('unavailable');
  const [mentorshipAreas, setMentorshipAreas] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>({});

  useEffect(() => {
    let active = true;
    void getMyMentorProfile(user.id).then((nextProfile) => {
      if (!active) return;
      if (nextProfile) {
        setProfessionalTitle(nextProfile.professionalTitle);
        setBio(nextProfile.bio);
        setLocation(nextProfile.location);
        setExperienceYears(nextProfile.experienceYears);
        setEducation(nextProfile.education);
        setCertifications(nextProfile.certifications);
        setAvailability(nextProfile.availability);
        setMentorshipAreas(nextProfile.mentorshipAreas);
        setSkillIds(nextProfile.skillIds);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  const handleSave = async () => {
    const nextProfile = await saveMentorProfile(user.id, {
      professionalTitle,
      bio,
      location,
      experienceYears,
      education,
      certifications,
      availability,
      mentorshipAreas,
      skillIds,
    });
    if (!nextProfile) {
      show('Could not save your profile. Please try again.', 'error');
      return;
    }
    setSaved(true);
    if (nextProfile.profileComplete) {
      show('Profile updated successfully. Your profile is now visible to learners.', 'success');
    } else {
      show('Profile saved. Add a title, bio, at least one skill, and set availability to appear in search.', 'info');
    }
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Mentor Profile" description="Keep your profile updated so learners can find and connect with you." />

      <div className="max-w-2xl space-y-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink">Profile Picture</h3>
          <div className="p-4 bg-ink-50 rounded-xl border border-ink-100">
            <ProfilePictureUpload
              currentAvatarUrl={user.avatar}
              userName={user.name}
              showSaveButton={true}
              onSave={async (file) => {
                const res = await uploadUserAvatar(user.id, file);
                if (res.success) {
                  show('Profile picture updated successfully.', 'success');
                }
                return res;
              }}
              onRemove={async () => {
                const res = await removeUserAvatar(user.id);
                if (res.success) {
                  show('Profile picture removed.', 'info');
                }
                return res;
              }}
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink">Professional Information</h3>
          <Input label="Professional title" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
          <Textarea label="Bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Describe your experience and mentoring approach..." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nairobi, Kenya" />
            <Input label="Years of experience" type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} />
          </div>
          <Input label="Education" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="MSc Computer Science, Strathmore University" />
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink">Certifications</h3>
          <div className="flex gap-2">
            <Input value={certInput} onChange={(e) => setCertInput(e.target.value)} placeholder="Add a certification..." />
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
            {certifications.map((cert, idx) => (
              <Badge key={idx} variant="outline">
                {cert}
                <button onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))} className="ml-1.5 text-ink-300 hover:text-red-500">×</button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink">Mentorship Areas</h3>
          <div className="flex gap-2">
            <Input value={areaInput} onChange={(e) => setAreaInput(e.target.value)} placeholder="e.g., Frontend Development" />
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
            {mentorshipAreas.map((area, idx) => (
              <Badge key={idx} variant="gray">
                {area}
                <button onClick={() => setMentorshipAreas(mentorshipAreas.filter((_, i) => i !== idx))} className="ml-1.5 text-ink-300 hover:text-red-500">×</button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-ink">Expertise & Availability</h3>
          <Select label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
            {availabilityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <div>
            <label className="label">Skills / Expertise</label>
            <p className="text-sm text-ink-400 mb-3">Select the skills you can mentor learners in.</p>
            <SkillSelector
              skills={skills}
              selectedIds={skillIds}
              selectedLevels={skillLevels}
              onChange={(ids, levels) => {
                setSkillIds(ids);
                setSkillLevels(levels);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="lg" onClick={handleSave}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Profile'}
          </Button>
        </div>

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

      <DeleteAccountDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await deleteMentorAccount(user.id);
          await logout();
          router.push('/');
        }}
        userName={user.name}
      />
    </DashboardLayout>
  );
}
