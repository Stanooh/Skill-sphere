'use client';

import Image from 'next/image';
import { Avatar } from '@/components/ui/Avatar';
import { CheckCircle2, Code2, Briefcase, Users, Star, Eye } from 'lucide-react';

export interface MentorPublicCardProps {
  fullName: string;
  professionalHeadline: string;
  biography: string;
  avatarUrl?: string | null;
  skills: Array<{ id: string; name: string }>;
  experienceYears: number;
  learnerLevels: string[];
  rating?: number;
  reviewCount?: number;
  isPreview?: boolean;
  className?: string;
}

export function MentorPublicCard({
  fullName,
  professionalHeadline,
  biography,
  avatarUrl,
  skills,
  experienceYears,
  learnerLevels,
  rating = 0,
  reviewCount = 0,
  isPreview = false,
  className = '',
}: MentorPublicCardProps) {
  // Format learner levels e.g. "Beginner – Intermediate"
  const formattedLevels =
    learnerLevels && learnerLevels.length > 0
      ? learnerLevels.join(' – ')
      : 'All levels';

  return (
    <div className={`card p-6 sm:p-8 rounded-2xl bg-white border border-ink-100 shadow-sm max-w-2xl w-full ${className}`}>
      {/* Header: Photo + Name + Headline + Verified Badge */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 bg-ink-50 border border-ink-100">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 112px, 128px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-ink-100">
              <Avatar name={fullName || 'Mentor'} size="xl" className="w-full h-full rounded-2xl text-2xl font-bold" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#273339] tracking-tight truncate">
            {fullName || 'Mentor Name'}
          </h2>
          <p className="text-base sm:text-lg text-ink-500 font-medium mt-1 truncate">
            {professionalHeadline || 'Full-Stack Developer & Mentor'}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e6f7ef] text-[#107544] text-xs sm:text-sm font-semibold border border-[#bbf0d6]">
            <CheckCircle2 className="w-4 h-4 text-[#107544] fill-[#bbf0d6]" />
            <span>Verified mentor</span>
          </div>
        </div>
      </div>

      {/* Biography */}
      <p className="text-[#273339]/80 leading-relaxed text-sm sm:text-base my-6 whitespace-pre-line">
        {biography || 'I help aspiring developers build practical skills through hands-on guidance and structured learning.'}
      </p>

      {/* Expertise */}
      <div className="mb-6">
        <div className="flex items-center gap-2 font-bold text-[#273339] text-base sm:text-lg mb-3">
          <Code2 className="w-5 h-5 text-[#3770FF]" />
          <span>Expertise</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills && skills.length > 0 ? (
            skills.map((skill) => (
              <span
                key={skill.id || skill.name}
                className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-[#EBF2FF] text-[#3770FF]"
              >
                {skill.name}
              </span>
            ))
          ) : (
            <span className="text-sm text-ink-400 italic">No verified skills selected</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <hr className="border-ink-100 my-6" />

      {/* Experience, Learner level, Rating */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-ink-500 font-medium text-sm sm:text-base">
            <Briefcase className="w-5 h-5 text-ink-400 shrink-0" />
            <span>Experience</span>
          </div>
          <span className="font-bold text-[#273339] text-sm sm:text-base">
            {experienceYears > 0 ? `${experienceYears} ${experienceYears === 1 ? 'year' : 'years'}` : '0 years'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-ink-500 font-medium text-sm sm:text-base">
            <Users className="w-5 h-5 text-ink-400 shrink-0" />
            <span>Learner level</span>
          </div>
          <span className="font-bold text-[#273339] text-sm sm:text-base">
            {formattedLevels}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-ink-500 font-medium text-sm sm:text-base">
            <Star className="w-5 h-5 text-ink-400 shrink-0" />
            <span>Rating</span>
          </div>
          <span className="font-bold text-[#273339] text-sm sm:text-base">
            {reviewCount > 0 ? `${rating.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})` : 'No ratings yet'}
          </span>
        </div>
      </div>

      {/* Preview indicator banner */}
      {isPreview && (
        <div className="bg-[#EBF2FF] border border-[#d4e3ff] rounded-2xl p-3.5 text-center mt-6">
          <div className="font-semibold text-[#3770FF] flex items-center justify-center gap-1.5 text-sm">
            <Eye className="w-4 h-4" />
            <span>Profile preview</span>
          </div>
          <p className="text-xs text-[#3770FF]/80 italic mt-0.5">
            Illustrative example, not an actual SkillSphere account.
          </p>
        </div>
      )}
    </div>
  );
}
