'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { Search, Trash2, Users, Loader2, AlertTriangle } from 'lucide-react';
import { getAdminAllUsers, adminDeleteUser } from '@/services/adminService';
import type { AdminProfile } from '@/services/adminService';

export function AdminUsersPage() {
  const { show } = useToast();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'learner' | 'mentor' | 'admin'>('all');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
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
        const data = await getAdminAllUsers();
        if (active) setUsers(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, []);

  const filtered = users
    .filter((u) => tab === 'all' || u.role === tab)
    .filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (u.fullName ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await adminDeleteUser(deleteTarget.id);
    setDeleting(false);
    if (err) {
      show(`Error removing user: ${err}`, 'error');
    } else {
      show(`User ${deleteTarget.name} removed.`, 'info');
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  return (
    <DashboardLayout>
      <PageHeader title="User Management" description="View and manage all platform users." />

      {error && (
        <div className="card p-5 border-l-4 border-red-500 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-ink">Failed to load users</p>
            <p className="text-sm text-ink-400">{error}</p>
          </div>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => void loadUsers()}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            className="input pl-10"
            placeholder="Search by name, email, or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1">
          {(['all', 'learner', 'mentor', 'admin'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}
            >
              {t === 'all' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…
        </div>
      ) : filtered.length === 0 ? (
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
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Joined</th>
                  <th className="text-right text-xs font-semibold text-ink-400 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatarUrl ?? undefined} name={u.fullName ?? u.email} size="sm" />
                        <span className="text-sm font-medium text-ink">{u.fullName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'brand' : u.role === 'mentor' ? 'gray' : 'outline'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-400 hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget({ id: u.id, name: u.fullName ?? u.email })}
                          className="text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-ink-100 text-xs text-ink-400">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove User" size="sm">
        <p className="text-sm text-ink-400 mb-5">
          Are you sure you want to remove <span className="font-semibold text-ink">{deleteTarget?.name}</span>?
          This will delete their profile and all associated data. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove User'}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
