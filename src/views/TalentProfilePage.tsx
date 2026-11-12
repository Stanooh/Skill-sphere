'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Target,
  GraduationCap,
  Briefcase,
  Star,
  Mail,
  ExternalLink,
  Github,
  CheckCircle2,
  Calendar,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { getTalentProfileById } from '@/services/talentService';
import { createEmployerContactRequest } from '@/services/contactRequestService';
import { getAcceptedRecommendationsForStudent } from '@/services/recommendationService';
import { getUserById, getMentorProfile, getRoadmap } from '@/services/dataService';
import type { SkillLevel } from '@/types';

const levelColors: Record<SkillLevel, 'gray' | 'green' | 'amber' | 'brand'> = {
  beginner: 'gray',
  intermediate: 'green',
  advanced: 'amber',
  expert: 'brand',
};

export function TalentProfilePage({ studentId }: { studentId: string }) {
  const talent = useMemo(() => getTalentProfileById(studentId), [studentId]);
  const roadmap = useMemo(() => getRoadmap(studentId), [studentId]);
  const recommendations = useMemo(
    () => getAcceptedRecommendationsForStudent(studentId),
    [studentId]
  );

  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [employerName, setEmployerName] = useState('');
  const [employerEmail, setEmployerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');

  if (!talent) {
    return (
      <PublicBrowseLayout
        title="Candidate Profile Unavailable"
        description="The requested candidate profile is either private, does not exist, or has been updated by the learner."
      >
        <div className="card p-12 text-center max-w-lg mx-auto">
          <GraduationCap className="w-12 h-12 text-ink-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-ink mb-2">Profile Not Discoverable</h2>
          <p className="text-sm text-ink-400 mb-6">
            SkillSphere respects learner privacy. Candidates must explicitly permit employer
            visibility to be listed in this directory.
          </p>
          <Link href="/talent">
            <Button variant="secondary">Back to Talent Directory</Button>
          </Link>
        </div>
      </PublicBrowseLayout>
    );
  }

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employerName.trim() || !employerEmail.trim() || !companyName.trim() || !message.trim()) {
      return;
    }

    createEmployerContactRequest({
      learnerId: studentId,
      employerName: employerName.trim(),
      employerEmail: employerEmail.trim(),
      companyName: companyName.trim(),
      message: message.trim(),
    });

    setContactSent(true);
  };

  const closeContact = () => {
    setContactOpen(false);
    setContactSent(false);
    setEmployerName('');
    setEmployerEmail('');
    setCompanyName('');
    setMessage('');
  };

  const completedMilestones = roadmap?.milestones.filter((m) => m.completed) || [];

  return (
    <PublicBrowseLayout
      title=""
      description=""
    >
      <div className="mb-6">
        <Link
          href="/talent"
          className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Talent Directory
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <div className="lg:col-span-1 space-y-5">
          <div className="card p-6 text-center">
            <img
              src={talent.user.avatar}
              alt={talent.user.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 ring-2 ring-brand/40 object-cover"
            />
            <h1 className="text-2xl font-bold text-ink mb-1">{talent.user.name}</h1>
            <p className="text-sm font-medium text-brand mb-2">{talent.profile.learningGoal}</p>
            <p className="text-xs text-ink-400 flex items-center justify-center gap-1 mb-5">
              <MapPin className="w-3.5 h-3.5" /> {talent.profile.location}
            </p>

            <Button fullWidth size="lg" onClick={() => setContactOpen(true)}>
              <Mail className="w-4 h-4" /> Contact Candidate
            </Button>
          </div>

          {/* Quick Facts */}
          <div className="card p-5 space-y-3.5 text-sm">
            <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-ink-400">
              Overview
            </h3>
            <div>
              <span className="text-xs text-ink-400 block">Career Interest</span>
              <span className="font-medium text-ink flex items-center gap-1.5 mt-0.5">
                <Target className="w-4 h-4 text-brand" /> {talent.profile.learningGoal}
              </span>
            </div>
            {talent.profile.targetTimeframe && (
              <div>
                <span className="text-xs text-ink-400 block">Target Timeline</span>
                <span className="text-ink mt-0.5 block">{talent.profile.targetTimeframe}</span>
              </div>
            )}
            {talent.profile.education && (
              <div>
                <span className="text-xs text-ink-400 block">Education</span>
                <span className="text-ink flex items-center gap-1.5 mt-0.5">
                  <GraduationCap className="w-4 h-4 text-brand shrink-0" />{' '}
                  {talent.profile.education}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs text-ink-400 block">Weekly Commitment</span>
              <span className="text-ink mt-0.5 block">
                {talent.profile.availableHoursPerWeek} hours / week
              </span>
            </div>
          </div>

          {/* Endorsing Mentors */}
          {talent.approvedMentors.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-ink text-sm uppercase tracking-wider text-ink-400 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-brand" /> Mentored By
              </h3>
              <div className="space-y-2.5">
                {talent.approvedMentors.map((m) => (
                  <div key={m.user.id} className="flex items-center gap-3">
                    <img
                      src={m.user.avatar}
                      alt={m.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{m.user.name}</p>
                      <p className="text-[11px] text-ink-400 truncate">
                        {m.profile.professionalTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-ink mb-3">Professional Summary</h2>
            <p className="text-sm text-ink-400 leading-relaxed whitespace-pre-line">
              {talent.profile.bio || 'Passionate learner focused on modern software engineering.'}
            </p>
          </div>

          {/* Verified Skills */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" /> Technical Skills & Proficiency
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {talent.skills.map((s) => {
                const lvl = talent.profile.skillLevels[s.id] ?? 'beginner';
                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-ink-100 border border-ink-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-ink text-sm">{s.name}</span>
                      <span className="text-xs text-ink-400 block">{s.category}</span>
                    </div>
                    <Badge variant={levelColors[lvl]}>{lvl}</Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mentor Recommendations */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Star className="w-5 h-5 text-brand" /> Verified Mentor Recommendations
              </h2>
              <span className="badge bg-brand-900 text-brand-200 text-xs">
                {recommendations.length} Endorsement{recommendations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {recommendations.length === 0 ? (
              <p className="text-sm text-ink-400 py-3">
                No public recommendations have been endorsed yet for this student.
              </p>
            ) : (
              <div className="space-y-5">
                {recommendations.map((rec) => {
                  const mentor = getUserById(rec.mentorId);
                  const mentorProfile = getMentorProfile(rec.mentorId);
                  return (
                    <div
                      key={rec.id}
                      className="p-5 rounded-xl bg-ink-100 border border-ink-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={mentor?.avatar}
                            alt={mentor?.name ?? 'Mentor'}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <p className="font-semibold text-ink text-sm">
                              {mentor?.name ?? 'Verified Mentor'}
                            </p>
                            <p className="text-xs text-brand">
                              {mentorProfile?.professionalTitle ?? 'Industry Mentor'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-ink-400">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <blockquote className="text-sm text-ink-400 italic leading-relaxed border-l-2 border-brand pl-3">
                        "{rec.recommendation}"
                      </blockquote>

                      {rec.strengths.length > 0 && (
                        <div>
                          <span className="text-xs text-ink-400 font-medium block mb-1">
                            Key Strengths:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {rec.strengths.map((st) => (
                              <span key={st} className="badge bg-ink-200 text-ink-400 text-xs">
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.careerAreas.length > 0 && (
                        <div>
                          <span className="text-xs text-ink-400 font-medium block mb-1">
                            Recommended Roles:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {rec.careerAreas.map((area) => (
                              <span key={area} className="badge bg-brand-900 text-brand-200 text-xs">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Learning Milestones & Achievements */}
          {completedMilestones.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-brand" /> Completed Learning Milestones
              </h2>
              <div className="space-y-2.5 mt-4">
                {completedMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg bg-ink-100 border border-ink-200 flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{m.title}</p>
                      <p className="text-xs text-ink-400">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employer Contact Modal */}
      <Modal
        open={contactOpen}
        onClose={closeContact}
        title={contactSent ? 'Message Delivered' : `Connect with ${talent.user.name}`}
        size="md"
      >
        {contactSent ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-brand-900 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Request Successfully Sent</h3>
            <p className="text-sm text-ink-400 mb-6 max-w-sm mx-auto">
              We have forwarded your note directly to {talent.user.name}'s SkillSphere dashboard.
              They will review your inquiry and follow up via your email.
            </p>
            <Button onClick={closeContact}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleContact} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-ink-100 border border-ink-200">
              <img
                src={talent.user.avatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{talent.user.name}</p>
                <p className="text-xs text-brand truncate">{talent.profile.learningGoal}</p>
              </div>
            </div>

            <div>
              <label className="label">Your Name</label>
              <input
                className="input"
                placeholder="e.g. Sarah Jenkins"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Company / Organization</label>
              <input
                className="input"
                placeholder="e.g. Stripe, Flutterwave, TechCorp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Work Email</label>
              <input
                className="input"
                type="email"
                placeholder="e.g. sarah@company.com"
                value={employerEmail}
                onChange={(e) => setEmployerEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Message to Candidate</label>
              <textarea
                className="input min-h-28"
                placeholder="Describe your open role, company culture, or why you'd like to interview them..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={closeContact}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Send Candidate Inquiry <Sparkles className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PublicBrowseLayout>
  );
}

