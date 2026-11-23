'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';
import { Search, Compass, Star, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { getAdminMentors } from '@/services/adminService';
import type { AdminMentorRow } from '@/services/adminService';

export function AdminMentorsPage() {
  const [mentors, setMentors] = useState<AdminMentorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activated' | 'pending'>('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminMentors();
        if (active) setMentors(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load mentors');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [reloadKey]);

  const filtered = mentors
    .filter((m) => {
      if (statusFilter === 'activated') return m.activated;
      if (statusFilter === 'pending') return !m.activated;
      return true;
    })
    .filter((m) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.professionalTitle.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q)
      );
    });

  return (
    <DashboardLayout>
      <PageHeader title="Mentors" description="View all mentor profiles and platform activity." />

      {error && (
        <div className="card p-5 border-l-4 border-red-500 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-ink-400">{error}</p>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            className="input pl-10"
            placeholder="Search by name, title, or location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1">
          {(['all', 'activated', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}
            >
              {s === 'all' ? 'All' : s === 'activated' ? 'Activated' : 'Not Activated'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading mentors…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Compass className="w-6 h-6" />}
            title="No mentors found"
            description={query ? 'Try a different search.' : 'No mentors have registered yet.'}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="flex items-start gap-4 mb-4">
                <Avatar src={m.avatarUrl ?? undefined} name={m.fullName ?? undefined} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink truncate">{m.fullName}</h3>
                  <p className="text-sm text-ink-400 truncate">{m.professionalTitle || 'Mentor'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
                    {m.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />{' '}
                      {m.reviewCount > 0 ? `${m.rating.toFixed(1)} (${m.reviewCount})` : 'No ratings'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={m.activated ? 'green' : 'amber'}>
                    {m.activated ? 'Activated' : 'Pending'}
                  </Badge>
                  <Badge variant={m.availability === 'available' ? 'green' : m.availability === 'limited' ? 'amber' : 'red'}>
                    {m.availability}
                  </Badge>
                </div>
              </div>

              {m.bio && (
                <p className="text-sm text-ink-400 mb-3 line-clamp-2">{m.bio}</p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-50 text-center text-sm">
                <div>
                  <p className="text-lg font-bold text-ink">{m.sessionCount}</p>
                  <p className="text-xs text-ink-400">Sessions</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-ink">{m.workshopCount}</p>
                  <p className="text-xs text-ink-400">Workshops</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-ink">{m.experienceYears}</p>
                  <p className="text-xs text-ink-400">Yrs Exp.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && (
        <p className="text-xs text-ink-400 mt-4 text-right">
          Showing {filtered.length} of {mentors.length} mentors
        </p>
      )}
    </DashboardLayout>
  );
}
