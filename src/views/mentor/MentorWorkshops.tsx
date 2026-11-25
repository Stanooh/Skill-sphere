'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { MentorWorkshopForm } from '@/components/workshops/MentorWorkshopForm';
import { WorkshopCoverImage } from '@/components/workshops/WorkshopCoverImage';
import { Plus, BookOpen, CalendarDays, Clock, Users, Pencil, Send, EyeOff, XCircle, Trash2 } from 'lucide-react';
import { getSkills } from '@/services/dataService';
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
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkshops = useCallback(async () => {
    if (!user) return;
    const list = await getMentorWorkshops(user.id);
    setWorkshops(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await loadWorkshops();
    };
    void run();
    return () => {
      active = false;
    };
  }, [loadWorkshops]);

  if (!user) return null;

  const skills = getSkills();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (workshop: Workshop) => {
    setEditing(workshop);
    setFormOpen(true);
  };

  const handleSaved = async (message: string) => {
    show(message, 'success');
    setFormOpen(false);
    await loadWorkshops();
  };

  const handleStatus = async (workshop: Workshop, status: 'draft' | 'published' | 'cancelled') => {
    try {
      await setMentorWorkshopStatus(user.id, workshop.id, status);
      show(status === 'published' ? 'Workshop published.' : status === 'draft' ? 'Workshop unpublished.' : 'Workshop cancelled.', 'success');
      await loadWorkshops();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update the workshop.', 'error');
    }
  };

  const handleDelete = async (workshop: Workshop) => {
    try {
      await removeMentorWorkshop(user.id, workshop.id);
      show('Workshop deleted.', 'info');
      await loadWorkshops();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not delete the workshop.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="My Workshops"
        description="Create and lead group sessions for multiple learners. Only approved mentors can publish workshops."
        action={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create workshop
          </Button>
        }
      />

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading workshops...</div>
      ) : workshops.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="No workshops yet"
            description="Create your first workshop to host interactive group learning sessions."
            action={
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create workshop
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workshops.map((workshop) => {
            const skill = skills.find((s) => s.id === workshop.skillId);
            const badge = statusBadge[workshop.status];
            return (
              <div key={workshop.id} className="card group overflow-hidden flex flex-col justify-between">
                <div>
                  <WorkshopCoverImage src={workshop.coverImage} alt={workshop.title} />
                  <div className="p-5 pb-0">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {skill && <Badge variant="brand">{skill.name}</Badge>}
                        <Badge variant="outline">{workshop.format === 'in_person' ? 'In person' : 'Online'}</Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold text-ink text-lg mb-1">{workshop.title}</h3>
                    <p className="text-sm text-ink-400 line-clamp-2 mb-4">{workshop.description}</p>

                    <div className="space-y-1.5 text-xs text-ink-400 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-ink-300" />
                        <span>{new Date(workshop.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {workshop.startTime && <span>{workshop.startTime}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-ink-300" />
                        <span>{workshop.durationMinutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-ink-300" />
                        <span>{workshop.registeredLearnerIds.length} / {workshop.capacity} enrolled</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-5 pt-3 border-t border-ink-100">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(workshop)} className="gap-1">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {workshop.status === 'draft' && (
                    <Button variant="primary" size="sm" onClick={() => handleStatus(workshop, 'published')} className="gap-1">
                      <Send className="h-3.5 w-3.5" />
                      Publish
                    </Button>
                  )}
                  {workshop.status === 'published' && (
                    <Button variant="secondary" size="sm" onClick={() => handleStatus(workshop, 'draft')} className="gap-1">
                      <EyeOff className="h-3.5 w-3.5" />
                      Unpublish
                    </Button>
                  )}
                  {workshop.status !== 'cancelled' && (
                    <Button variant="secondary" size="sm" onClick={() => handleStatus(workshop, 'cancelled')} className="gap-1 text-red-600 hover:text-red-700">
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(workshop)} className="gap-1 text-red-600 hover:text-red-700 ml-auto">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <MentorWorkshopForm
          mentorId={user.id}
          open={formOpen}
          workshop={editing}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}
