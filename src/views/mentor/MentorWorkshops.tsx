'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { MentorWorkshopForm } from '@/components/workshops/MentorWorkshopForm';
import { Plus, BookOpen, CalendarDays, Clock, Users, Pencil, Send, EyeOff, XCircle, Trash2, MapPin, Video } from 'lucide-react';
import { getSkills, getUserById } from '@/services/dataService';
import { getMentorWorkshops, removeMentorWorkshop, setMentorWorkshopStatus } from '@/services/workshopService';
import type { Workshop, WorkshopStatus } from '@/types';

const statusBadge: Record<WorkshopStatus, { label: string; variant: 'gray' | 'green' | 'brand' | 'red' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  published: { label: 'Published', variant: 'green' },
  completed: { label: 'Completed', variant: 'brand' },
  cancelled: { label: 'Cancelled', variant: 'red' },
};

export function MentorWorkshopsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Workshop | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const workshops = getMentorWorkshops(user.id);
  const skills = getSkills();
  const refresh = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (workshop: Workshop) => {
    setEditing(workshop);
    setFormOpen(true);
  };

  const handleSaved = (message: string) => {
    show(message, 'success');
    setFormOpen(false);
    refresh();
  };

  const handleStatus = (workshop: Workshop, status: 'draft' | 'published' | 'cancelled') => {
    try {
      setMentorWorkshopStatus(user.id, workshop.id, status);
      show(status === 'published' ? 'Workshop published.' : status === 'draft' ? 'Workshop unpublished.' : 'Workshop cancelled.', 'success');
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update the workshop.', 'error');
    }
  };

  const handleDelete = (workshop: Workshop) => {
    try {
      removeMentorWorkshop(user.id, workshop.id);
      show('Workshop deleted.', 'info');
      refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not delete the workshop.', 'error');
    }
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader
        title="My Workshops"
        description="Create, publish and manage workshops for learners."
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Create Workshop</Button>}
      />

      {workshops.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No workshops yet"
            description="Create a workshop to share your expertise with learners."
            action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Create Workshop</Button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {workshops.map((w) => {
            const skill = skills.find((s) => s.id === w.skillId);
            const badge = statusBadge[w.status];
            const seatsLeft = Math.max(0, w.capacity - w.registeredLearnerIds.length);
            const isOpen = w.status === 'published' || w.status === 'draft';
            return (
              <div key={w.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {skill && <Badge variant="brand">{skill.name}</Badge>}
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                    <p className="text-sm text-ink-400 mb-3">{w.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-ink-400">
                      <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {w.startTime && w.endTime ? `${w.startTime} to ${w.endTime}` : `${w.durationMinutes} min`}</span>
                      <span className="flex items-center gap-1">{w.format === 'in_person' ? <MapPin className="w-4 h-4" /> : <Video className="w-4 h-4" />} {w.format === 'in_person' ? (w.location ?? 'In-person') : 'Online'}</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {w.registeredLearnerIds.length}/{w.capacity} registered · {seatsLeft} slots left</span>
                    </div>
                    {w.registeredLearnerIds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-ink-50">
                        <p className="text-xs font-medium text-ink-400 mb-2">Registered learners:</p>
                        <div className="flex flex-wrap gap-2">
                          {w.registeredLearnerIds.map((lid) => {
                            const learner = getUserById(lid);
                            return learner ? (
                              <span key={lid} className="text-xs text-ink-500 bg-ink-50 px-2 py-1 rounded-md">{learner.name}</span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch shrink-0">
                    {w.status !== 'completed' && w.status !== 'cancelled' && (
                      <Button variant="secondary" size="sm" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /> Edit</Button>
                    )}
                    {w.status === 'draft' && (
                      <Button size="sm" onClick={() => handleStatus(w, 'published')}><Send className="w-4 h-4" /> Publish</Button>
                    )}
                    {w.status === 'published' && (
                      <Button variant="secondary" size="sm" onClick={() => handleStatus(w, 'draft')}><EyeOff className="w-4 h-4" /> Unpublish</Button>
                    )}
                    {isOpen && w.registeredLearnerIds.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => handleStatus(w, 'cancelled')} className="text-red-500 hover:bg-red-50"><XCircle className="w-4 h-4" /> Cancel workshop</Button>
                    )}
                    {w.registeredLearnerIds.length === 0 && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(w)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /> Delete</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MentorWorkshopForm
        mentorId={user.id}
        open={formOpen}
        workshop={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </DashboardLayout>
  );
}
