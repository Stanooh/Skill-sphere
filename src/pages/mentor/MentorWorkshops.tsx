import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Plus, BookOpen, CalendarDays, Clock, Users, Trash2 } from 'lucide-react';
import { getWorkshopsForMentor, createWorkshop, deleteWorkshop, getSkills, getUserById } from '@/services/dataService';

export function MentorWorkshopsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillId, setSkillId] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('90');
  const [capacity, setCapacity] = useState('20');

  if (!user) return null;

  const workshops = getWorkshopsForMentor(user.id);
  const skills = getSkills();

  const handleCreate = () => {
    if (!title || !description || !skillId || !date) {
      show('Please fill in all fields.', 'error');
      return;
    }
    createWorkshop({
      mentorId: user.id,
      title,
      description,
      skillId,
      date: new Date(date).toISOString(),
      durationMinutes: Number(duration),
      capacity: Number(capacity),
    });
    show('Workshop created!', 'success');
    setCreateOpen(false);
    setTitle('');
    setDescription('');
    setSkillId('');
    setDate('');
    setDuration('90');
    setCapacity('20');
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = (workshopId: string) => {
    deleteWorkshop(workshopId);
    show('Workshop deleted.', 'info');
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader
        title="My Workshops"
        description="Create and manage workshops for learners."
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Create Workshop</Button>}
      />

      {workshops.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No workshops yet"
            description="Create a workshop to share your expertise with learners."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Create Workshop</Button>}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {workshops.map((w) => {
            const skill = skills.find((s) => s.id === w.skillId);
            return (
              <div key={w.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {skill && <Badge variant="brand">{skill.name}</Badge>}
                      <Badge variant={w.status === 'upcoming' ? 'green' : 'gray'}>{w.status}</Badge>
                    </div>
                    <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                    <p className="text-sm text-ink-400 mb-3">{w.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-ink-400">
                      <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {w.durationMinutes} min</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {w.registeredLearnerIds.length}/{w.capacity}</span>
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)} className="text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Workshop" size="lg">
        <div className="space-y-4">
          <Input label="Workshop title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Advanced React Patterns Workshop" />
          <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what learners will gain from this workshop..." />
          <Select label="Skill" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">Select a skill</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Date & time" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
              <option value="120">2 hours</option>
              <option value="150">2.5 hours</option>
            </Select>
            <Input label="Capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleCreate}>Create Workshop</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
