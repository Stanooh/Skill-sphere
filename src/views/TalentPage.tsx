'use client';

import { useState, useMemo } from 'react';
import { Search, MapPin, GraduationCap, Target, Mail, ArrowRight, Briefcase, X } from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { searchTalent, getTalentSkills, createEmployerContactRequest } from '@/services/talentService';
import type { TalentProfile } from '@/types';

const levelColors: Record<string, 'gray' | 'green' | 'amber' | 'brand'> = {
  beginner: 'gray',
  intermediate: 'green',
  advanced: 'amber',
  expert: 'brand',
};

export function TalentPage() {
  const [query, setQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [selectedTalent, setSelectedTalent] = useState<TalentProfile | null>(null);
  const [contactSent, setContactSent] = useState(false);

  const [employerName, setEmployerName] = useState('');
  const [employerEmail, setEmployerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');

  const skills = useMemo(() => getTalentSkills(), []);
  const results = useMemo(() => searchTalent(query, selectedSkill || undefined), [query, selectedSkill]);

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTalent) return;
    if (!employerName.trim() || !employerEmail.trim() || !companyName.trim() || !message.trim()) return;

    const result = createEmployerContactRequest({
      learnerId: selectedTalent.user.id,
      employerName: employerName.trim(),
      employerEmail: employerEmail.trim(),
      companyName: companyName.trim(),
      message: message.trim(),
    });

    if (result) {
      setContactSent(true);
    }
  };

  const closeModal = () => {
    setSelectedTalent(null);
    setContactSent(false);
    setEmployerName('');
    setEmployerEmail('');
    setCompanyName('');
    setMessage('');
  };

  return (
    <PublicBrowseLayout
      title="Find Talent"
      description="Browse skilled learners endorsed by verified mentors. Connect with candidates without creating an account."
    >
      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            className="input pl-10"
            placeholder="Search by name, skill, goal, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={selectedSkill}
          onChange={(e) => setSelectedSkill(e.target.value)}
        >
          <option value="">All skills</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {(query || selectedSkill) && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-ink-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => { setQuery(''); setSelectedSkill(''); }}
            className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <div className="card p-8 text-center text-ink-400">
          No candidates found. Try a different search or skill filter.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((talent) => (
            <div key={talent.user.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <img src={talent.user.avatar} alt={talent.user.name} className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink truncate">{talent.user.name}</h3>
                  <p className="text-sm text-ink-400 flex items-center gap-1 mt-0.5">
                    <Target className="w-3 h-3" /> {talent.profile.learningGoal}
                  </p>
                  <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {talent.profile.location}
                  </p>
                </div>
              </div>

              <p className="text-sm text-ink-400 mb-3 line-clamp-2">{talent.profile.bio}</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {talent.skills.slice(0, 5).map((s) => (
                  <Badge key={s.id} variant={levelColors[talent.profile.skillLevels[s.id] ?? 'beginner'] ?? 'gray'}>
                    {s.name}
                  </Badge>
                ))}
                {talent.skills.length > 5 && (
                  <Badge variant="outline">+{talent.skills.length - 5}</Badge>
                )}
              </div>

              {talent.approvedMentors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-ink-400 mb-1.5 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Endorsed by {talent.approvedMentors.length} mentor{talent.approvedMentors.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {talent.approvedMentors.map((m) => (
                      <span key={m.user.id} className="text-xs text-brand-300 bg-brand-900 px-2 py-0.5 rounded">
                        {m.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-2">
                <Button variant="secondary" fullWidth onClick={() => setSelectedTalent(talent)}>
                  <Mail className="w-4 h-4" /> Contact Candidate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact modal */}
      <Modal
        open={selectedTalent !== null}
        onClose={closeModal}
        title={contactSent ? 'Request Sent' : 'Contact Candidate'}
        size="md"
      >
        {contactSent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-brand-900 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Your request has been sent</h3>
            <p className="text-sm text-ink-400 mb-6">
              We've notified {selectedTalent?.user.name} of your interest. They'll review your message and respond if there's a fit.
            </p>
            <Button onClick={closeModal}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleContact} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-ink-100 mb-2">
              <img src={selectedTalent?.user.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-medium text-ink">{selectedTalent?.user.name}</p>
                <p className="text-xs text-ink-400">{selectedTalent?.profile.learningGoal}</p>
              </div>
            </div>

            <label className="label">Your name
              <input className="input mt-1.5" value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="Jane Doe" required />
            </label>
            <label className="label">Work email
              <input className="input mt-1.5" type="email" value={employerEmail} onChange={(e) => setEmployerEmail(e.target.value)} placeholder="jane@company.com" required />
            </label>
            <label className="label">Company name
              <input className="input mt-1.5" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." required />
            </label>
            <label className="label">Message
              <textarea className="input mt-1.5 min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell the candidate about the role, opportunity, or project..." required />
            </label>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" className="flex-1">
                Send Request <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PublicBrowseLayout>
  );
}
