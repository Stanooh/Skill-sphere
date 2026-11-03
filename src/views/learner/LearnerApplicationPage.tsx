'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Globe2,
  Linkedin,
  Github,
  Send,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getSkills } from '@/services/dataService';
import type { EvidenceType, MentorApplication, MentorApplicationSkill } from '@/types';
import {
  getMyApplication,
  getMyApplicationSkills,
  createOrUpdateApplication,
  submitApplication,
  upsertSkillVerification,
} from '@/services/mentorVerificationService';

const evidenceTypes: { value: EvidenceType; label: string }[] = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'github', label: 'GitHub repo' },
  { value: 'portfolio', label: 'Portfolio project' },
  { value: 'experience', label: 'Professional experience' },
  { value: 'work-sample', label: 'Work sample' },
  { value: 'reference', label: 'Reference' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'sample-lesson', label: 'Sample lesson' },
];

export function LearnerApplicationPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<MentorApplication | null>(null);
  const [skills, setSkills] = useState<MentorApplicationSkill[]>([]);

  const [headline, setHeadline] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');

  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillEvidence, setSkillEvidence] = useState<Record<string, { type: EvidenceType; title: string; description: string; url?: string }>>({});

  const availableSkills = getSkills();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const app = await getMyApplication();
      if (app) {
        setApplication(app);
        setHeadline(app.professionalHeadline);
        setBiography(app.biography);
        setLocation(app.location);
        setLinkedIn(app.linkedinUrl ?? '');
        setGithub(app.githubUrl ?? '');
        setPortfolio(app.portfolioUrl ?? '');

        if (app.status === 'approved') {
          router.replace('/mentor');
          return;
        }

        const skillData = await getMyApplicationSkills(app.id);
        setSkills(skillData);
        setSelectedSkillIds(skillData.map((s) => s.skillId));
      }
      setLoading(false);
    })();
  }, [user, router]);

  if (!user) return null;

  if (loading) {
    return (
      <DashboardLayout hideSidebar>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const isEditable = !application || application.status === 'not_applied' || application.status === 'verification_failed' || application.status === 'rejected';

  const saveProfile = async () => {
    if (!application) {
      const app = await createOrUpdateApplication(null, {
        professionalHeadline: headline,
        biography,
        location,
        linkedinUrl: linkedIn,
        githubUrl: github,
        portfolioUrl: portfolio,
      });
      if (app) {
        setApplication(app);
        show('Application created. Add your skills and evidence below.', 'success');
      } else {
        show('Could not create application. Please try again.', 'error');
      }
    } else {
      const app = await createOrUpdateApplication(application.id, {
        professionalHeadline: headline,
        biography,
        location,
        linkedinUrl: linkedIn,
        githubUrl: github,
        portfolioUrl: portfolio,
      });
      if (app) {
        setApplication(app);
        show('Profile details saved.', 'success');
      }
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const saveSkillEvidence = async (skillId: string) => {
    if (!application) {
      show('Save your profile details first.', 'error');
      return;
    }
    const evidence = skillEvidence[skillId];
    if (!evidence || !evidence.title.trim() || !evidence.description.trim()) {
      show('Add a title and description for the evidence.', 'error');
      return;
    }

    const skill = availableSkills.find((s) => s.id === skillId);
    const result = await upsertSkillVerification(application.id, skillId, skill?.name ?? skillId, [evidence]);
    if (result) {
      setSkills((prev) => {
        const existing = prev.find((s) => s.skillId === skillId);
        if (existing) {
          return prev.map((s) => (s.skillId === skillId ? result : s));
        }
        return [...prev, result];
      });
      setSkillEvidence((prev) => ({ ...prev, [skillId]: { type: 'portfolio', title: '', description: '' } }));
      show('Skill evidence saved.', 'success');
    } else {
      show('Could not save evidence. Please try again.', 'error');
    }
  };

  const submit = async () => {
    if (!application) {
      show('Save your profile details first.', 'error');
      return;
    }
    if (selectedSkillIds.length === 0) {
      show('Select at least one skill with evidence.', 'error');
      return;
    }
    const hasEvidence = skills.some((s) => selectedSkillIds.includes(s.skillId) && s.evidenceData.length > 0);
    if (!hasEvidence) {
      show('Add evidence for at least one skill before submitting.', 'error');
      return;
    }

    const success = await submitApplication(application.id);
    if (success) {
      show('Application submitted for review.', 'success');
      const updated = await getMyApplication();
      if (updated) setApplication(updated);
    } else {
      show('Could not submit application. Please try again.', 'error');
    }
  };

  return (
    <DashboardLayout hideSidebar>
      <PageHeader
        title="Become a mentor"
        description="Submit your application for competency verification and admin approval."
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status banner */}
        {application && application.status !== 'not_applied' && (
          <div className={`rounded-xl border p-4 ${
            application.status === 'pending_verification' ? 'border-amber-800 bg-amber-950/30' :
            application.status === 'pending_admin_approval' ? 'border-brand-200 bg-brand-900/30' :
            application.status === 'verification_failed' ? 'border-red-800 bg-red-950/30' :
            'border-ink-200 bg-ink-100'
          }`}>
            <p className="text-sm text-ink-400">
              <strong className="text-ink">Current status:</strong>{' '}
              {application.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </p>
            {application.rejectionReason && (
              <p className="text-sm text-red-300 mt-2">Reviewer feedback: {application.rejectionReason}</p>
            )}
          </div>
        )}

        {/* Professional information */}
        <section className="card p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Professional information</h2>
              <p className="mt-1 text-sm text-ink-400">Tell us about your professional background.</p>
            </div>
            <FileText className="h-6 w-6 text-brand-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label sm:col-span-2">Professional headline
              <input className="input mt-1.5" value={headline} onChange={(e) => setHeadline(e.target.value)} disabled={!isEditable} placeholder="Senior Frontend Engineer" />
            </label>
            <label className="label sm:col-span-2">Biography and relevant experience
              <textarea className="input mt-1.5 min-h-28" value={biography} onChange={(e) => setBiography(e.target.value)} disabled={!isEditable} placeholder="Describe your experience and what makes you a great mentor..." />
            </label>
            <label className="label">Location
              <input className="input mt-1.5" value={location} onChange={(e) => setLocation(e.target.value)} disabled={!isEditable} placeholder="Nairobi, Kenya" />
            </label>
            <label className="label"><span className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</span>
              <input className="input mt-1.5" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} disabled={!isEditable} placeholder="https://linkedin.com/in/..." />
            </label>
            <label className="label"><span className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub</span>
              <input className="input mt-1.5" value={github} onChange={(e) => setGithub(e.target.value)} disabled={!isEditable} placeholder="https://github.com/..." />
            </label>
            <label className="label sm:col-span-2"><span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Portfolio or website</span>
              <input className="input mt-1.5" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} disabled={!isEditable} placeholder="https://..." />
            </label>
          </div>
          {isEditable && (
            <Button className="mt-5" onClick={saveProfile}>Save professional details</Button>
          )}
        </section>

        {/* Skill selection and evidence */}
        {isEditable && (
          <section className="card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-ink">Competency evidence</h2>
              <p className="mt-1 text-sm text-ink-400">Select the skills you want to teach and provide evidence for each.</p>
            </div>

            <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableSkills.map((skill) => (
                <label key={skill.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-600 hover:border-brand-300">
                  <input type="checkbox" checked={selectedSkillIds.includes(skill.id)} onChange={() => toggleSkill(skill.id)} className="h-4 w-4 accent-brand" />
                  {skill.name}
                </label>
              ))}
            </div>

            <div className="space-y-5">
              {availableSkills.filter((s) => selectedSkillIds.includes(s.id)).map((skill) => {
                const existingSkill = skills.find((s) => s.skillId === skill.id);
                const draft = skillEvidence[skill.id] ?? { type: 'portfolio' as EvidenceType, title: '', description: '' };
                return (
                  <div key={skill.id} className="rounded-xl border border-ink-200 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-ink">{skill.name}</h3>
                        <p className="text-xs text-ink-300">{skill.category}</p>
                      </div>
                      {existingSkill && (
                        <Badge variant={existingSkill.status === 'verified' ? 'green' : existingSkill.status === 'needs-evidence' ? 'amber' : existingSkill.status === 'rejected' ? 'red' : 'gray'}>
                          {existingSkill.status.replace(/-/g, ' ')}
                        </Badge>
                      )}
                    </div>

                    {/* Existing evidence */}
                    {existingSkill && existingSkill.evidenceData.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {existingSkill.evidenceData.map((ev, i) => (
                          <div key={i} className="rounded-lg bg-ink-50 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-ink-600">{ev.title}</span>
                              <Badge variant="outline">{ev.type}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-ink-300">{ev.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {existingSkill?.feedback && (
                      <p className="text-sm text-amber-400 mb-3">Reviewer feedback: {existingSkill.feedback}</p>
                    )}

                    {/* Add evidence form */}
                    <div className="rounded-lg border border-dashed border-ink-200 p-3 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select className="input" value={draft.type} onChange={(e) => setSkillEvidence((prev) => ({ ...prev, [skill.id]: { ...draft, type: e.target.value as EvidenceType } }))}>
                          {evidenceTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input className="input" placeholder="Evidence title" value={draft.title} onChange={(e) => setSkillEvidence((prev) => ({ ...prev, [skill.id]: { ...draft, title: e.target.value } }))} />
                      </div>
                      <textarea className="input min-h-16" placeholder="What does this demonstrate?" value={draft.description} onChange={(e) => setSkillEvidence((prev) => ({ ...prev, [skill.id]: { ...draft, description: e.target.value } }))} />
                      <input className="input" placeholder="Link (optional)" value={draft.url ?? ''} onChange={(e) => setSkillEvidence((prev) => ({ ...prev, [skill.id]: { ...draft, url: e.target.value } }))} />
                      <Button size="sm" onClick={() => saveSkillEvidence(skill.id)}>
                        <Plus className="h-4 w-4" /> Add evidence
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Submit */}
        {isEditable && (
          <section className="card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Submit for review</h2>
                <p className="mt-1 text-sm text-ink-400">An administrator will review your evidence and make a decision.</p>
              </div>
              <Button size="lg" onClick={submit}>
                <Send className="h-4 w-4" /> Submit application
              </Button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
