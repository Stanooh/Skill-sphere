'use client';

import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Star,
  ShieldAlert,
  Trash2,
  Eye,
  EyeOff,
  Building,
  Mail,
  User,
  CheckCircle2,
  AlertTriangle,
  History,
  Search,
} from 'lucide-react';
import {
  getAllRecommendations,
  adminDeleteRecommendation,
} from '@/services/recommendationService';
import {
  getAllEmployerContactRequests,
} from '@/services/contactRequestService';
import {
  getUserById,
  getDb,
  saveDb,
  updateLearnerProfile,
} from '@/services/dataService';
import type { StudentRecommendation, EmployerContactRequest, AdminActionLog } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const ADMIN_ACTIONS_KEY = 'skillsphere_admin_actions';

function getAdminLogs(): AdminActionLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_ACTIONS_KEY);
    return raw ? (JSON.parse(raw) as AdminActionLog[]) : [];
  } catch {
    return [];
  }
}

function recordAdminLog(log: Omit<AdminActionLog, 'id' | 'createdAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const logs = getAdminLogs();
    logs.unshift({
      ...log,
      id: `act-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(ADMIN_ACTIONS_KEY, JSON.stringify(logs));
  } catch {}
}

export function AdminRecommendationsPage() {
  const { user } = useAuth();
  const { show } = useToast();

  const [activeTab, setActiveTab] = useState<'recs' | 'profiles' | 'contacts' | 'logs'>('recs');
  const [recommendations, setRecommendations] = useState<StudentRecommendation[]>([]);
  const [contacts, setContacts] = useState<EmployerContactRequest[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActionLog[]>([]);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Moderation modal state
  const [selectedRecToDelete, setSelectedRecToDelete] = useState<StudentRecommendation | null>(null);
  const [deletionNote, setDeletionNote] = useState('');

  useEffect(() => {
    setRecommendations(getAllRecommendations());
    setContacts(getAllEmployerContactRequests());
    setAdminLogs(getAdminLogs());
  }, [refreshKey]);

  const db = getDb();
  const visibleLearners = db.learnerProfiles.filter((p) => p.employerVisibility === true);

  const acceptedCount = recommendations.filter((r) => r.studentApprovalStatus === 'accepted').length;
  const pendingCount = recommendations.filter((r) => r.studentApprovalStatus === 'pending').length;

  const handleConfirmDeleteRec = () => {
    if (!selectedRecToDelete) return;
    const ok = adminDeleteRecommendation(selectedRecToDelete.id);
    if (ok) {
      recordAdminLog({
        adminId: user?.id ?? 'admin',
        action: 'Removed Inappropriate Mentor Recommendation',
        targetId: selectedRecToDelete.id,
        targetType: 'recommendation',
        note: deletionNote || 'Removed for policy violation / inappropriate content',
      });
      show('Recommendation removed and moderation log recorded.', 'success');
      setSelectedRecToDelete(null);
      setDeletionNote('');
      setRefreshKey((k) => k + 1);
    }
  };

  const handleRevokeVisibility = (studentId: string, studentName: string) => {
    updateLearnerProfile(studentId, { employerVisibility: false });
    recordAdminLog({
      adminId: user?.id ?? 'admin',
      action: 'Revoked Public Employer Visibility',
      targetId: studentId,
      targetType: 'profile',
      note: `Visibility revoked for ${studentName} upon review/complaint.`,
    });
    show(`Public employer visibility revoked for ${studentName}.`, 'info');
    setRefreshKey((k) => k + 1);
  };

  const filteredRecs = useMemo(() => {
    if (!search.trim()) return recommendations;
    const q = search.toLowerCase();
    return recommendations.filter((r) => {
      const mentor = getUserById(r.mentorId);
      const student = getUserById(r.studentId);
      return (
        mentor?.name.toLowerCase().includes(q) ||
        student?.name.toLowerCase().includes(q) ||
        r.recommendation.toLowerCase().includes(q)
      );
    });
  }, [recommendations, search]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Recommendations & Talent Oversight"
        description="Monitor mentor endorsements, review reported recommendations, manage public candidate profiles, and audit employer inquiries."
      />

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Endorsements"
          value={recommendations.length}
          icon={<Star className="w-5 h-5" />}
        />
        <StatCard
          label="Publicly Displayed"
          value={acceptedCount}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          sublabel={`${pendingCount} pending review`}
        />
        <StatCard
          label="Public Candidates"
          value={visibleLearners.length}
          icon={<Eye className="w-5 h-5" />}
        />
        <StatCard
          label="Employer Inquiries"
          value={contacts.length}
          icon={<Building className="w-5 h-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-ink-200">
        <button
          onClick={() => setActiveTab('recs')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'recs'
              ? 'text-brand border-b-2 border-brand font-semibold'
              : 'text-ink-400 hover:text-ink'
          }`}
        >
          All Recommendations ({recommendations.length})
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'profiles'
              ? 'text-brand border-b-2 border-brand font-semibold'
              : 'text-ink-400 hover:text-ink'
          }`}
        >
          Public Talent Profiles ({visibleLearners.length})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'text-brand border-b-2 border-brand font-semibold'
              : 'text-ink-400 hover:text-ink'
          }`}
        >
          Employer Inquiries ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-brand border-b-2 border-brand font-semibold'
              : 'text-ink-400 hover:text-ink'
          }`}
        >
          Audit Logs ({adminLogs.length})
        </button>
      </div>

      {/* Tab: Recommendations */}
      {activeTab === 'recs' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
            <input
              className="input pl-10"
              placeholder="Search by mentor, student, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredRecs.length === 0 ? (
            <div className="card p-10 text-center text-ink-400 text-sm">
              No recommendations found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecs.map((rec) => {
                const mentor = getUserById(rec.mentorId);
                const student = getUserById(rec.studentId);
                return (
                  <div
                    key={rec.id}
                    className="card p-5 space-y-3 border border-ink-200 hover:border-ink-100"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-100">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <span>Mentor: {mentor?.name ?? 'Unknown'}</span>
                          <span className="text-ink-400">→</span>
                          <span>Student: {student?.name ?? 'Unknown'}</span>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">
                          Submitted on {new Date(rec.createdAt).toLocaleDateString()} • ID: {rec.id}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {rec.studentApprovalStatus === 'accepted' && (
                          <span className="badge bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs">
                            Student Approved (Public)
                          </span>
                        )}
                        {rec.studentApprovalStatus === 'declined' && (
                          <span className="badge bg-ink-200 text-ink-400 text-xs">
                            Declined by Student
                          </span>
                        )}
                        {rec.studentApprovalStatus === 'pending' && (
                          <span className="badge bg-amber-950 text-amber-300 border border-amber-800 text-xs">
                            Pending Review
                          </span>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          className="!text-red-400 hover:!text-red-300 hover:!bg-red-950"
                          onClick={() => setSelectedRecToDelete(rec)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-ink-400 italic">"{rec.recommendation}"</p>

                    <div className="flex flex-wrap gap-1 text-xs">
                      {rec.strengths.map((st) => (
                        <span key={st} className="badge bg-ink-100 text-ink-400">
                          {st}
                        </span>
                      ))}
                      {rec.careerAreas.map((area) => (
                        <span key={area} className="badge bg-brand-900 text-brand-200">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Public Talent Profiles */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-400">
            Learners who have explicitly opted into employer discovery. Administrators can revoke visibility
            if a profile violates community guidelines or upon receiving complaints.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {visibleLearners.map((lp) => {
              const student = getUserById(lp.userId);
              if (!student) return null;
              return (
                <div key={lp.id} className="card p-5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-12 h-12 rounded-full ring-2 ring-brand/30"
                    />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-ink text-sm truncate">{student.name}</h4>
                      <p className="text-xs text-brand truncate">{lp.learningGoal}</p>
                      <p className="text-xs text-ink-400 mt-1 line-clamp-2">{lp.bio}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="!text-red-400 shrink-0"
                    onClick={() => handleRevokeVisibility(student.id, student.name)}
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Revoke Visibility
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Employer Inquiries */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-400">
            Audit of contact inquiries sent by employers through the public talent discovery directory.
          </p>

          {contacts.length === 0 ? (
            <div className="card p-10 text-center text-ink-400 text-sm">
              No employer inquiries recorded yet.
            </div>
          ) : (
            <div className="card divide-y divide-ink-100 overflow-hidden">
              {contacts.map((req) => {
                const student = getUserById(req.learnerId);
                return (
                  <div key={req.id} className="p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink flex items-center gap-2">
                          <Building className="w-4 h-4 text-brand" /> {req.companyName}
                          <span className="text-xs font-normal text-ink-400">
                            ({req.employerName} • {req.employerEmail})
                          </span>
                        </p>
                        <p className="text-xs text-ink-400 mt-0.5">
                          Target Student: <strong className="text-ink">{student?.name ?? 'Learner'}</strong> • {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="badge bg-ink-100 text-ink-400 text-xs uppercase">{req.status}</span>
                    </div>
                    <p className="text-xs text-ink-400 bg-ink-100 p-2.5 rounded-lg">
                      "{req.message}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <p className="text-sm text-ink-400">
            Log of administrative actions taken regarding recommendations, student visibility, and moderation.
          </p>

          {adminLogs.length === 0 ? (
            <div className="card p-10 text-center text-ink-400 text-sm">
              No administrative actions logged yet.
            </div>
          ) : (
            <div className="card divide-y divide-ink-100 overflow-hidden">
              {adminLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-900 flex items-center justify-center text-brand shrink-0 mt-0.5">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{log.action}</p>
                      <span className="text-xs text-ink-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-ink-400 mt-0.5">{log.note}</p>
                    <p className="text-[11px] text-ink-400 mt-1">
                      Target: {log.targetType} ({log.targetId}) • By Admin: {log.adminId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove Recommendation Modal */}
      <Modal
        open={selectedRecToDelete !== null}
        onClose={() => setSelectedRecToDelete(null)}
        title="Remove Inappropriate Recommendation"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-950/40 rounded-lg border border-red-800 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Administrative Moderation Action</p>
              <p className="mt-0.5">
                Removing this recommendation will immediately delete it from all public candidate
                profiles and mentor views. This action will be logged in the audit trail.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Reason / Moderation Note</label>
            <textarea
              className="input min-h-24"
              placeholder="e.g. Inappropriate language, policy violation, fabricated claim..."
              value={deletionNote}
              onChange={(e) => setDeletionNote(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedRecToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteRec}
              className="flex-1 !bg-red-600 hover:!bg-red-700 !text-white !border-0"
            >
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

