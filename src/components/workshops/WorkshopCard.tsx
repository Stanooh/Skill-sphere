'use client';

import Link from 'next/link';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import type { Workshop } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getSkillById, getMentor } from '@/services/dataService';

export function WorkshopCard({
  workshop,
  isRegistered,
  onRegisterToggle,
  showMentor = true,
}: {
  workshop: Workshop;
  isRegistered?: boolean;
  onRegisterToggle?: () => void;
  showMentor?: boolean;
}) {
  const skill = getSkillById(workshop.skillId);
  const mentor = getMentor(workshop.mentorId);
  const spotsLeft = workshop.capacity - workshop.registeredLearnerIds.length;
  const isFull = spotsLeft <= 0;

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        {skill && <Badge variant="brand">{skill.name}</Badge>}
        {workshop.status === 'published' && <Badge variant="green">Upcoming</Badge>}
        {workshop.status === 'completed' && <Badge variant="gray">Completed</Badge>}
      </div>

      <h3 className="font-semibold text-ink mb-2">{workshop.title}</h3>
      <p className="text-sm text-ink-400 mb-4 line-clamp-2">{workshop.description}</p>

      {showMentor && mentor && (
        <Link href={`/learner/mentors/${mentor.user.id}`} className="flex items-center gap-2 mb-3 group">
          <img src={mentor.user.avatar} alt={mentor.user.name} className="w-7 h-7 rounded-full" />
          <span className="text-sm text-ink-500 group-hover:text-brand-700">{mentor.user.name}</span>
        </Link>
      )}

      <div className="space-y-1.5 mb-4 text-sm text-ink-400">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" /> {new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" /> {workshop.durationMinutes} minutes
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" /> {workshop.registeredLearnerIds.length}/{workshop.capacity} registered
        </div>
      </div>

      {onRegisterToggle && (
        <div className="mt-auto">
          {workshop.status === 'completed' ? (
            <Badge variant="gray">Workshop completed</Badge>
          ) : isRegistered ? (
            <Button variant="secondary" fullWidth onClick={onRegisterToggle}>
              Unregister
            </Button>
          ) : isFull ? (
            <Button variant="secondary" fullWidth disabled>
              Workshop Full
            </Button>
          ) : (
            <Button fullWidth onClick={onRegisterToggle}>
              Register
            </Button>
          )}
        </div>
      )}
      {spotsLeft <= 3 && spotsLeft > 0 && workshop.status === 'published' && (
        <p className="text-xs text-amber-600 mt-2">Only {spotsLeft} spots left</p>
      )}
    </div>
  );
}
