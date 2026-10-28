'use client';

import { useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Clock3, FileCheck2, FileUp, Info, ShieldCheck, XCircle } from 'lucide-react';
import type { EvidenceType, MentorVerificationApplication, VerificationStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { evidenceTypeLabels, getVerificationApplication } from '@/services/verificationService';
import { getSkills } from '@/services/dataService';

const statusCopy: Record<VerificationStatus, { label: string; description: string; variant: 'brand' | 'gray' | 'green' | 'amber' | 'red' }> = {
  'not-submitted': { label: 'Not submitted', description: 'No evidence has been submitted yet.', variant: 'gray' },
  pending: { label: 'Pending review', description: 'Submitted for a human review.', variant: 'amber' },
  'needs-evidence': { label: 'Needs more evidence', description: 'Additional information is required.', variant: 'amber' },
  verified: { label: 'Verified', description: 'Approved in this demonstration workflow.', variant: 'green' },
  rejected: { label: 'Rejected', description: 'This submission was not approved.', variant: 'red' },
  suspended: { label: 'Suspended', description: 'Verification is temporarily inactive.', variant: 'red' },
};

const statusIcons: Record<VerificationStatus, typeof CheckCircle2> = {
  'not-submitted': CircleAlert,
  pending: Clock3,
  'needs-evidence': CircleAlert,
  verified: CheckCircle2,
  rejected: XCircle,
  suspended: ShieldCheck,
};

export function VerificationStatusBadge({ status, compact = false }: { status: VerificationStatus; compact?: boolean }) {
  const copy = statusCopy[status];
  const Icon = statusIcons[status];
  return (
    <span title={copy.description} className="inline-flex items-center gap-1.5">
      <Badge variant={copy.variant}><Icon className="h-3.5 w-3.5" />{copy.label}</Badge>
      {!compact && <span className="hidden text-xs text-ink-300 sm:inline">{copy.description}</span>}
    </span>
  );
}

export function VerificationProgress({ application }: { application: MentorVerificationApplication }) {
  const identityScore = application.identity.status === 'verified' ? 50 : application.identity.status === 'pending' ? 25 : 0;
  const skillCount = application.skills.length;
  const verifiedSkills = application.skills.filter((skill) => skill.status === 'verified').length;
  const score = Math.round(identityScore + (skillCount ? (verifiedSkills / skillCount) * 50 : 0));
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-sm text-ink-400">Verification progress</p>
          <p className="text-2xl font-bold text-ink">{score}%</p>
        </div>
        <ShieldCheck className="h-7 w-7 text-brand-800" />
      </div>
      <div className="h-2 rounded-full bg-ink-100 overflow-hidden mb-3">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${score}%` }} />
      </div>
      <div className="flex justify-between text-xs text-ink-300">
        <span>Identity {application.identity.status === 'verified' ? 'approved' : 'in progress'}</span>
        <span>{verifiedSkills}/{skillCount} skills approved</span>
      </div>
    </div>
  );
}

export function EvidenceUploadField({
  onAdd,
}: {
  onAdd: (evidence: { type: EvidenceType; title: string; fileName?: string; url?: string; description: string }) => void;
}) {
  const [type, setType] = useState<EvidenceType>('portfolio');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a file smaller than 5 MB.');
      return;
    }
    setFileName(file.name);
    setError('');
  };

  const handleAdd = () => {
    if (!title.trim() || !description.trim()) {
      setError('Add a title and short explanation before attaching evidence.');
      return;
    }
    onAdd({ type, title: title.trim(), description: description.trim(), url: url.trim() || undefined, fileName: fileName || undefined });
    setTitle('');
    setDescription('');
    setUrl('');
    setFileName('');
    setError('');
  };

  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-700"><FileUp className="h-4 w-4 text-brand-800" /> Add evidence</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="input" value={type} onChange={(event) => setType(event.target.value as EvidenceType)}>
          {Object.entries(evidenceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className="input" placeholder="Evidence title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <textarea className="input min-h-20" placeholder="What does this demonstrate?" value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Link (optional)" value={url} onChange={(event) => setUrl(event.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-ink-800 px-3 py-2.5 text-sm text-ink-400 hover:border-brand-300">
          <FileCheck2 className="h-4 w-4" />
          <span className="truncate">{fileName || 'Attach demo file'}</span>
          <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={handleFile} />
        </label>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <Button type="button" size="sm" onClick={handleAdd}>Attach evidence</Button>
      <p className="flex items-start gap-2 text-xs text-ink-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Prototype only. Files are represented by metadata and are not sent to a real identity provider.</p>
    </div>
  );
}

export function EvidenceList({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function PublicTrustIndicators({ mentorId, limitSkills = 3 }: { mentorId: string; limitSkills?: number }) {
  const application = getVerificationApplication(mentorId);
  const skills = getSkills();
  const verifiedSkills = application.skills
    .filter((skill) => skill.status === 'verified')
    .map((skill) => skills.find((item) => item.id === skill.skillId)?.name)
    .filter((name): name is string => Boolean(name));
  if (application.identity.status !== 'verified' && verifiedSkills.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" title="These badges reflect approved records in SkillSphere's review workflow. They are not a guarantee of results.">
      {application.identity.status === 'verified' && <Badge variant="green"><ShieldCheck className="h-3 w-3" /> Identity verified</Badge>}
      {verifiedSkills.length > 0 && <Badge variant="brand"><CheckCircle2 className="h-3 w-3" /> Competency verified</Badge>}
      {verifiedSkills.slice(0, limitSkills).map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
    </div>
  );
}
