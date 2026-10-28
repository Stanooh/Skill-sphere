'use client';

import { useMemo, useState } from 'react';
import { Check, ClipboardCheck, FileText, Search, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getSkills, getUserById } from '@/services/dataService';
import type { ReviewDecision, VerificationStatus } from '@/types';
import { getVerificationApplications, reviewIdentity, reviewSkill } from '@/services/verificationService';
import { VerificationStatusBadge } from '@/components/verification/VerificationComponents';

const statuses: { value: 'all' | VerificationStatus; label: string }[] = [
  { value: 'all', label: 'All applications' },
  { value: 'pending', label: 'Pending review' },
  { value: 'needs-evidence', label: 'Needs evidence' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

export function AdminVerificationPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState('');
  const applications = getVerificationApplications();
  const skills = getSkills();
  const filtered = useMemo(() => applications.filter((application) => {
    const mentor = getUserById(application.mentorId);
    const matchesQuery = !query || mentor?.name.toLowerCase().includes(query.toLowerCase()) || application.skills.some((item) => skills.find((skill) => skill.id === item.skillId)?.name.toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || application.overallStatus === statusFilter || application.identity.status === statusFilter || application.skills.some((item) => item.status === statusFilter);
    return matchesQuery && matchesStatus;
  }), [applications, query, statusFilter, refreshKey, skills]);
  const selected = applications.find((application) => application.mentorId === selectedId) ?? filtered[0];

  if (!user) return null;

  const decideIdentity = (decision: ReviewDecision) => {
    if (!selected || !window.confirm(`Confirm identity action: ${decision}?`)) return;
    const next = reviewIdentity(selected.mentorId, decision, feedback.trim() || 'Reviewed by SkillSphere administrator.', user.id);
    setFeedback('');
    setRefreshKey((value) => value + 1);
    setSelectedId(next.mentorId);
    show(`Identity marked ${decision === 'approve' ? 'verified' : decision === 'reject' ? 'rejected' : 'in need of more evidence'}.`, decision === 'approve' ? 'success' : 'info');
  };

  const decideSkill = (skillId: string, decision: ReviewDecision) => {
    if (!selected || !window.confirm(`Confirm competency action: ${decision}?`)) return;
    const next = reviewSkill(selected.mentorId, skillId, decision, feedback.trim() || 'Reviewed by SkillSphere administrator.', user.id);
    setFeedback('');
    setRefreshKey((value) => value + 1);
    setSelectedId(next.mentorId);
    show('Individual skill review saved.', decision === 'approve' ? 'success' : 'info');
  };

  return (
    <DashboardLayout>
      <PageHeader title="Verification review" description="Review identity and each competency independently. This prototype does not perform real identity checks." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Awaiting review', applications.filter((item) => item.overallStatus === 'pending').length, 'amber'],
          ['Verified identity', applications.filter((item) => item.identity.status === 'verified').length, 'green'],
          ['Needs evidence', applications.filter((item) => item.overallStatus === 'needs-evidence').length, 'amber'],
          ['Rejected', applications.filter((item) => item.overallStatus === 'rejected').length, 'red'],
        ].map(([label, value, variant]) => <div className="card p-4" key={label as string}><p className="text-sm text-ink-400">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p><Badge variant={variant as 'green' | 'amber' | 'red'}>{label}</Badge></div>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          <div className="border-b border-ink-200 p-4 space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" /><input className="input pl-9" placeholder="Search mentor or skill" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div>
          <div className="max-h-[650px] overflow-y-auto">{filtered.length === 0 ? <div className="p-8 text-center text-sm text-ink-400">No applications match this filter.</div> : filtered.map((application) => { const mentor = getUserById(application.mentorId); return <button key={application.id} onClick={() => setSelectedId(application.mentorId)} className={`w-full border-b border-ink-200 p-4 text-left transition-colors hover:bg-ink-50 ${selected?.mentorId === application.mentorId ? 'bg-brand-50' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-ink">{mentor?.name ?? 'Unknown mentor'}</p><p className="mt-1 text-xs text-ink-300">{application.skills.length} skills submitted</p></div><VerificationStatusBadge status={application.overallStatus} compact /></div></button>; })}</div>
        </section>
        {selected ? <section className="space-y-5"><div className="card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-ink-400">Mentor application</p><h2 className="mt-1 text-2xl font-semibold text-ink">{getUserById(selected.mentorId)?.name}</h2><p className="mt-1 text-sm text-ink-400">{selected.professionalHeadline} · {selected.location}</p></div><VerificationStatusBadge status={selected.overallStatus} /></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wider text-ink-300">Biography</p><p className="mt-1 text-sm leading-6 text-ink-400">{selected.biography || 'Not provided.'}</p></div><div><p className="text-xs uppercase tracking-wider text-ink-300">Links</p><p className="mt-1 text-sm text-ink-400">{[selected.linkedIn, selected.github, selected.portfolio].filter(Boolean).join(' · ') || 'No links provided.'}</p></div></div><label className="label mt-5 block">Reviewer note<textarea className="input mt-1.5 min-h-20" placeholder="Explain the decision or next requirement" value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label></div>
          <div className="card p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Identity review</h2><p className="text-sm text-ink-400">Private evidence preview. Never shown on public profiles.</p></div><ShieldCheck className="h-6 w-6 text-brand-800" /></div>{selected.identity.evidence ? <div className="rounded-xl border border-ink-200 bg-ink-50 p-4"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-brand-800" /><div><p className="font-medium text-ink">{selected.identity.evidence.fileName ?? selected.identity.evidence.title}</p><p className="text-xs text-ink-300">{selected.identity.evidenceType} · {selected.identity.legalName}</p></div></div></div> : <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-400">No identity evidence submitted.</p>}<div className="mt-4 flex flex-wrap items-center gap-3"><VerificationStatusBadge status={selected.identity.status} compact /><Button size="sm" onClick={() => decideIdentity('approve')} disabled={!selected.identity.evidence}><Check className="h-4 w-4" /> Approve identity</Button><Button size="sm" variant="secondary" onClick={() => decideIdentity('request-evidence')} disabled={!selected.identity.evidence}>Request evidence</Button><Button size="sm" variant="ghost" onClick={() => decideIdentity('reject')} disabled={!selected.identity.evidence}><X className="h-4 w-4" /> Reject</Button></div>{selected.identity.feedback && <p className="mt-3 text-sm text-ink-400">Latest feedback: {selected.identity.feedback}</p>}</div>
          <div className="card p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Competency review</h2><p className="text-sm text-ink-400">Each skill has its own decision. Approving one never approves the others.</p></div><ClipboardCheck className="h-6 w-6 text-brand-800" /></div><div className="space-y-4">{selected.skills.map((review) => { const skill = skills.find((item) => item.id === review.skillId); return <div key={review.id} className="rounded-xl border border-ink-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-medium text-ink">{skill?.name ?? review.skillId}</h3><p className="text-xs text-ink-300">{review.evidence.length} evidence item(s)</p></div><VerificationStatusBadge status={review.status} compact /></div><div className="mt-3 space-y-2">{review.evidence.map((item) => <div className="rounded-lg bg-ink-50 p-3 text-sm" key={item.id}><div className="flex items-center gap-2 text-ink-600"><FileText className="h-4 w-4 text-brand-800" />{item.title}</div><p className="mt-1 text-xs text-ink-300">{item.description}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => decideSkill(review.skillId, 'approve')} disabled={review.evidence.length === 0}><Check className="h-4 w-4" /> Approve skill</Button><Button size="sm" variant="secondary" onClick={() => decideSkill(review.skillId, 'request-evidence')} disabled={review.evidence.length === 0}>Request more</Button><Button size="sm" variant="ghost" onClick={() => decideSkill(review.skillId, 'reject')} disabled={review.evidence.length === 0}><X className="h-4 w-4" /> Reject</Button></div>{review.feedback && <p className="mt-3 text-sm text-ink-400">Feedback: {review.feedback}</p>}</div>; })}</div></div>
        </section> : <div className="card p-12 text-center text-ink-400">Select an application to review.</div>}
      </div>
    </DashboardLayout>
  );
}
