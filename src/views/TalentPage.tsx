'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  MapPin,
  GraduationCap,
  Target,
  Mail,
  ArrowRight,
  X,
  Star,
} from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  searchTalentWithOptions,
  getTalentSkills,
  createEmployerContactRequest,
} from '@/services/talentService';
import { getAcceptedRecommendationsForStudent } from '@/services/recommendationService';
import type { TalentProfile, SkillLevel } from '@/types';

const levelColors: Record<SkillLevel, 'gray' | 'green' | 'amber' | 'brand'> = {
  beginner: 'gray',
  intermediate: 'green',
  advanced: 'amber',
  expert: 'brand',
};

const CAREER_AREAS = [
  'All Career Areas',
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'UI/UX Designer',
  'Data Analyst',
];

export function TalentPage() {
  const [query, setQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [selectedCareerArea, setSelectedCareerArea] = useState<string>('All Career Areas');
  const [sortBy, setSortBy] = useState<'recent' | 'skills' | 'recommended'>('recent');

  const [selectedTalent, setSelectedTalent] = useState<TalentProfile | null>(null);
  const [contactSent, setContactSent] = useState(false);

  const [employerName, setEmployerName] = useState('');
  const [employerEmail, setEmployerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');

  const skills = useMemo(() => getTalentSkills(), []);

  const results = useMemo(() => {
    return searchTalentWithOptions({
      query: query || undefined,
      skillId: selectedSkill || undefined,
      careerArea: selectedCareerArea !== 'All Career Areas' ? selectedCareerArea : undefined,
      sortBy,
    });
  }, [query, selectedSkill, selectedCareerArea, sortBy]);

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTalent) return;
    if (!employerName.trim() || !employerEmail.trim() || !companyName.trim() || !message.trim()) return;

    createEmployerContactRequest({
      learnerId: selectedTalent.user.id,
      employerName: employerName.trim(),
      employerEmail: employerEmail.trim(),
      companyName: companyName.trim(),
      message: message.trim(),
    });

    setContactSent(true);
  };

  const closeModal = () => {
    setSelectedTalent(null);
    setContactSent(false);
    setEmployerName('');
    setEmployerEmail('');
    setCompanyName('');
    setMessage('');
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedSkill('');
    setSelectedCareerArea('All Career Areas');
    setSortBy('recent');
  };

  const isFiltered = query !== '' || selectedSkill !== '' || selectedCareerArea !== 'All Career Areas' || sortBy !== 'recent';

  return (
    <PublicBrowseLayout
      title="Discover Emerging Talent"
      description="Connect with skilled and motivated individuals developing their careers through SkillSphere's learning and mentorship community."
    >
      {/* Search and Filters Header */}
      <div className="card p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Query input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
            <input
              className="input pl-10"
              placeholder="Search by candidate name, role, headline, or skill..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Skill Filter */}
          <div className="md:col-span-3">
            <select
              className="input"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
            >
              <option value="">All Technical Skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Career Area Filter */}
          <div className="md:col-span-2">
            <select
              className="input"
              value={selectedCareerArea}
              onChange={(e) => setSelectedCareerArea(e.target.value)}
            >
              {CAREER_AREAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'skills' | 'recommended')}
            >
              <option value="recent">Recently Added</option>
              <option value="recommended">Most Recommended</option>
              <option value="skills">Skill Matches</option>
            </select>
          </div>
        </div>

        {isFiltered && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-ink-100">
            <span className="text-ink-400">
              Showing {results.length} candidate{results.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearFilters}
              className="text-brand-300 hover:text-brand-200 flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" /> Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Candidates List */}
      {results.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <GraduationCap className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-ink mb-1">No matching candidates found</h3>
          <p className="text-sm text-ink-400 mb-5">
            Only students who have made their profile public to employers appear here. Try adjusting your
            search terms or clearing your filters.
          </p>
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((talent) => {
            const acceptedRecs = getAcceptedRecommendationsForStudent(talent.user.id);
            const firstRec = acceptedRecs[0];

            return (
              <div
                key={talent.user.id}
                className="card p-6 flex flex-col justify-between hover:border-ink-100 transition-all duration-150"
              >
                <div>
                  {/* Top: Avatar, Name & Headline */}
                  <div className="flex items-start gap-3.5 mb-4">
                    {talent.user.avatar && (
                      <Image
                        src={talent.user.avatar}
                        alt={talent.user.name}
                        width={56}
                        height={56}
                        unoptimized
                        className="w-14 h-14 rounded-full ring-2 ring-brand/30 object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-ink text-base truncate">{talent.user.name}</h3>
                      <p className="text-xs font-medium text-brand truncate flex items-center gap-1 mt-0.5">
                        <Target className="w-3 h-3 shrink-0" /> {talent.profile.learningGoal}
                      </p>
                      <p className="text-xs text-ink-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {talent.profile.location}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-ink-400 mb-4 line-clamp-2 leading-relaxed">
                    {talent.profile.bio}
                  </p>

                  {/* Skills badges */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {talent.skills.slice(0, 4).map((s) => {
                        const lvl = talent.profile.skillLevels[s.id] ?? 'beginner';
                        return (
                          <Badge key={s.id} variant={levelColors[lvl]}>
                            {s.name}
                          </Badge>
                        );
                      })}
                      {talent.skills.length > 4 && (
                        <Badge variant="outline">+{talent.skills.length - 4}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Mentor Recommendation Highlights */}
                  {acceptedRecs.length > 0 && (
                    <div className="p-3 rounded-lg bg-ink-100 border border-ink-200 mb-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-brand-200">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-brand" /> Mentor Endorsed
                        </span>
                        <span className="text-[11px] text-ink-400">
                          {acceptedRecs.length} review{acceptedRecs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {firstRec && (
                        <p className="text-xs text-ink-400 italic line-clamp-2">
                          &quot;{firstRec.recommendation}&quot;
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions: View Profile & Contact */}
                <div className="pt-3 border-t border-ink-100 flex gap-2">
                  <Link href={`/talent/${talent.user.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" fullWidth>
                      View Profile
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedTalent(talent)}
                  >
                    <Mail className="w-3.5 h-3.5" /> Contact
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Employer Contact Modal */}
      <Modal
        open={selectedTalent !== null}
        onClose={closeModal}
        title={contactSent ? 'Inquiry Sent' : `Contact ${selectedTalent?.user.name}`}
        size="md"
      >
        {contactSent ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-brand-900 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">Your inquiry has been delivered</h3>
            <p className="text-sm text-ink-400 mb-6 max-w-sm mx-auto">
              We notified {selectedTalent?.user.name} through their SkillSphere dashboard. They will
              review your details and reply via your email address.
            </p>
            <Button onClick={closeModal}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleContact} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-ink-100 border border-ink-200">
              {selectedTalent?.user.avatar && (
                <Image
                  src={selectedTalent.user.avatar}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{selectedTalent?.user.name}</p>
                <p className="text-xs text-brand truncate">
                  {selectedTalent?.profile.learningGoal}
                </p>
              </div>
            </div>

            <div>
              <label className="label">Your Name</label>
              <input
                className="input"
                placeholder="e.g. Alex Morgan"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Company / Organization</label>
              <input
                className="input"
                placeholder="e.g. Acme Tech, Stripe"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Professional Email</label>
              <input
                className="input"
                type="email"
                placeholder="e.g. alex@acme.com"
                value={employerEmail}
                onChange={(e) => setEmployerEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Message to Candidate</label>
              <textarea
                className="input min-h-24"
                placeholder="Share details about the role, opportunity, or what impressed you about their profile..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Send Candidate Inquiry <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PublicBrowseLayout>
  );
}
