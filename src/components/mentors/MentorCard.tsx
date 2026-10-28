'use client';

import Link from 'next/link';
import { Star, MapPin, Bookmark, Calendar } from 'lucide-react';
import type { Mentor, MentorRecommendation } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PublicTrustIndicators } from '@/components/verification/VerificationComponents';

export function MentorCard({
  mentor,
  matchPercentage,
  matchingSkills,
  isSaved,
  onSaveToggle,
}: {
  mentor: Mentor;
  matchPercentage?: number;
  matchingSkills?: { name: string }[];
  isSaved?: boolean;
  onSaveToggle?: () => void;
}) {
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200 flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <Avatar src={mentor.user.avatar} name={mentor.user.name} size="lg" />
        <div className="flex-1 min-w-0">
          <Link href={`/learner/mentors/${mentor.user.id}`} className="hover:text-brand-700">
            <h3 className="font-semibold text-ink truncate">{mentor.user.name}</h3>
          </Link>
          <p className="text-sm text-ink-400 truncate">{mentor.profile.professionalTitle}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {mentor.profile.location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {mentor.profile.rating} ({mentor.profile.reviewCount})
            </span>
          </div>
        </div>
        {matchPercentage !== undefined && (
          <div className="text-right shrink-0">
            <div className={`text-2xl font-bold ${matchPercentage >= 80 ? 'text-brand' : 'text-ink'}`}>
              {matchPercentage}%
            </div>
            <div className="text-xs text-ink-400">Skill Match</div>
          </div>
        )}
      </div>

      <div className="mb-3"><PublicTrustIndicators mentorId={mentor.user.id} /></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {mentor.skills.slice(0, 5).map((skill) => (
          <Badge key={skill.id} variant={matchingSkills?.some((ms) => ms.name === skill.name) ? 'brand' : 'gray'}>
            {skill.name}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {mentor.profile.availability === 'available' && (
          <Badge variant="green"><Calendar className="w-3 h-3" /> Available this week</Badge>
        )}
        {mentor.profile.availability === 'limited' && (
          <Badge variant="amber"><Calendar className="w-3 h-3" /> Limited availability</Badge>
        )}
        {mentor.profile.availability === 'unavailable' && (
          <Badge variant="red"><Calendar className="w-3 h-3" /> Currently unavailable</Badge>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Link href={`/learner/mentors/${mentor.user.id}`} className="flex-1">
          <Button variant="secondary" fullWidth>View Profile</Button>
        </Link>
        {onSaveToggle && (
          <Button variant="ghost" onClick={onSaveToggle} className="px-3">
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-brand text-brand' : 'text-ink-400'}`} />
          </Button>
        )}
      </div>
    </div>
  );
}

export function MentorMatchBadge({ percentage }: { percentage: number }) {
  const color = percentage >= 80 ? 'bg-brand text-white' : percentage >= 50 ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-600';
  return (
    <span className={`badge ${color} font-semibold`}>
      {percentage}% Match
    </span>
  );
}
