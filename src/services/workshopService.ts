import {
  createWorkshop,
  deleteWorkshop,
  getWorkshopById,
  getWorkshops,
  getWorkshopsForMentor,
  isApprovedMentor,
  registerForWorkshop,
  unregisterFromWorkshop,
  updateWorkshop,
} from '@/services/dataService';
import type { Workshop, WorkshopStatus } from '@/types';

export type WorkshopInput = Omit<Workshop, 'id' | 'mentorId' | 'registeredLearnerIds' | 'status'>;

function requireApprovedMentor(mentorId: string): void {
  if (!isApprovedMentor(mentorId)) {
    throw new Error('Only approved mentors can manage workshops.');
  }
}

function requireOwnedWorkshop(mentorId: string, workshopId: string): Workshop {
  requireApprovedMentor(mentorId);
  const workshop = getWorkshopById(workshopId);
  if (!workshop || workshop.mentorId !== mentorId) {
    throw new Error('Workshop not found.');
  }
  return workshop;
}

export function getMentorWorkshops(mentorId: string): Workshop[] {
  return getWorkshopsForMentor(mentorId);
}

export function getLearnerWorkshops(): Workshop[] {
  return getWorkshops().filter((w) => w.status === 'published' || w.status === 'completed');
}

export function saveMentorWorkshop(mentorId: string, input: WorkshopInput, workshopId?: string): Workshop {
  requireApprovedMentor(mentorId);
  if (!workshopId) {
    return createWorkshop({ ...input, mentorId, status: 'draft' });
  }
  const existing = requireOwnedWorkshop(mentorId, workshopId);
  if (input.capacity < existing.registeredLearnerIds.length) {
    throw new Error(`Capacity cannot be lower than the ${existing.registeredLearnerIds.length} learners already registered.`);
  }
  const updated = updateWorkshop(workshopId, input);
  if (!updated) throw new Error('Workshop not found.');
  return updated;
}

export function setMentorWorkshopStatus(
  mentorId: string,
  workshopId: string,
  status: Extract<WorkshopStatus, 'draft' | 'published' | 'cancelled'>
): Workshop {
  requireOwnedWorkshop(mentorId, workshopId);
  const updated = updateWorkshop(workshopId, { status });
  if (!updated) throw new Error('Workshop not found.');
  return updated;
}

export function removeMentorWorkshop(mentorId: string, workshopId: string): void {
  const workshop = requireOwnedWorkshop(mentorId, workshopId);
  if (workshop.registeredLearnerIds.length > 0) {
    throw new Error('Cancel this workshop instead. Learners are already registered.');
  }
  deleteWorkshop(workshopId);
}

export function registerLearnerForWorkshop(learnerId: string, workshopId: string): Workshop {
  const workshop = getWorkshopById(workshopId);
  if (!workshop || workshop.status !== 'published') {
    throw new Error('This workshop is not open for registration.');
  }
  if (workshop.registeredLearnerIds.length >= workshop.capacity && !workshop.registeredLearnerIds.includes(learnerId)) {
    throw new Error('This workshop is full.');
  }
  const updated = registerForWorkshop(workshopId, learnerId);
  if (!updated) throw new Error('Could not register for this workshop.');
  return updated;
}

export function leaveLearnerWorkshop(learnerId: string, workshopId: string): Workshop {
  const updated = unregisterFromWorkshop(workshopId, learnerId);
  if (!updated) throw new Error('Workshop not found.');
  return updated;
}
