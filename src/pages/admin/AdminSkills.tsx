import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Plus, Trash2, Bookmark } from 'lucide-react';
import { getSkills, createSkill, deleteSkill } from '@/services/dataService';

export function AdminSkillsPage() {
  const { show } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  const skills = getSkills();
  const categories = Array.from(new Set(skills.map((s) => s.category)));

  const handleCreate = () => {
    if (!name || !category) {
      show('Please enter a name and category.', 'error');
      return;
    }
    createSkill(name, category);
    show('Skill created.', 'success');
    setCreateOpen(false);
    setName('');
    setCategory('');
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = (skillId: string, skillName: string) => {
    deleteSkill(skillId);
    show(`Skill "${skillName}" removed.`, 'info');
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title="Skills" description="Manage the skill catalog available on the platform." action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Skill</Button>} />

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">{cat}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills.filter((s) => s.category === cat).map((skill) => (
                <div key={skill.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-brand" />
                    </div>
                    <span className="text-sm font-medium text-ink">{skill.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(skill.id, skill.name)} className="text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Skill" size="sm">
        <div className="space-y-4">
          <Input label="Skill name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Rust" />
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Backend" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleCreate}>Add Skill</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
