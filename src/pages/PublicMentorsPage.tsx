import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star, MapPin, Calendar } from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { getAllMentors } from '@/services/dataService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function PublicMentorsPage() {
  const [query, setQuery] = useState('');
  const mentors = getAllMentors();

  const filtered = mentors.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.user.name.toLowerCase().includes(q) ||
      m.profile.professionalTitle.toLowerCase().includes(q) ||
      m.skills.some((s) => s.name.toLowerCase().includes(q))
    );
  });

  return (
    <PublicBrowseLayout
      title="Find Mentors"
      description="Browse our network of expert mentors. Sign up to get matched with the right ones for your goals."
    >
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
        <input
          className="input pl-10"
          placeholder="Search by name, title, or skill..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-ink-400">No mentors found. Try a different search.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.user.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <img src={m.user.avatar} alt={m.user.name} className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink truncate">{m.user.name}</h3>
                  <p className="text-sm text-ink-400 truncate">{m.profile.professionalTitle}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.profile.location}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {m.profile.rating} ({m.profile.reviewCount})</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {m.skills.slice(0, 5).map((s) => (
                  <Badge key={s.id} variant="gray">{s.name}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-4">
                {m.profile.availability === 'available' && <Badge variant="green"><Calendar className="w-3 h-3" /> Available</Badge>}
                {m.profile.availability === 'limited' && <Badge variant="amber"><Calendar className="w-3 h-3" /> Limited</Badge>}
                {m.profile.availability === 'unavailable' && <Badge variant="red"><Calendar className="w-3 h-3" /> Unavailable</Badge>}
              </div>
              <div className="mt-auto">
                <Link to="/register"><Button variant="secondary" fullWidth>Sign up to connect</Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PublicBrowseLayout>
  );
}
