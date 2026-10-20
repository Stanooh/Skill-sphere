'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, EmptyState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { Search, Trash2, Users } from 'lucide-react';
import { getUsersByRole, deleteUser, getMentorProfile, getLearnerProfile } from '@/services/dataService';
import type { UserRole } from '@/types';

export function AdminUsersPage() {
  const { show } = useToast();
  const [tab, setTab] = useState<'all' | 'learner' | 'mentor'>('all');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allUsers = [...getUsersByRole('learner'), ...getUsersByRole('mentor'), ...getUsersByRole('admin')];
  const users = tab === 'all' ? allUsers : getUsersByRole(tab as UserRole);

  const filtered = users.filter((u) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    show(`User ${deleteTarget.name} removed.`, 'info');
    setDeleteTarget(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title="All Users" description="Manage all platform users." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input className="input pl-10" placeholder="Search by name or email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1">
          {(['all', 'learner', 'mentor'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}>
              {t === 'all' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Users className="w-6 h-6" />} title="No users found" description="Try a different search or filter." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Profile</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Joined</th>
                  <th className="text-right text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const mentorProfile = u.role === 'mentor' ? getMentorProfile(u.id) : null;
                  const learnerProfile = u.role === 'learner' ? getLearnerProfile(u.id) : null;
                  const profileComplete = mentorProfile?.profileComplete ?? learnerProfile?.profileComplete ?? true;
                  return (
                    <tr key={u.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar} name={u.name} size="sm" />
                          <span className="text-sm font-medium text-ink">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'brand' : u.role === 'mentor' ? 'gray' : 'outline'}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant={profileComplete ? 'green' : 'amber'}>{profileComplete ? 'Complete' : 'Incomplete'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-400 hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== 'admin' && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ id: u.id, name: u.name })} className="text-red-500 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove User" size="sm">
        <p className="text-sm text-ink-600 mb-6">
          Are you sure you want to remove <span className="font-semibold">{deleteTarget?.name}</span>? This will also delete their profile, sessions, and saved mentors. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button fullWidth onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remove</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
