'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PublicTrustIndicators } from '@/components/verification/VerificationComponents';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Star, MapPin, Bookmark, Calendar, Award, Briefcase, GraduationCap } from 'lucide-react';
import {
  getMentor,
  isMentorSaved,
  saveMentor,
  unsaveMentor,
  createSession,
} from '@/services/dataService';

export function LearnerMentorDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const [requestOpen, setRequestOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('60');

  if (!user || !id) return null;
  const mentor = getMentor(id);
  if (!mentor) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p className="text-ink-400">Mentor not found.</p>
          <Link href="/learner/mentors"><Button variant="secondary" className="mt-4">Back to mentors</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const saved = isMentorSaved(user.id, id);

  const handleSaveToggle = () => {
    if (saved) {
      unsaveMentor(user.id, id);
      show('Mentor removed from saved.', 'info');
    } else {
      saveMentor(user.id, id);
      show('Mentor saved!', 'success');
    }
    setRefreshKey((k) => k + 1);
  };

  const handleRequest = () => {
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

  return (
    <DashboardLayout key={refreshKey}>
      <div className="mb-4">
        <Link href="/learner/mentors" className="text-sm text-ink-400 hover:text-brand-700 flex items-center gap-1">
          ← Back to mentors
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-6">
              <Avatar src={mentor.user.avatar} name={mentor.user.name} size="xl" />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-ink">{mentor.user.name}</h1>
                <p className="text-ink-400">{mentor.profile.professionalTitle}</p>
                <div className="mt-2"><PublicTrustIndicators mentorId={mentor.user.id} limitSkills={8} /></div>
                <div className="flex items-center gap-4 mt-2 text-sm text-ink-400">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {mentor.profile.location}</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {mentor.profile.rating} ({mentor.profile.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-ink-600 leading-relaxed mb-6">{mentor.profile.bio}</p>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-ink mb-3">Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {mentor.skills.map((skill) => (
                  <Badge key={skill.id} variant="brand">{skill.name}</Badge>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-ink-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-ink">Experience</p>
                  <p className="text-sm text-ink-400">{mentor.profile.experienceYears} years</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-ink-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-ink">Education</p>
                  <p className="text-sm text-ink-400">{mentor.profile.education}</p>
                </div>
              </div>
            </div>

            {mentor.profile.certifications.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2"><Award className="w-4 h-4" /> Certifications</h3>
                <div className="flex flex-wrap gap-2">
                  {mentor.profile.certifications.map((cert) => (
                    <Badge key={cert} variant="outline">{cert}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-ink mb-2">Mentorship Areas</h3>
              <div className="flex flex-wrap gap-2">
                {mentor.profile.mentorshipAreas.map((area) => (
                  <Badge key={area} variant="gray">{area}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              {mentor.profile.availability === 'available' && <Badge variant="green"><Calendar className="w-3 h-3" /> Available this week</Badge>}
              {mentor.profile.availability === 'limited' && <Badge variant="amber"><Calendar className="w-3 h-3" /> Limited availability</Badge>}
              {mentor.profile.availability === 'unavailable' && <Badge variant="red"><Calendar className="w-3 h-3" /> Unavailable</Badge>}
            </div>
            <Button
              fullWidth
              size="lg"
              onClick={() => setRequestOpen(true)}
              disabled={mentor.profile.availability === 'unavailable'}
            >
              Request Mentorship
            </Button>
            <Button variant="secondary" fullWidth className="mt-3" onClick={handleSaveToggle}>
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-brand text-brand' : ''}`} />
              {saved ? 'Saved' : 'Save Mentor'}
            </Button>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-3">Reviews</h3>
            <div className="space-y-3">
              {[
                { name: 'Grace Achieng', rating: 5, text: 'Sarah is an excellent mentor. She helped me understand React patterns I was struggling with.' },
                { name: 'Kevin Omondi', rating: 5, text: 'Very patient and knowledgeable. Our sessions were always productive.' },
              ].map((review, idx) => (
                <div key={idx} className="border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-ink">{review.name}</span>
                    <div className="flex">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-ink-400">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="Request Mentorship Session">
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
      </Modal>
    </DashboardLayout>
  );
}
