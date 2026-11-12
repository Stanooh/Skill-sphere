'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import {
  Search,
  Users,
  Star,
  CheckCircle2,
  PenLine,
  Trash2,
  AlertCircle,
  Target,
} from 'lucide-react';
import {
  getSessionsForMentor,
  getUserById,
  getLearnerProfile,
  getSkillsByIds,
  getProgress,
  getRoadmap,
} from '@/services/dataService';
import {
  getRecommendationsForMentor,
  createRecommendation,
  updateRecommendation,
  withdrawRecommendation,
} from '@/services/recommendationService';
import type { StudentRecommendation, User, LearnerProfile, Skill, Progress, Roadmap } from '@/types';
import { useToast } from '@/context/ToastContext';

interface MentoredStudent {
  user: User;
  profile: LearnerProfile;
  skills: Skill[];
  progress: Progress;
  roadmap: Roadmap | undefined;
  completedSessionsCount: number;
  hasRecommendation: boolean;
  existingRec: StudentRecommendation | undefined;
}

const CAREER_AREAS = [
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'UI/UX Designer',
  'Data Analyst',
  'DevOps Engineer',
  'Mobile Developer',
  'Product Manager',
  'Software Engineer',
];

const STRENGTHS_OPTIONS = [
  'Problem solving',
  'Quick learner',
  'Attention to detail',
  'Communication',
  'Consistency',
  'Initiative',
  'Collaboration',
  'Time management',
  'Critical thinking',
  'Adaptability',
];

