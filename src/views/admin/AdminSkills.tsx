'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui';
import { Plus, Trash2, Bookmark, Loader2, AlertTriangle, Search, Users } from 'lucide-react';
import { getAdminSkills, adminCreateSkill, adminDeleteSkill } from '@/services/adminService';
import type { AdminSkillRow } from '@/services/adminService';

export function AdminSkillsPage() {
  const { show } = useToast();
  const [skills, setSkills] = useState<AdminSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminSkills();
      setSkills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminSkills();
        if (active) setSkills(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, []);

  const categories = Array.from(new Set(skills.map((s) => s.category))).sort();

  const filtered = skills.filter((s) => {
    const matchesQuery = !query || s.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !categoryFilter || s.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const displayedCategories = Array.from(new Set(filtered.map((s) => s.category))).sort();

  const handleCreate = async () => {
    if (!name.trim() || !category.trim()) {
      show('Please enter a name and category.', 'error');
      return;
    }
    setCreating(true);
    const { error: err, skill } = await adminCreateSkill(name.trim(), category.trim());
    setCreating(false);
    if (err) {
      show(`Error creating skill: ${err}`, 'error');
    } else if (skill) {
      show(`Skill "${skill.name}" created.`, 'success');
      setSkills((prev) => [...prev, skill].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
      setCreateOpen(false);
      setName('');
      setCategory('');
    }
  };

  const handleDelete = async (skillId: string, skillName: string) => {
    setDeletingId(skillId);
    const { error: err } = await adminDeleteSkill(skillId);
    setDeletingId(null);
    if (err) {
      show(`Error removing skill: ${err}`, 'error');
    } else {
      show(`Skill "${skillName}" removed.`, 'info');
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Skill Catalog"
        description="Manage the skills available on the platform."
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Skill</Button>}
      />

      {error && (
        <div className="card p-5 border-l-4 border-red-500 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-ink-400">{error}</p>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => void loadSkills()}>Retry</Button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
            <input
              className="input pl-10"
              placeholder="Search skills…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-56"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading skills…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bookmark className="w-6 h-6" />}
            title="No skills found"
            description={query ? 'Try a different search.' : 'Add skills to build the platform catalog.'}
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Skill</Button>}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {displayedCategories.map((cat) => {
            const catSkills = filtered.filter((s) => s.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-ink-400 uppercase tracking-wider mb-3">
                  {cat} <span className="text-ink-300 font-normal normal-case">({catSkills.length})</span>
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catSkills.map((skill) => (
                    <div key={skill.id} className="card p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                          <Bookmark className="w-4 h-4 text-brand" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-ink block truncate">{skill.name}</span>
                          {skill.mentorCount > 0 && (
                            <span className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3" /> {skill.mentorCount} mentor{skill.mentorCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(skill.id, skill.name)}
                        disabled={deletingId === skill.id}
                        className="text-red-500 hover:bg-red-50 shrink-0"
                      >
                        {deletingId === skill.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !error && (
        <p className="text-xs text-ink-400 mt-4 text-right">
          {filtered.length} of {skills.length} skills
        </p>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Skill" size="sm">
        <div className="space-y-4">
          <Input
            label="Skill name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Rust"
          />
          <div>
            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Backend"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button fullWidth onClick={() => void handleCreate()} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Skill'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
