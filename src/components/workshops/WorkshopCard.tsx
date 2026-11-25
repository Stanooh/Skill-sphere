'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Users, ExternalLink } from 'lucide-react';
import type { Workshop } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { WorkshopCoverImage } from '@/components/workshops/WorkshopCoverImage';
import { getSkillById, getMentor } from '@/services/dataService';

export function WorkshopCard({
  workshop,
  isRegistered,
  onRegisterToggle,
  showMentor = true,
  publicView = false,
}: {
  workshop: Workshop;
  isRegistered?: boolean;
  onRegisterToggle?: () => void;
  showMentor?: boolean;
  publicView?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const skill = getSkillById(workshop.skillId);
  const fallbackMentor = getMentor(workshop.mentorId);
  const mentorName = workshop.mentorName || fallbackMentor?.user.name;
  const mentorAvatar = workshop.mentorAvatar || fallbackMentor?.user.avatar;
  const mentorTitle = workshop.mentorTitle || fallbackMentor?.profile.professionalTitle;
  const spotsLeft = workshop.capacity - workshop.registeredLearnerIds.length;
  const isFull = spotsLeft <= 0;

  return (
    <>
      <div className="card group overflow-hidden hover:shadow-card-hover transition-all duration-200 flex flex-col">
        <WorkshopCoverImage src={workshop.coverImage} alt={workshop.title} />

        <div className="p-5 flex flex-col flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {skill && <Badge variant="brand">{skill.name}</Badge>}
            {workshop.status === 'published' && <Badge variant="green">Upcoming</Badge>}
            {workshop.status === 'completed' && <Badge variant="gray">Completed</Badge>}
            {workshop.format && (
              <Badge variant="outline">{workshop.format === 'in_person' ? 'In person' : 'Online'}</Badge>
            )}
          </div>

          <h3 className="font-semibold text-ink text-base mb-1.5 line-clamp-2">{workshop.title}</h3>
          <p className="text-sm text-ink-400 mb-4 line-clamp-2">{workshop.description}</p>

          {showMentor && mentorName && (
            <Link
              href={publicView ? `/mentors/${workshop.mentorId}` : `/learner/mentors/${workshop.mentorId}`}
              className="flex items-center gap-2.5 mb-4 group/mentor"
            >
              <Avatar src={mentorAvatar} name={mentorName} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink group-hover/mentor:text-brand truncate">{mentorName}</p>
                {mentorTitle && <p className="text-xs text-ink-400 truncate">{mentorTitle}</p>}
              </div>
            </Link>
          )}

          <div className="space-y-1.5 mb-4 text-sm text-ink-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>
                {new Date(workshop.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {workshop.startTime ? ` • ${workshop.startTime}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" /> {workshop.durationMinutes} minutes
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" /> {workshop.registeredLearnerIds.length}/{workshop.capacity} registered
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" fullWidth onClick={() => setDetailsOpen(true)}>
                View Details
              </Button>
              {onRegisterToggle && (
                workshop.status === 'completed' ? null : isRegistered ? (
                  <Button variant="secondary" size="sm" fullWidth onClick={onRegisterToggle}>
                    Unregister
                  </Button>
                ) : isFull ? (
                  <Button variant="secondary" size="sm" fullWidth disabled>
                    Full
                  </Button>
                ) : (
                  <Button size="sm" fullWidth onClick={onRegisterToggle}>
                    Register
                  </Button>
                )
              )}
              {publicView && !onRegisterToggle && (
                <Link href="/register" className="w-full">
                  <Button size="sm" fullWidth>Sign up</Button>
                </Link>
              )}
            </div>
            {spotsLeft <= 3 && spotsLeft > 0 && workshop.status === 'published' && (
              <p className="text-xs text-amber-600">Only {spotsLeft} spots left</p>
            )}
          </div>
        </div>
      </div>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title={workshop.title} size="lg">
        <div className="space-y-4">
          <WorkshopCoverImage src={workshop.coverImage} alt={workshop.title} className="rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {skill && <Badge variant="brand">{skill.name}</Badge>}
            <Badge variant={workshop.status === 'published' ? 'green' : 'gray'}>
              {workshop.status === 'published' ? 'Upcoming' : workshop.status}
            </Badge>
            {workshop.format && (
              <Badge variant="outline">{workshop.format === 'in_person' ? 'In person' : 'Online'}</Badge>
            )}
          </div>
          <p className="text-sm text-ink-500 whitespace-pre-line">{workshop.description}</p>
          {mentorName && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-50">
              <Avatar src={mentorAvatar} name={mentorName} size="sm" />
              <div>
                <p className="text-sm font-semibold text-ink">{mentorName}</p>
                {mentorTitle && <p className="text-xs text-ink-400">{mentorTitle}</p>}
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3 text-sm text-ink-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {workshop.startTime ? ` ${workshop.startTime}` : ''}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> {workshop.durationMinutes} min
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" /> {workshop.registeredLearnerIds.length}/{workshop.capacity} enrolled
            </div>
          </div>
          {workshop.meetingLink && isRegistered && (
            <a
              href={workshop.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> Join Workshop Link
            </a>
          )}
        </div>
      </Modal>
    </>
  );
}