function RecommendationForm({
  student,
  existingRec,
  mentorId,
  onClose,
  onSaved,
}: {
  student: MentoredStudent;
  existingRec?: StudentRecommendation;
  mentorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [strengths, setStrengths] = useState<string[]>(existingRec?.strengths ?? ['Problem solving']);
  const [technicalSkills, setTechnicalSkills] = useState<string[]>(
    existingRec?.technicalSkills ?? student.skills.map((s) => s.name)
  );
  const [techSkillInput, setTechSkillInput] = useState('');
  const [communication, setCommunication] = useState(existingRec?.communicationAssessment ?? '');
  const [problemSolving, setProblemSolving] = useState(existingRec?.problemSolvingAssessment ?? '');
  const [achievements, setAchievements] = useState<string[]>(
    existingRec?.achievements ??
      (student.roadmap?.milestones.filter((m) => m.completed).map((m) => m.title) || [])
  );
  const [achievementInput, setAchievementInput] = useState('');
  const [careerAreas, setCareerAreas] = useState<string[]>(
    existingRec?.careerAreas ?? [student.profile.learningGoal || 'Frontend Developer']
  );
  const [recommendation, setRecommendation] = useState(existingRec?.recommendation ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleStrength = (s: string) => {
    setStrengths((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleCareer = (c: string) => {
    setCareerAreas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const addTechSkill = () => {
    const val = techSkillInput.trim();
    if (val && !technicalSkills.includes(val)) {
      setTechnicalSkills((prev) => [...prev, val]);
      setTechSkillInput('');
    }
  };

  const addAchievement = () => {
    const val = achievementInput.trim();
    if (val && !achievements.includes(val)) {
      setAchievements((prev) => [...prev, val]);
      setAchievementInput('');
    }
  };

  const handleSave = async () => {
    if (!recommendation.trim() || recommendation.trim().length < 40) {
      setError('Please provide a substantive recommendation (at least 40 characters).');
      return;
    }
    if (strengths.length === 0) {
      setError('Please select at least one professional strength.');
      return;
    }
    if (careerAreas.length === 0) {
      setError('Please select at least one suitable career area.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      strengths,
      technicalSkills,
      communicationAssessment: communication.trim(),
      problemSolvingAssessment: problemSolving.trim(),
      achievements,
      careerAreas,
      recommendation: recommendation.trim(),
    };

    let result;
    if (existingRec) {
      result = updateRecommendation(existingRec.id, mentorId, payload);
    } else {
      result = createRecommendation({
        mentorId,
        studentId: student.user.id,
        ...payload,
      });
    }

    setSaving(false);
    if ('error' in result) {
      setError(result.error);
    } else {
      show(
        existingRec
          ? 'Recommendation updated successfully.'
          : 'Recommendation submitted for student review.',
        'success'
      );
      onSaved();
      onClose();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-ink-100 border border-ink-200">
        <Avatar src={student.user.avatar} name={student.user.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink text-sm truncate">{student.user.name}</p>
          <p className="text-xs text-ink-400 truncate">{student.profile.learningGoal}</p>
        </div>
        <div className="text-right text-xs text-ink-400 shrink-0">
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Strengths */}
      <div>
        <label className="label">Professional Strengths</label>
        <div className="flex flex-wrap gap-1.5">
          {STRENGTHS_OPTIONS.map((s) => {
            const active = strengths.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStrength(s)}
                className={`badge cursor-pointer transition-colors ${
                  active ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400 hover:bg-ink-200'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Technical skills */}
      <div>
        <label className="label">Demonstrated Technical Skills</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {technicalSkills.map((s) => (
            <span
              key={s}
              className="badge bg-brand-900 text-brand-200 cursor-pointer hover:bg-red-950 hover:text-red-400"
              onClick={() => setTechnicalSkills((prev) => prev.filter((x) => x !== s))}
              title="Click to remove"
            >
              {s} ×
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add another skill..."
            value={techSkillInput}
            onChange={(e) => setTechSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTechSkill();
              }
            }}
          />
          <Button size="sm" variant="secondary" type="button" onClick={addTechSkill}>
            Add
          </Button>
        </div>
      </div>

      {/* Communication assessment */}
      <div>
        <label className="label">Communication & Collaboration</label>
        <textarea
          className="input min-h-20"
          value={communication}
          onChange={(e) => setCommunication(e.target.value)}
          placeholder="Assess the student's communication, receptiveness to feedback, and collaborative demeanor..."
        />
      </div>

      {/* Problem solving assessment */}
      <div>
        <label className="label">Problem-Solving Ability</label>
        <textarea
          className="input min-h-20"
          value={problemSolving}
          onChange={(e) => setProblemSolving(e.target.value)}
          placeholder="Describe how the student approaches technical hurdles and architectural questions..."
        />
      </div>

      {/* Notable achievements */}
      <div>
        <label className="label">Notable Achievements & Projects</label>
        <div className="space-y-1.5 mb-2">
          {achievements.map((a) => (
            <div key={a} className="flex items-center justify-between p-2 bg-ink-100 rounded-lg text-xs">
              <span className="text-ink">{a}</span>
              <button
                type="button"
                className="text-ink-400 hover:text-red-400"
                onClick={() => setAchievements((prev) => prev.filter((x) => x !== a))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add a milestone, project, or achievement..."
            value={achievementInput}
            onChange={(e) => setAchievementInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAchievement();
              }
            }}
          />
          <Button size="sm" variant="secondary" type="button" onClick={addAchievement}>
            Add
          </Button>
        </div>
      </div>

      {/* Career Areas */}
      <div>
        <label className="label">Suitable Career Areas / Job Roles</label>
        <div className="flex flex-wrap gap-1.5">
          {CAREER_AREAS.map((c) => {
            const active = careerAreas.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCareer(c)}
                className={`badge cursor-pointer transition-colors ${
                  active ? 'bg-brand text-white' : 'bg-ink-100 text-ink-400 hover:bg-ink-200'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Written Recommendation */}
      <div>
        <label className="label">
          Written Mentor Recommendation <span className="text-ink-400 font-normal">(professional endorsement)</span>
        </label>
        <textarea
          className="input min-h-32"
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          placeholder="Throughout our mentorship, this student demonstrated strong problem-solving skills, consistency, and an excellent ability to apply newly learned concepts..."
        />
        <p className="text-xs text-ink-400 mt-1">{recommendation.length} characters</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 p-3 bg-red-950/40 rounded-lg border border-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-ink-100">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Saving...' : existingRec ? 'Update Recommendation' : 'Submit Recommendation'}
        </Button>
      </div>
    </div>
  );
}

export function MentorStudentRecommendations() {
  const { user } = useAuth();
  const { show } = useToast();
  const [search, setSearch] = useState('');
  const [progressFilter, setProgressFilter] = useState('');
  const [formStudent, setFormStudent] = useState<MentoredStudent | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'submitted'>('students');
  const [, setRefreshKey] = useState(0);

  const { students, myRecs } = (() => {
    if (!user) return { students: [], myRecs: [] as StudentRecommendation[] };

    const mentorSessions = getSessionsForMentor(user.id);
    // Mentors can only recommend students they have active or completed sessions with
    const validSessions = mentorSessions.filter(
      (s) => s.status === 'accepted' || s.status === 'completed'
    );
    const uniqueStudentIds = [...new Set(validSessions.map((s) => s.learnerId))];
    const recs = getRecommendationsForMentor(user.id);

    const list: MentoredStudent[] = [];
    for (const sid of uniqueStudentIds) {
      const u = getUserById(sid);
      const p = getLearnerProfile(sid);
      if (!u || !p) continue;
      const skills = getSkillsByIds(p.skillIds);
      const progress = getProgress(sid);
      const roadmap = getRoadmap(sid);
      const completedSessionsCount = mentorSessions.filter(
        (s) => s.learnerId === sid && s.status === 'completed'
      ).length;
      const existingRec = recs.find((r) => r.studentId === sid);

      list.push({
        user: u,
        profile: p,
        skills,
        progress,
        roadmap,
        completedSessionsCount,
        hasRecommendation: !!existingRec,
        existingRec,
      });
    }

    return { students: list, myRecs: recs };
  })();

  const filteredStudents = students.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          s.user.name.toLowerCase().includes(q) ||
          s.profile.learningGoal.toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.name.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (progressFilter === 'high') {
        if (s.progress.percentage < 50) return false;
      } else if (progressFilter === 'low') {
        if (s.progress.percentage >= 50) return false;
      }
      return true;
  });

  const handleWithdraw = (recId: string) => {
    if (!user) return;
    const ok = withdrawRecommendation(recId, user.id);
    if (ok) {
      show('Recommendation withdrawn.', 'info');
      setRefreshKey((k) => k + 1);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Student Recommendations"
        description="Review students you have mentored and endorse their professional capabilities for employer discovery."
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-ink-200">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'students'
              ? 'text-brand border-b-2 border-brand font-semibold'
              : 'text-ink-400 hover:text-ink'
          }`}
        >
          Mentored Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'submitted'
              ? 'text-brand border-b-2 border-brand font-semibold'
              : 'text-ink-400 hover:text-ink'
          }`}
        >
          Submitted Recommendations ({myRecs.length})
        </button>
      </div>

      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input
                className="input pl-10"
                placeholder="Search by student name, goal, or technical skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input sm:w-48"
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value)}
            >
              <option value="">All progress levels</option>
              <option value="high">≥ 50% Milestones</option>
              <option value="low">&lt; 50% Milestones</option>
            </select>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-12 h-12 text-ink-300 mx-auto mb-3" />
              <p className="font-semibold text-ink mb-1">No mentored students found</p>
              <p className="text-sm text-ink-400 max-w-md mx-auto">
                Only students with whom you have active or completed mentorship sessions appear here.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStudents.map((s) => {
                const completedMilestones =
                  s.roadmap?.milestones.filter((m) => m.completed).length ?? 0;
                return (
                  <div key={s.user.id} className="card p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar src={s.user.avatar} name={s.user.name} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-ink truncate">{s.user.name}</h3>
                          <p className="text-xs text-brand truncate flex items-center gap-1 mt-0.5">
                            <Target className="w-3 h-3" /> {s.profile.learningGoal}
                          </p>
                          <p className="text-xs text-ink-400 mt-0.5">{s.profile.location}</p>
                        </div>
                      </div>

                      {s.hasRecommendation && (
                        <div className="mb-3">
                          <span className="badge bg-brand-900 text-brand-200 inline-flex items-center gap-1 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Recommendation Submitted
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-ink-400 line-clamp-2 mb-3">{s.profile.bio}</p>

                      {/* Skills */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-ink-400 mb-1.5">Skills & Levels</p>
                        <div className="flex flex-wrap gap-1">
                          {s.skills.slice(0, 4).map((sk) => (
                            <span key={sk.id} className="badge bg-ink-100 text-ink-400 text-xs">
                              {sk.name}
                              {s.profile.skillLevels[sk.id] && (
                                <span className="opacity-70 ml-1">({s.profile.skillLevels[sk.id]})</span>
                              )}
                            </span>
                          ))}
                          {s.skills.length > 4 && (
                            <span className="badge bg-ink-100 text-ink-400 text-xs">
                              +{s.skills.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress & sessions */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-ink-100 text-xs text-ink-400 mb-4">
                        <div>
                          <span className="block font-semibold text-ink">
                            {s.progress.percentage}%
                          </span>
                          <span>Roadmap progress</span>
                        </div>
                        <div>
                          <span className="block font-semibold text-ink">
                            {completedMilestones}
                          </span>
                          <span>Milestones done</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      fullWidth
                      variant={s.hasRecommendation ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => setFormStudent(s)}
                    >
                      <PenLine className="w-4 h-4" />
                      {s.hasRecommendation ? 'Edit Recommendation' : 'Recommend Student'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'submitted' && (
        <div className="space-y-4">
          {myRecs.length === 0 ? (
            <div className="card p-12 text-center">
              <Star className="w-12 h-12 text-ink-300 mx-auto mb-3" />
              <p className="font-semibold text-ink mb-1">No recommendations submitted yet</p>
              <p className="text-sm text-ink-400">
                Switch to the &quot;Mentored Students&quot; tab to write your first professional recommendation.
              </p>
            </div>
          ) : (
            myRecs.map((rec) => {
              const studentObj = students.find((st) => st.user.id === rec.studentId);
              const studentName = studentObj?.user.name ?? 'Student';
              return (
                <div key={rec.id} className="card p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-100">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={studentObj?.user.avatar}
                        name={studentName}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-ink text-sm">{studentName}</p>
                        <p className="text-xs text-ink-400">
                          Submitted on {new Date(rec.createdAt).toLocaleDateString()}
                          {rec.updatedAt !== rec.createdAt && ' (edited)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.studentApprovalStatus === 'accepted' && (
                        <span className="badge bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs">
                          Publicly Displayed
                        </span>
                      )}
                      {rec.studentApprovalStatus === 'declined' && (
                        <span className="badge bg-ink-100 text-ink-400 text-xs">
                          Declined by Student
                        </span>
                      )}
                      {rec.studentApprovalStatus === 'pending' && (
                        <span className="badge bg-amber-950 text-amber-300 border border-amber-800 text-xs">
                          Pending Student Review
                        </span>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (studentObj) {
                            setFormStudent({
                              ...studentObj,
                              existingRec: rec,
                              hasRecommendation: true,
                            });
                          }
                        }}
                        title="Edit recommendation"
                      >
                        <PenLine className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleWithdraw(rec.id)}
                        title="Withdraw recommendation"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-ink-400 italic">&quot;{rec.recommendation}&quot;</p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {rec.careerAreas.map((area) => (
                      <span key={area} className="badge bg-brand-900 text-brand-200 text-xs">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Recommendation Form Modal */}
      <Modal
        open={formStudent !== null}
        onClose={() => setFormStudent(null)}
        title={formStudent?.hasRecommendation ? 'Edit Recommendation' : 'Recommend Student'}
        size="lg"
      >
        {formStudent && (
          <RecommendationForm
            student={formStudent}
            existingRec={formStudent.existingRec}
            mentorId={user.id}
            onClose={() => setFormStudent(null)}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </Modal>
    </DashboardLayout>
  );
}
