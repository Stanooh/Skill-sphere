'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SkillSelector } from '@/components/profile/SkillSelector';
import { getMentorProfile, updateMentorProfile, getSkills } from '@/services/dataService';
import type { Availability, SkillLevel } from '@/types';
import { Check } from 'lucide-react';

const availabilityOptions: { value: Availability; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'unavailable', label: 'Unavailable' },
];

export function MentorProfilePage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [saved, setSaved] = useState(false);
  const [certInput, setCertInput] = useState('');
  const [areaInput, setAreaInput] = useState('');

  if (!user) return null;

  const profile = getMentorProfile(user.id);
  const skills = getSkills();

  const [professionalTitle, setProfessionalTitle] = useState(profile?.professionalTitle ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [experienceYears, setExperienceYears] = useState(profile?.experienceYears ?? 0);
  const [education, setEducation] = useState(profile?.education ?? '');
  const [certifications, setCertifications] = useState<string[]>(profile?.certifications ?? []);
  const [availability, setAvailability] = useState<Availability>(profile?.availability ?? 'available');
  const [mentorshipAreas, setMentorshipAreas] = useState<string[]>(profile?.mentorshipAreas ?? []);
  const [skillIds, setSkillIds] = useState<string[]>(profile?.skillIds ?? []);
  const [skillLevels, setSkillLevels] = useState<Record<string, SkillLevel>>({});

  const handleSave = () => {
    const complete =
      professionalTitle.trim().length > 0 &&
      bio.trim().length > 0 &&
      skillIds.length > 0 &&
      availability !== 'unavailable';
    updateMentorProfile(user.id, {
      professionalTitle,
      bio,
      location,
      experienceYears,
      education,
      certifications,
      availability,
      mentorshipAreas,
      skillIds,
      profileComplete: complete,
    });
    setSaved(true);
    if (complete) {
      show('Profile updated successfully. Your profile is now visible to learners.', 'success');
    } else {
      show('Profile saved. Add a title, bio, at least one skill, and set availability to appear in search.', 'info');
    }
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <PageHeader title="Mentor Profile" description="Keep your profile updated so learners can find and connect with you." />

      <div className="max-w-2xl space-y-6">
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
      </div>
    </DashboardLayout>
  );
}
