'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MentorRatingSection } from '@/components/mentors/MentorRatingSection';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Bookmark, Calendar, Award, Briefcase, GraduationCap, MessageSquare, Globe, Linkedin, Github } from 'lucide-react';
import { MentorPublicCard } from '@/components/mentors/MentorPublicCard';
import {
  isMentorSaved,
  saveMentor,
  unsaveMentor,
  createSession,
} from '@/services/dataService';
import { getEligibleMentor } from '@/services/mentorProfileService';
import type { Mentor } from '@/types';

export function LearnerMentorDetailPage({ publicView = false }: { publicView?: boolean }) {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { show } = useToast();
  const [requestOpen, setRequestOpen] = useState(
    publicView && searchParams.get('request') === '1'
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingSummary, setRatingSummary] = useState<{ averageRating: number; totalReviews: number } | null>(null);

  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getEligibleMentor(id).then((nextMentor) => {
      if (active) {
        setMentor(nextMentor);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  if ((!publicView && !user) || !id) return null;

  if (loading) {
    const loadingView = <div className="py-20 text-center text-ink-400">Loading mentor profile...</div>;
    return publicView ? <PublicBrowseLayout title="Mentor Profile">{loadingView}</PublicBrowseLayout> : <DashboardLayout>{loadingView}</DashboardLayout>;
  }

  if (!mentor) {
    const notFound = (
      <div className="py-16 text-center">
        <p className="text-ink-400">Mentor not found or profile is not published yet.</p>
        <Link href={publicView ? '/mentors' : '/learner/mentors'}>
          <Button variant="secondary" className="mt-4">Back to mentors</Button>
        </Link>
      </div>
    );
    return publicView
      ? <PublicBrowseLayout title="Mentor Profile">{notFound}</PublicBrowseLayout>
      : <DashboardLayout>{notFound}</DashboardLayout>;
  }

  const saved = user ? isMentorSaved(user.id, id) : false;

  const handleSaveToggle = () => {
    if (!user || user.role !== 'learner') return;
    if (saved) {
      unsaveMentor(user.id, id);
      show('Mentor removed from saved.', 'info');
    } else {
      saveMentor(user.id, id);
      show('Mentor saved!', 'success');
    }
    setRefreshKey((k) => k + 1);
  };

  const handleRequestClick = () => {
    if (mentor?.profile.availability === 'unavailable') return;
    setRequestOpen(true);
  };

  const handleRequest = () => {
    if (!user || user.role !== 'learner' || user.id === id) return;
    if (mentor?.profile.availability === 'unavailable') {
      show('This mentor is currently unavailable and not accepting mentorship requests.', 'error');
      return;
    }
    if (!sessionTitle || !sessionDate) {
      show('Please fill in the session title and date.', 'error');
      return;
    }
    createSession({
      learnerId: user.id,
      mentorId: id,
      title: sessionTitle,
      description: sessionDesc,
      scheduledDate: new Date(sessionDate).toISOString(),
      durationMinutes: Number(sessionDuration),
      status: 'pending',
    });
    show('Mentorship request sent!', 'success');
    setRequestOpen(false);
    setSessionTitle('');
    setSessionDesc('');
    setSessionDate('');
    router.push('/learner/sessions');
  };

  const detailContent = (
    <div key={refreshKey}>
      <div className="mb-4">
        <Link href={publicView ? '/mentors' : '/learner/mentors'} className="text-sm text-ink-400 hover:text-brand-700 flex items-center gap-1">
          ← Back to mentors
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Automatic Public Profile Card following exact hierarchy */}
          <MentorPublicCard
            fullName={mentor.user.name}
            professionalHeadline={mentor.profile.professionalTitle}
            biography={mentor.profile.bio}
            avatarUrl={mentor.user.avatar || mentor.profile.avatarUrl}
            skills={mentor.skills}
            experienceYears={mentor.profile.experienceYears}
            learnerLevels={mentor.profile.learnerLevels || []}
            availability={mentor.profile.availability}
            rating={ratingSummary ? ratingSummary.averageRating : mentor.profile.rating}
            reviewCount={ratingSummary ? ratingSummary.totalReviews : mentor.profile.reviewCount}
          />

          {/* Mentorship Approach & Focus Areas */}
          {(mentor.profile.mentorshipApproach || (mentor.profile.mentorshipAreas && mentor.profile.mentorshipAreas.length > 0) || (mentor.profile.preferredFormats && mentor.profile.preferredFormats.length > 0)) && (
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-bold text-ink">Mentorship Approach & Focus Areas</h3>
              {mentor.profile.mentorshipApproach && (
                <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">
                  {mentor.profile.mentorshipApproach}
                </p>
              )}
              {mentor.profile.mentorshipAreas && mentor.profile.mentorshipAreas.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {mentor.profile.mentorshipAreas.map((area) => (
                      <Badge key={area} variant="gray">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {mentor.profile.preferredFormats && mentor.profile.preferredFormats.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">Preferred Formats</h4>
                  <div className="flex flex-wrap gap-2">
                    {mentor.profile.preferredFormats.map((fmt) => (
                      <Badge key={fmt} variant="outline">{fmt}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Experience & Credentials History */}
          {((mentor.profile.workExperience && mentor.profile.workExperience.length > 0) || (mentor.profile.educationHistory && mentor.profile.educationHistory.length > 0) || mentor.profile.education) && (
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-bold text-ink">Background & Credentials</h3>

              {mentor.profile.workExperience && mentor.profile.workExperience.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Career History
                  </h4>
                  <div className="space-y-3">
                    {mentor.profile.workExperience.map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-brand-500 pl-3 py-0.5">
                        <p className="text-sm font-semibold text-ink">{exp.title} {exp.company ? `at ${exp.company}` : ''}</p>
                        {exp.duration && <p className="text-xs text-ink-400">{exp.duration}</p>}
                        {exp.description && <p className="text-xs text-ink-600 mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(mentor.profile.educationHistory && mentor.profile.educationHistory.length > 0) ? (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Education
                  </h4>
                  <div className="space-y-2">
                    {mentor.profile.educationHistory.map((edu, idx) => (
                      <div key={idx} className="border-l-2 border-ink-200 pl-3 py-0.5">
                        <p className="text-sm font-semibold text-ink">{edu.degree}</p>
                        <p className="text-xs text-ink-400">{edu.institution} {edu.year ? `• ${edu.year}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : mentor.profile.education ? (
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Education
                  </h4>
                  <p className="text-sm text-ink-600 mt-1">{mentor.profile.education}</p>
                </div>
              ) : null}

              {mentor.profile.certifications && mentor.profile.certifications.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Award className="w-3.5 h-3.5" /> Certifications
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mentor.profile.certifications.map((cert) => (
                      <Badge key={cert} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Availability & Languages */}
          {((mentor.profile.availableDays && mentor.profile.availableDays.length > 0) || mentor.profile.timezone || (mentor.profile.languages && mentor.profile.languages.length > 0)) && (
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" /> Availability & Schedule
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {mentor.profile.availableDays && mentor.profile.availableDays.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1">Available Days</span>
                    <p className="font-medium text-ink">{mentor.profile.availableDays.join(', ')}</p>
                  </div>
                )}
                {mentor.profile.preferredTimeSlots && mentor.profile.preferredTimeSlots.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1">Time Slots</span>
                    <p className="font-medium text-ink">{mentor.profile.preferredTimeSlots.join(', ')}</p>
                  </div>
                )}
                {mentor.profile.timezone && (
                  <div>
                    <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1">Time Zone</span>
                    <p className="font-medium text-ink">{mentor.profile.timezone}</p>
                  </div>
                )}
                {mentor.profile.languages && mentor.profile.languages.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-1">Languages</span>
                    <p className="font-medium text-ink">{mentor.profile.languages.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Professional Links */}
          {(mentor.profile.linkedinUrl || mentor.profile.githubUrl || mentor.profile.portfolioUrl || mentor.profile.websiteUrl) && (
            <div className="card p-5">
              <h4 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">Professional Links</h4>
              <div className="flex flex-wrap gap-3">
                {mentor.profile.linkedinUrl && (
                  <a
                    href={mentor.profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn
                  </a>
                )}
                {mentor.profile.githubUrl && (
                  <a
                    href={mentor.profile.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Github className="w-3.5 h-3.5 text-ink-800" /> GitHub
                  </a>
                )}
                {mentor.profile.portfolioUrl && (
                  <a
                    href={mentor.profile.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" /> Portfolio
                  </a>
                )}
                {mentor.profile.websiteUrl && (
                  <a
                    href={mentor.profile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                  >
                    <Globe className="w-3.5 h-3.5 text-brand-600" /> Website
                  </a>
                )}
              </div>
            </div>
          )}

          <MentorRatingSection
            mentorId={mentor.user.id}
            mentorName={mentor.user.name}
            onRatingUpdated={(summary) =>
              setRatingSummary({
                averageRating: summary.averageRating,
                totalReviews: summary.totalReviews,
              })
            }
          />
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {mentor.profile.availability === 'available' && (
                <Badge variant="green"><Calendar className="w-3 h-3" /> Available • Accepting requests</Badge>
              )}
              {mentor.profile.availability === 'limited' && (
                <Badge variant="amber"><Calendar className="w-3 h-3" /> Limited availability</Badge>
              )}
              {mentor.profile.availability === 'unavailable' && (
                <Badge variant="red"><Calendar className="w-3 h-3" /> Unavailable • Not accepting requests</Badge>
              )}
            </div>
            <Button
              fullWidth
              size="lg"
              onClick={handleRequestClick}
              disabled={mentor.profile.availability === 'unavailable' || (!!user && (user.role !== 'learner' || user.id === id))}
            >
              {mentor.profile.availability === 'unavailable' ? 'Currently Unavailable' : 'Request Mentorship'}
            </Button>
            {mentor.profile.availability === 'unavailable' && (
              <p className="text-xs text-red-400 mt-2.5 text-center">
                This mentor is not currently accepting mentorship requests.
              </p>
            )}
            {user?.role === 'learner' && (
              <Button variant="secondary" fullWidth className="mt-3" onClick={handleSaveToggle}>
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-brand text-brand' : ''}`} />
                {saved ? 'Saved' : 'Save Mentor'}
              </Button>
            )}
            {user?.role === 'learner' && user.id !== id && (
              <Link href={`/learner/messages?mentorId=${id}`} className="block mt-3">
                <Button variant="secondary" fullWidth className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand" />
                  Message Mentor
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Request Mentorship Session">
        {!user ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-400">
              Create an account or sign in to connect with this mentor and request a mentorship session.
            </p>
            <div className="flex gap-3">
              <Link href={`/login?next=${encodeURIComponent(`/mentors/${id}?request=1`)}`} className="flex-1">
                <Button fullWidth>Sign In</Button>
              </Link>
              <Link href={`/register?next=${encodeURIComponent(`/mentors/${id}?request=1`)}`} className="flex-1">
                <Button variant="secondary" fullWidth>Create Account</Button>
              </Link>
            </div>
            <Button variant="ghost" fullWidth onClick={() => setRequestOpen(false)}>Return to Mentor Profile</Button>
          </div>
        ) : user.role !== 'learner' || user.id === id ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-400">
              {user.id === id ? 'You cannot request a mentorship session from your own profile.' : 'Only learners can request mentorship sessions.'}
            </p>
            <Button variant="secondary" fullWidth onClick={() => setRequestOpen(false)}>Return to Mentor Profile</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-400">Request a mentorship session with {mentor.user.name}. They&apos;ll review and accept or decline your request.</p>
            <Input label="Session title" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="e.g., React Component Architecture" />
            <Textarea label="What do you want to cover?" rows={3} value={sessionDesc} onChange={(e) => setSessionDesc(e.target.value)} placeholder="Describe what you'd like to learn or discuss..." />
            <Input label="Preferred date & time" type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            <Select label="Duration" value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)}>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">2 hours</option>
            </Select>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button fullWidth onClick={handleRequest}>Send Request</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  return publicView
    ? <PublicBrowseLayout title="Mentor Profile">{detailContent}</PublicBrowseLayout>
    : <DashboardLayout key={refreshKey}>{detailContent}</DashboardLayout>;
}
