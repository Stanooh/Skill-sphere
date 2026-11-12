'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { getSkills } from '@/services/dataService';
import { saveMentorWorkshop, setMentorWorkshopStatus, type WorkshopInput } from '@/services/workshopService';
import type { Workshop, WorkshopFormat } from '@/types';

interface MentorWorkshopFormProps {
  mentorId: string;
  open: boolean;
  workshop: Workshop | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormState {
  title: string;
  description: string;
  coverImage: string;
  skillId: string;
  date: string;
  startTime: string;
  endTime: string;
  format: WorkshopFormat;
  meetingLink: string;
  location: string;
  capacity: string;
  learningObjectives: string;
  prerequisites: string;
}

function toFormState(workshop: Workshop | null): FormState {
  return {
    title: workshop?.title ?? '',
    description: workshop?.description ?? '',
    coverImage: workshop?.coverImage ?? '',
    skillId: workshop?.skillId ?? '',
    date: workshop?.date.slice(0, 10) ?? '',
    startTime: workshop?.startTime ?? workshop?.date.slice(11, 16) ?? '',
    endTime: workshop?.endTime ?? '',
    format: workshop?.format ?? 'online',
    meetingLink: workshop?.meetingLink ?? '',
    location: workshop?.location ?? '',
    capacity: String(workshop?.capacity ?? 20),
    learningObjectives: workshop?.learningObjectives?.join('\n') ?? '',
    prerequisites: workshop?.prerequisites ?? '',
  };
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function validate(form: FormState): string | null {
  if (!form.title.trim() || !form.description.trim() || !form.skillId || !form.date || !form.startTime || !form.endTime) {
    return 'Please fill in the title, description, skill, date and times.';
  }
  if (minutesBetween(form.startTime, form.endTime) <= 0) {
    return 'The end time must be after the start time.';
  }
  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) {
    return 'Maximum participants must be a whole number of at least 1.';
  }
  if (form.format === 'online' && !form.meetingLink.trim()) {
    return 'Add a meeting link for an online workshop.';
  }
  if (form.format === 'in_person' && !form.location.trim()) {
    return 'Add a physical location for an in-person workshop.';
  }
  return null;
}

function buildInput(form: FormState): WorkshopInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    coverImage: form.coverImage.trim() || undefined,
    skillId: form.skillId,
    date: `${form.date}T${form.startTime}`,
    startTime: form.startTime,
    endTime: form.endTime,
    durationMinutes: minutesBetween(form.startTime, form.endTime),
    capacity: Number(form.capacity),
    format: form.format,
    meetingLink: form.format === 'online' ? form.meetingLink.trim() : undefined,
    location: form.format === 'in_person' ? form.location.trim() : undefined,
    learningObjectives: form.learningObjectives
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    prerequisites: form.prerequisites.trim() || undefined,
  };
}

export function MentorWorkshopForm({ mentorId, open, workshop, onClose, onSaved }: MentorWorkshopFormProps) {
  const formKey = `${open}:${JSON.stringify(toFormState(workshop))}`;
  return (
    <MentorWorkshopFormFields
      key={formKey}
      mentorId={mentorId}
      open={open}
      workshop={workshop}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function MentorWorkshopFormFields({ mentorId, open, workshop, onClose, onSaved }: MentorWorkshopFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(workshop));
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = (publish: boolean) => {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const saved = saveMentorWorkshop(mentorId, buildInput(form), workshop?.id);
      if (publish && saved.status !== 'published') {
        setMentorWorkshopStatus(mentorId, saved.id, 'published');
      }
      onSaved(publish ? 'Workshop published.' : workshop ? 'Workshop updated.' : 'Draft saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the workshop.');
    }
  };

  const skills = getSkills();
  const isEditing = workshop !== null;
  const isLive = workshop?.status === 'published';

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Workshop' : 'Create Workshop'} size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="Workshop title" value={form.title} onChange={update('title')} placeholder="Advanced React Patterns Workshop" />
        <Textarea label="Description" rows={3} value={form.description} onChange={update('description')} placeholder="Describe what learners will gain from this workshop..." />
        <Input label="Cover image URL" value={form.coverImage} onChange={update('coverImage')} placeholder="https://..." />
        <Select label="Category or skill" value={form.skillId} onChange={update('skillId')}>
          <option value="">Select a skill</option>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Workshop date" type="date" value={form.date} onChange={update('date')} />
          <Input label="Start time" type="time" value={form.startTime} onChange={update('startTime')} />
          <Input label="End time" type="time" value={form.endTime} onChange={update('endTime')} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Delivery format" value={form.format} onChange={update('format')}>
            <option value="online">Online</option>
            <option value="in_person">In-person</option>
          </Select>
          <Input label="Maximum participants" type="number" min={1} value={form.capacity} onChange={update('capacity')} />
        </div>
        {form.format === 'online' ? (
          <Input label="Meeting link" value={form.meetingLink} onChange={update('meetingLink')} placeholder="https://meet.example.com/your-room" />
        ) : (
          <Input label="Physical location" value={form.location} onChange={update('location')} placeholder="Building, street and room" />
        )}
        <Textarea label="Learning objectives" rows={3} value={form.learningObjectives} onChange={update('learningObjectives')} placeholder="One objective per line" />
        <Input label="Prerequisites (optional)" value={form.prerequisites} onChange={update('prerequisites')} placeholder="Basic JavaScript knowledge" />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          {!isLive && <Button variant="secondary" fullWidth onClick={() => handleSave(false)}>Save as draft</Button>}
          <Button fullWidth onClick={() => handleSave(!isLive)}>{isLive ? 'Save changes' : 'Publish workshop'}</Button>
        </div>
      </div>
    </Modal>
  );
}
