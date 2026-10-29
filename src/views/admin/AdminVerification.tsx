'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCheck, FileText, Search, ShieldCheck, X, Ban, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { MentorApplicationWithDetails, MentorProfile } from '@/types';
import {
  adminListApplications,
  adminApproveMentor,
  adminSetCompetency,
  adminSetIdentity,
  adminRejectApplication,
  adminSuspendMentor,
  adminReviewSkill,
  adminRequestEvidence,
} from '@/services/mentorVerificationService';
import { getMentorProfile } from '@/services/dataService';
import { GraduationCap, Award, Briefcase } from 'lucide-react';

export function AdminVerificationPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<MentorApplicationWithDetails[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    const data = await adminListApplications();
    setApplications(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadApplications();
  }, [user]);

  const filtered = useMemo(() => applications.filter((app) => {
    const matchesQuery = !query || app.applicantName?.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [applications, query, statusFilter]);

  const selected = applications.find((a) => a.id === selectedId) ?? filtered[0];

  if (!user) return null;

  const handleAction = async (fn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
    if (!selected) return;
    setActionLoading(true);
    const result = await fn();
    setActionLoading(false);
    if (result.success) {
      show(successMsg, 'success');
      setFeedback('');
      await loadApplications();
    } else {
      show(result.error || 'Action failed', 'error');
    }
  };

  const handleApprove = () => {
    if (!selected || !window.confirm('Approve this mentor application?')) return;
    handleAction(() => adminApproveMentor(selected.id), 'Mentor approved successfully.');
  };

  const handleCompetencyPass = () => {
    if (!selected) return;
    handleAction(() => adminSetCompetency(selected.id, true, feedback.trim() || undefined), 'Competency verification passed.');
  };

  const handleCompetencyFail = () => {
    if (!selected || !feedback.trim()) {
      show('Provide a reason for failing competency verification.', 'error');
      return;
    }
    handleAction(() => adminSetCompetency(selected.id, false, feedback.trim()), 'Competency verification failed.');
  };

  const handleIdentityPass = () => {
    if (!selected) return;
    handleAction(() => adminSetIdentity(selected.id, true, feedback.trim() || undefined), 'Identity verified.');
  };

  const handleIdentityFail = () => {
    if (!selected) return;
    handleAction(() => adminSetIdentity(selected.id, false, feedback.trim() || undefined), 'Identity verification failed.');
  };

  const handleReject = () => {
    if (!selected || !feedback.trim()) {
      show('Provide a reason for rejecting the application.', 'error');
      return;
    }
    if (!window.confirm('Reject this application?')) return;
    handleAction(() => adminRejectApplication(selected.id, feedback.trim()), 'Application rejected.');
  };

  const handleSuspend = () => {
    if (!selected || !feedback.trim()) {
      show('Provide a reason for suspending the mentor.', 'error');
      return;
    }
    if (!window.confirm('Suspend this mentor?')) return;
    handleAction(() => adminSuspendMentor(selected.id, feedback.trim()), 'Mentor suspended.');
  };

  const handleSkillReview = (skillVerifId: string, decision: 'verified' | 'rejected' | 'needs-evidence') => {
    handleAction(
      () => adminReviewSkill(skillVerifId, decision, feedback.trim() || undefined),
      `Skill marked ${decision.replace(/-/g, ' ')}.`
    );
  };

  const handleRequestEvidence = (skillId: string) => {
    if (!selected || !feedback.trim()) {
      show('Provide feedback for the evidence request.', 'error');
      return;
    }
    handleAction(() => adminRequestEvidence(selected.id, skillId, feedback.trim()), 'Additional evidence requested.');
  };

  const stats = [
    { label: 'Pending review', value: applications.filter((a) => a.status === 'pending_verification').length, variant: 'amber' as const },
    { label: 'Awaiting approval', value: applications.filter((a) => a.status === 'pending_admin_approval').length, variant: 'brand' as const },
    { label: 'Approved', value: applications.filter((a) => a.status === 'approved').length, variant: 'green' as const },
    { label: 'Rejected', value: applications.filter((a) => a.status === 'rejected').length, variant: 'red' as const },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Verification review" description="Review mentor applications, verify competency, and approve qualified candidates." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div className="card p-4" key={s.label}>
            <p className="text-sm text-ink-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink">{s.value}</p>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">
          No mentor applications have been submitted yet.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          {/* Application list */}
          <section className="card overflow-hidden">
            <div className="border-b border-ink-200 p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <input className="input pl-9" placeholder="Search applicant" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All applications</option>
                <option value="pending_verification">Pending review</option>
                <option value="verification_failed">Verification failed</option>
                <option value="pending_admin_approval">Awaiting approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="max-h-[650px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-ink-400">No applications match this filter.</div>
              ) : filtered.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedId(app.id)}
                  className={`w-full border-b border-ink-200 p-4 text-left transition-colors hover:bg-ink-50 ${selected?.id === app.id ? 'bg-brand-900' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{app.applicantName ?? 'Unknown'}</p>
                      <p className="mt-1 text-xs text-ink-300">{app.skills?.length ?? 0} skills submitted</p>
                    </div>
                    <Badge variant={
                      app.status === 'approved' ? 'green' :
                      app.status === 'rejected' || app.status === 'suspended' ? 'red' :
                      app.status === 'pending_admin_approval' ? 'brand' :
                      'amber'
                    }>
                      {app.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Detail panel */}
          {selected ? (
            <section className="space-y-5">
              {/* Application header */}
              <div className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink-400">Mentor application</p>
                    <h2 className="mt-1 text-2xl font-semibold text-ink">{selected.applicantName ?? 'Unknown applicant'}</h2>
                    <p className="mt-1 text-sm text-ink-400">{selected.applicantEmail}</p>
                  </div>
                  <Badge variant={
                    selected.status === 'approved' ? 'green' :
                    selected.status === 'rejected' || selected.status === 'suspended' ? 'red' :
                    selected.status === 'pending_admin_approval' ? 'brand' :
                    'amber'
                  }>
                    {selected.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-300">Professional headline</p>
                    <p className="mt-1 text-sm text-ink-400">{selected.professionalHeadline || 'Not provided.'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink-300">Location</p>
                    <p className="mt-1 text-sm text-ink-400">{selected.location || 'Not provided.'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wider text-ink-300">Biography</p>
                    <p className="mt-1 text-sm leading-6 text-ink-400">{selected.biography || 'Not provided.'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wider text-ink-300">Links</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm">
                      {selected.linkedinUrl && <a href={selected.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">LinkedIn</a>}
                      {selected.githubUrl && <a href={selected.githubUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">GitHub</a>}
                      {selected.portfolioUrl && <a href={selected.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300">Portfolio</a>}
                      {!selected.linkedinUrl && !selected.githubUrl && !selected.portfolioUrl && <span className="text-ink-400">No links provided.</span>}
                    </div>
                  </div>
                </div>

                {/* Mentor profile details */}
                {(() => {
                  const mp = getMentorProfile(selected.userId);
                  if (!mp) return null;
                  return (
                    <div className="mt-5 rounded-xl border border-ink-200 p-4">
                      <p className="text-xs uppercase tracking-wider text-ink-300 mb-3">Mentor profile details</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm text-ink-400">
                          <Briefcase className="h-4 w-4 text-brand-800" />
                          <span>{mp.experienceYears} year{mp.experienceYears !== 1 ? 's' : ''} of experience</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-ink-400">
                          <GraduationCap className="h-4 w-4 text-brand-800 mt-0.5 shrink-0" />
                          <span>{mp.education || 'Education not provided'}</span>
                        </div>
                        {mp.certifications.length > 0 && (
                          <div className="sm:col-span-2">
                            <div className="flex items-center gap-2 text-sm text-ink-400 mb-2">
                              <Award className="h-4 w-4 text-brand-800" />
                              <span>Certifications</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {mp.certifications.map((cert, i) => (
                                <Badge key={i} variant="outline">{cert}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {mp.mentorshipAreas.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="text-sm text-ink-400 mb-2">Mentorship areas</p>
                            <div className="flex flex-wrap gap-2">
                              {mp.mentorshipAreas.map((area, i) => (
                                <Badge key={i} variant="gray">{area}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Verification status indicators */}
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${selected.identityVerified ? 'bg-emerald-950 text-emerald-300' : 'bg-ink-100 text-ink-400'}`}>
                    <ShieldCheck className="h-4 w-4" /> Identity: {selected.identityVerified ? 'Verified' : 'Pending'}
                  </div>
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${selected.competencyVerified ? 'bg-emerald-950 text-emerald-300' : 'bg-ink-100 text-ink-400'}`}>
                    <Check className="h-4 w-4" /> Competency: {selected.competencyVerified ? 'Passed' : 'Pending'}
                  </div>
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${selected.adminApproved ? 'bg-emerald-950 text-emerald-300' : 'bg-ink-100 text-ink-400'}`}>
                    <ClipboardCheck className="h-4 w-4" /> Admin approval: {selected.adminApproved ? 'Approved' : 'Pending'}
                  </div>
                </div>

                {/* Reviewer note */}
                <label className="label mt-5 block">Reviewer note
                  <textarea
                    className="input mt-1.5 min-h-20"
                    placeholder="Explain the decision or next requirement"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </label>

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {actionLoading && <Loader2 className="w-5 h-5 text-brand animate-spin" />}
                  <Button size="sm" onClick={handleIdentityPass} disabled={actionLoading || selected.identityVerified}>
                    <Check className="h-4 w-4" /> Verify identity
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleIdentityFail} disabled={actionLoading}>
                    Fail identity
                  </Button>
                  <span className="w-px bg-ink-200 mx-1" />
                  <Button size="sm" onClick={handleCompetencyPass} disabled={actionLoading || selected.competencyVerified}>
                    <Check className="h-4 w-4" /> Pass competency
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleCompetencyFail} disabled={actionLoading}>
                    Fail competency
                  </Button>
                  <span className="w-px bg-ink-200 mx-1" />
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={actionLoading || !selected.competencyVerified || selected.status === 'approved'}
                    title={!selected.competencyVerified ? 'Competency must pass first' : ''}
                  >
                    <Check className="h-4 w-4" /> Approve mentor
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleReject} disabled={actionLoading}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  {selected.status === 'approved' && (
                    <Button size="sm" variant="ghost" onClick={handleSuspend} disabled={actionLoading} className="text-red-400">
                      <Ban className="h-4 w-4" /> Suspend
                    </Button>
                  )}
                </div>

                {selected.rejectionReason && (
                  <div className="mt-4 rounded-xl border border-red-800 bg-red-950/20 p-4">
                    <p className="text-xs font-semibold text-red-300 uppercase tracking-wider mb-1">
                      {selected.status === 'suspended' ? 'Suspension reason' : 'Previous rejection reason'}
                    </p>
                    <p className="text-sm text-ink-400">{selected.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Skill reviews */}
              {selected.skills && selected.skills.length > 0 && (
                <div className="card p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-ink">Competency review</h2>
                    <p className="text-sm text-ink-400">Each skill has its own decision. Approving one never approves the others.</p>
                  </div>
                  <div className="space-y-4">
                    {selected.skills.map((skill) => (
                      <div key={skill.id} className="rounded-xl border border-ink-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-ink">{skill.skillName}</h3>
                            <p className="text-xs text-ink-300">{skill.evidenceData?.length ?? 0} evidence item(s)</p>
                          </div>
                          <Badge variant={
                            skill.status === 'verified' ? 'green' :
                            skill.status === 'rejected' ? 'red' :
                            skill.status === 'needs-evidence' ? 'amber' :
                            'gray'
                          }>
                            {skill.status.replace(/-/g, ' ')}
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-2">
                          {skill.evidenceData?.map((ev, i) => (
                            <div key={i} className="rounded-lg bg-ink-50 p-3 text-sm">
                              <div className="flex items-center gap-2 text-ink-600">
                                <FileText className="h-4 w-4 text-brand-800" />
                                {ev.title}
                              </div>
                              <p className="mt-1 text-xs text-ink-300">{ev.description}</p>
                              {ev.url && <p className="mt-1 text-xs text-brand-400">{ev.url}</p>}
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => handleSkillReview(skill.id, 'verified')} disabled={actionLoading}>
                            <Check className="h-4 w-4" /> Approve skill
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleRequestEvidence(skill.skillId)} disabled={actionLoading}>
                            Request more
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSkillReview(skill.id, 'rejected')} disabled={actionLoading}>
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>

                        {skill.feedback && (
                          <p className="mt-3 text-sm text-ink-400">Feedback: {skill.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {selected.history && selected.history.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-ink mb-4">Decision history</h2>
                  <div className="space-y-3">
                    {selected.history.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                        <div>
                          <p className="text-ink-600">{h.action}</p>
                          {h.note && <p className="text-ink-300 mt-0.5">{h.note}</p>}
                          <p className="text-xs text-ink-300 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="card p-12 text-center text-ink-400">Select an application to review.</div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
