'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';
import { Search, BookOpen, Loader2, AlertTriangle, Users, Clock, Calendar } from 'lucide-react';
import { getAdminWorkshops } from '@/services/adminService';
import type { AdminWorkshopRow } from '@/services/adminService';

export function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<AdminWorkshopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'completed'>('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminWorkshops();
        if (active) setWorkshops(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load workshops');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [reloadKey]);

  const filtered = workshops
    .filter((w) => statusFilter === 'all' || w.status === statusFilter)
    .filter((w) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        w.title.toLowerCase().includes(q) ||
        w.mentorName.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    });

  return (
    <DashboardLayout>
      <PageHeader title="Workshop Management" description="View all workshops across the platform." />

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
            placeholder="Search by title or mentor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1">
          {(['all', 'published', 'draft', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading workshops…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="No workshops found"
            description={query ? 'Try a different search.' : 'Workshops created by mentors will appear here.'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={w.status === 'published' ? 'green' : w.status === 'completed' ? 'brand' : 'gray'}>
                      {w.status}
                    </Badge>
                    <h3 className="font-semibold text-ink">{w.title}</h3>
                  </div>
                  <p className="text-sm text-ink-400 mb-3 line-clamp-2">{w.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-400">
                    <span className="font-medium text-ink-600">By {w.mentorName}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(w.date).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {w.durationMinutes} min</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {w.registrationCount}/{w.capacity} registered
                      {w.capacity > 0 && (
                        <span className={`ml-1 font-medium ${
                          Math.round((w.registrationCount / w.capacity) * 100) >= 80 ? 'text-green-600'
                          : Math.round((w.registrationCount / w.capacity) * 100) >= 40 ? 'text-amber-600'
                          : 'text-ink-400'
                        }`}>
                          ({Math.round((w.registrationCount / w.capacity) * 100)}% full)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && (
        <p className="text-xs text-ink-400 mt-4 text-right">
          Showing {filtered.length} of {workshops.length} workshops
        </p>
      )}
    </DashboardLayout>
  );
}
