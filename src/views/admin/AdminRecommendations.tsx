'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Star,
  Trash2,
  Eye,
  EyeOff,
  Building,
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
  recordAdminAction,
  getAdminActionLogs,
} from '@/services/adminLogService';
import {
  getUserById,
  updateLearnerProfile,
} from '@/services/dataService';
import { createClient } from '@/lib/supabase/client';
import type { StudentRecommendation, AdminActionLog, EmployerContactRequest, LearnerProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function AdminRecommendationsPage() {
  const { user } = useAuth();
  const { show } = useToast();

  const [activeTab, setActiveTab] = useState<'recs' | 'profiles' | 'contacts' | 'logs'>('recs');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [recommendations, setRecommendations] = useState<StudentRecommendation[]>([]);
  const [contacts, setContacts] = useState<EmployerContactRequest[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActionLog[]>([]);
  const [visibleLearners, setVisibleLearners] = useState<LearnerProfile[]>([]);

  // Moderation modal state
  const [selectedRecToDelete, setSelectedRecToDelete] = useState<StudentRecommendation | null>(null);
  const [deletionNote, setDeletionNote] = useState('');

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [recs, reqs, logs, lpRes] = await Promise.all([
      getAllRecommendations(),
      getAllEmployerContactRequests(),
      getAdminActionLogs(),
      supabase.from('learner_profiles').select('*').eq('employer_visibility', true),
    ]);

    setRecommendations(recs);
    setContacts(reqs);
    setAdminLogs(logs);

    if (lpRes.data) {
      setVisibleLearners(
        lpRes.data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          bio: row.bio || '',
          location: row.location || '',
          education: row.education || '',
          learningGoal: row.learning_goal || '',
          targetTimeframe: row.target_timeframe || '',
          availableHoursPerWeek: row.available_hours_per_week || 0,
          skillIds: row.skill_ids || [],
          skillLevels: row.skill_levels || {},
          profileComplete: row.profile_complete,
          employerVisibility: row.employer_visibility,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      await loadData();
    };
    if (active) void run();
    return () => {
      active = false;
    };
  }, [loadData]);

  const acceptedCount = recommendations.filter((r) => r.studentApprovalStatus === 'accepted').length;
  const pendingCount = recommendations.filter((r) => r.studentApprovalStatus === 'pending').length;

  const handleConfirmDeleteRec = async () => {
    if (!selectedRecToDelete) return;
    const ok = await adminDeleteRecommendation(selectedRecToDelete.id);
    if (ok) {
      if (user) {
        await recordAdminAction({
          adminId: user.id,
          action: 'Removed Inappropriate Mentor Recommendation',
          targetId: selectedRecToDelete.id,
          targetType: 'recommendation',
          note: deletionNote || 'Removed for policy violation / inappropriate content',
        });
      }
      show('Recommendation removed and moderation log recorded.', 'success');
      setSelectedRecToDelete(null);
      setDeletionNote('');
      await loadData();
    }
  };

  const handleRevokeVisibility = async (studentId: string, studentName: string) => {
    const supabase = createClient();
    await supabase.from('learner_profiles').update({ employer_visibility: false }).eq('user_id', studentId);
    updateLearnerProfile(studentId, { employerVisibility: false });
    if (user) {
      await recordAdminAction({
        adminId: user.id,
        action: 'Revoked Public Employer Visibility',
        targetId: studentId,
        targetType: 'profile',
        note: `Visibility revoked for ${studentName} upon review/complaint.`,
      });
    }
    show(`Public employer visibility revoked for ${studentName}.`, 'info');
    await loadData();
  };

  const filteredRecs = recommendations.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const mentor = getUserById(r.mentorId);
    const student = getUserById(r.studentId);
    return (
      mentor?.name.toLowerCase().includes(q) ||
      student?.name.toLowerCase().includes(q) ||
      r.recommendation.toLowerCase().includes(q)
    );
  });

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

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading data...</div>
      ) : (
        <>
          {/* TAB 1: Recommendations Moderation */}
          {activeTab === 'recs' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by mentor, student, or keyword..."
                    className="input pl-9 text-sm"
                  />
                </div>
              </div>

              {filteredRecs.length === 0 ? (
                <div className="card p-12 text-center text-ink-300">No recommendations found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredRecs.map((rec) => {
                    const mentor = getUserById(rec.mentorId);
                    const student = getUserById(rec.studentId);
                    return (
                      <div key={rec.id} className="card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 text-xs text-ink-300">
                              <span className="font-semibold text-ink-600">
                                Mentor: {mentor?.name || 'Unknown'}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-ink-600">
                                Student: {student?.name || 'Unknown'}
                              </span>
                              <span>•</span>
                              <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  rec.studentApprovalStatus === 'accepted'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : rec.studentApprovalStatus === 'pending'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-red-500/10 text-red-400'
                                }`}
                              >
                                Student {rec.studentApprovalStatus}
                              </span>
                            </div>
                            <p className="text-sm text-ink-500 italic bg-ink-50 p-3 rounded-lg border border-ink-100">
                              &ldquo;{rec.recommendation}&rdquo;
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {rec.technicalSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="px-2 py-0.5 bg-brand/10 text-brand text-xs rounded"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-red-400 hover:bg-red-500/10"
                              onClick={() => setSelectedRecToDelete(rec)}
                            >
                              <Trash2 className="w-4 h-4 mr-1 text-red-400" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Public Talent Profiles */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              {visibleLearners.length === 0 ? (
                <div className="card p-12 text-center text-ink-300">No public profiles listed.</div>
              ) : (
                visibleLearners.map((learner) => {
                  const student = getUserById(learner.userId);
                  return (
                    <div
                      key={learner.id}
                      className="card p-5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center">
                          {student?.name?.charAt(0) || 'L'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-ink text-sm">
                            {student?.name || 'Candidate'}
                          </h4>
                          <p className="text-xs text-ink-300">
                            {learner.learningGoal || 'No goal specified'} • {learner.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRevokeVisibility(learner.userId, student?.name || 'Learner')}
                        >
                          <EyeOff className="w-4 h-4 mr-1 text-amber-400" />
                          Revoke Visibility
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Employer Inquiries */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {contacts.length === 0 ? (
                <div className="card p-12 text-center text-ink-300">No employer inquiries recorded yet.</div>
              ) : (
                contacts.map((req) => {
                  const student = getUserById(req.learnerId);
                  return (
                    <div key={req.id} className="card p-5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-ink-300">
                        <span className="font-semibold text-ink-600">
                          {req.employerName} ({req.companyName})
                        </span>
                        <span>{new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-ink-400">
                        Candidate recipient: <span className="text-ink-600 font-medium">{student?.name || req.learnerId}</span> • Employer Contact: {req.employerEmail}
                      </p>
                      <p className="text-sm text-ink-500 bg-ink-50 p-3 rounded-lg border border-ink-100">
                        {req.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: Audit Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {adminLogs.length === 0 ? (
                <div className="card p-12 text-center text-ink-300">No admin moderation events recorded.</div>
              ) : (
                adminLogs.map((log) => (
                  <div key={log.id} className="card p-4 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <History className="w-4 h-4 text-brand shrink-0" />
                      <div>
                        <span className="font-semibold text-ink">{log.action}</span>
                        {log.note && <p className="text-xs text-ink-400 mt-0.5">{log.note}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-ink-300 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {selectedRecToDelete && (
        <Modal
          open={true}
          onClose={() => setSelectedRecToDelete(null)}
          title="Remove Recommendation"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Removing this endorsement is permanent and cannot be undone. An audit record will be logged.
              </p>
            </div>
            <div>
              <label className="label mb-1">Reason for removal (Audit Log Note)</label>
              <textarea
                value={deletionNote}
                onChange={(e) => setDeletionNote(e.target.value)}
                placeholder="e.g., Inappropriate language, false claims, policy violation..."
                className="input min-h-[80px] text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedRecToDelete(null)}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDeleteRec}>
                Confirm Removal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
