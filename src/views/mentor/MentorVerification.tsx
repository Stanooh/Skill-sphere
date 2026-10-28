'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileText, Globe2, Linkedin, LockKeyhole, Github, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getSkills } from '@/services/dataService';
import type { EvidenceType, MentorVerificationApplication, SkillVerification } from '@/types';
import {
  addIdentityEvidence,
  addVerificationEvidence,
  getVerificationApplication,
  submitVerificationApplication,
  setVerificationSkills,
  updateVerificationProfile,
} from '@/services/verificationService';
import { EvidenceList, EvidenceUploadField, VerificationProgress, VerificationStatusBadge } from '@/components/verification/VerificationComponents';

export function MentorVerificationPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [application, setApplication] = useState<MentorVerificationApplication | null>(null);
  const [legalName, setLegalName] = useState('');
  const [identityType, setIdentityType] = useState<'passport' | 'national-id' | 'drivers-license'>('national-id');
  const [identityFile, setIdentityFile] = useState('');
  const [headline, setHeadline] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const current = getVerificationApplication(user.id);
    setApplication(current);
    setLegalName(current.identity.legalName);
    setHeadline(current.professionalHeadline);
    setBiography(current.biography);
    setLocation(current.location);
    setLinkedIn(current.linkedIn ?? '');
    setGithub(current.github ?? '');
    setPortfolio(current.portfolio ?? '');
    setSelectedSkillIds(current.selectedSkillIds ?? current.skills.map((skill) => skill.skillId));
  }, [user]);

  const availableSkills = useMemo(() => getSkills(), []);

  if (!user || !application) return null;

  const refresh = (next: MentorVerificationApplication) => setApplication({ ...next });

  const saveProfile = () => {
    refresh(updateVerificationProfile(user.id, { professionalHeadline: headline, biography, location, linkedIn, github, portfolio }));
    show('Professional details saved.', 'success');
  };

  const addIdentity = () => {
    if (!legalName.trim() || !identityFile) {
      show('Add your legal name and a demonstration identity file.', 'error');
      return;
    }
    refresh(addIdentityEvidence(user.id, {
      legalName,
      evidenceType: identityType,
      evidence: { type: 'work-sample', title: 'Identity document', fileName: identityFile, description: 'Private identity evidence for review.' },
    }));
    show('Identity evidence saved for review.', 'success');
  };

  const submit = () => {
    const next = submitVerificationApplication(user.id);
    refresh(next);
    if (next.overallStatus === 'pending') show('Application submitted for demonstration review.', 'success');
    else show('Add identity or skill evidence before submitting.', 'error');
  };

  const toggleSkill = (skillId: string) => {
    const nextIds = selectedSkillIds.includes(skillId) ? selectedSkillIds.filter((id) => id !== skillId) : [...selectedSkillIds, skillId];
    setSelectedSkillIds(nextIds);
    refresh(setVerificationSkills(user.id, nextIds));
  };

  const addSkillEvidence = (skillId: string, evidence: { type: EvidenceType; title: string; fileName?: string; url?: string; description: string }) => {
    refresh(addVerificationEvidence(user.id, skillId, evidence));
    show('Skill evidence added.', 'success');
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Mentor verification"
        description="Build trust with separate identity and competency reviews. Approval is never automatic."
        action={<Link href="/mentor"><Button variant="secondary" size="sm"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Button></Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold text-ink">Professional information</h2><p className="mt-1 text-sm text-ink-400">We prefilled this from your mentor profile.</p></div>
              <FileText className="h-6 w-6 text-brand-800" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="label sm:col-span-2">Professional headline<input className="input mt-1.5" value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
              <label className="label sm:col-span-2">Biography and relevant experience<textarea className="input mt-1.5 min-h-28" value={biography} onChange={(event) => setBiography(event.target.value)} /></label>
              <label className="label">Location<input className="input mt-1.5" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
              <label className="label">Profile photo<input className="input mt-1.5" value={application.profilePhoto ?? ''} readOnly /></label>
              <label className="label"><span className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5" /> LinkedIn<input className="input mt-1.5" value={linkedIn} onChange={(event) => setLinkedIn(event.target.value)} /></span></label>
              <label className="label"><span className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub<input className="input mt-1.5" value={github} onChange={(event) => setGithub(event.target.value)} /></span></label>
              <label className="label sm:col-span-2"><span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Portfolio or professional website<input className="input mt-1.5" value={portfolio} onChange={(event) => setPortfolio(event.target.value)} /></span></label>
            </div>
            <Button className="mt-5" onClick={saveProfile}>Save professional details</Button>
          </section>

          <section className="card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold text-ink">Identity verification</h2><p className="mt-1 text-sm text-ink-400">This confirms that your professional profile belongs to you. It does not assess your skills.</p></div>
              <LockKeyhole className="h-6 w-6 text-brand-800" />
            </div>
            <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">Supported demonstration evidence: passport, national ID, or driver's license. Never upload a real document to this prototype.</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="label">Full legal name<input className="input mt-1.5" value={legalName} onChange={(event) => setLegalName(event.target.value)} /></label>
              <label className="label">Evidence type<select className="input mt-1.5" value={identityType} onChange={(event) => setIdentityType(event.target.value as typeof identityType)}><option value="national-id">National ID</option><option value="passport">Passport</option><option value="drivers-license">Driver's license</option></select></label>
              <label className="label sm:col-span-2">Demo file name<input className="input mt-1.5" placeholder="national-id-demo.pdf" value={identityFile} onChange={(event) => setIdentityFile(event.target.value)} /></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={addIdentity}>Save identity evidence</Button><VerificationStatusBadge status={application.identity.status} /></div>
            {application.identity.feedback && <p className="mt-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-400">Reviewer feedback: {application.identity.feedback}</p>}
            <p className="mt-5 flex items-start gap-2 text-xs text-ink-300"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />Identity evidence is private and will never appear on your public mentor profile.</p>
          </section>

          <section className="card p-6">
            <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-ink">Competency verification</h2><p className="mt-1 text-sm text-ink-400">Choose skills individually. Practical experience and work samples are welcome; certificates are optional.</p></div><CheckCircle2 className="h-6 w-6 text-brand-800" /></div>
            <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availableSkills.map((skill) => <label key={skill.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-600 hover:border-brand-300"><input type="checkbox" checked={selectedSkillIds.includes(skill.id)} onChange={() => toggleSkill(skill.id)} className="h-4 w-4 accent-brand" />{skill.name}</label>)}</div>
            <div className="space-y-5">
              {availableSkills.filter((skill) => selectedSkillIds.includes(skill.id)).map((skill) => {
                const review: SkillVerification = application.skills.find((item) => item.skillId === skill.id) ?? { id: `skill-${skill.id}`, skillId: skill.id, status: 'not-submitted', evidence: [] };
                return <div key={skill.id} className="rounded-xl border border-ink-200 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium text-ink">{skill.name}</h3><p className="text-xs text-ink-300">{skill.category}</p></div><VerificationStatusBadge status={review.status} compact /></div><EvidenceList>{review.evidence.map((item) => <div key={item.id} className="rounded-lg bg-ink-50 px-3 py-2 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium text-ink-600">{item.title}</span><Badge variant="outline">{item.fileName ?? 'Link or description'}</Badge></div><p className="mt-1 text-xs text-ink-300">{item.description}</p></div>)}</EvidenceList><div className="mt-3"><EvidenceUploadField onAdd={(evidence) => addSkillEvidence(skill.id, evidence)} /></div>{review.feedback && <p className="mt-3 text-sm text-ink-400">Reviewer feedback: {review.feedback}</p>}</div>;
              })}
            </div>
          </section>

          <section className="card p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-ink">Submit for review</h2><p className="mt-1 text-sm text-ink-400">A reviewer will assess identity and each selected skill independently.</p></div><Button size="lg" onClick={submit}>Submit application</Button></div></section>
        </div>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start"><VerificationProgress application={application} /><div className="card p-5"><h3 className="font-semibold text-ink">Current status</h3><div className="mt-4 space-y-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-ink-400">Application</span><VerificationStatusBadge status={application.overallStatus} compact /></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-ink-400">Identity</span><VerificationStatusBadge status={application.identity.status} compact /></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-ink-400">Skills selected</span><span className="font-medium text-ink">{application.skills.length}</span></div></div></div></aside>
      </div>
    </DashboardLayout>
  );
}
