import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui';
import { Send, Sparkles, Trash2, ArrowRight, UserCircle, Target, Clock } from 'lucide-react';
import type { CareerAdvisorMessage, LearnerContext } from '@/types';
import {
  getConversation,
  getWelcomeMessage,
  askQuestion,
  clearConversation,
} from '@/services/ai/careerAdvisorService';
import { getLearnerProfile, getSkillsByIds, getRoadmap, getProgress } from '@/services/dataService';

const suggestedQuestions = [
  'What should I learn next?',
  'What career paths fit my skills?',
  'How can I become a frontend developer?',
  'What projects should I build?',
  'Should I learn TypeScript?',
  'How do I prepare for a software engineering career?',
];

export function LearnerCareerAdvisorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CareerAdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = getConversation();
    if (existing.length === 0 && user) {
      const welcome = getWelcomeMessage(user.name);
      setMessages([welcome]);
    } else {
      setMessages(existing);
    }
  }, [user, refreshKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!user) return null;

  const profile = getLearnerProfile(user.id);
  const skills = profile ? getSkillsByIds(profile.skillIds) : [];
  const roadmap = getRoadmap(user.id);
  const progress = getProgress(user.id);

  const context: LearnerContext = {
    name: user.name,
    skills: skills.map((s) => ({ name: s.name, level: profile?.skillLevels[s.id] ?? 'beginner' })),
    learningGoal: profile?.learningGoal ?? 'Not set yet',
    targetTimeframe: profile?.targetTimeframe ?? 'Not set',
    availableHoursPerWeek: profile?.availableHoursPerWeek ?? 0,
    roadmapGoal: roadmap?.goal,
    roadmapProgress: progress.percentage,
  };

  const profileComplete = profile?.profileComplete ?? false;

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    const question = input.trim();
    setInput('');

    // Simulated thinking delay
    setTimeout(() => {
      askQuestion(question, context);
      setMessages(getConversation());
      setLoading(false);
    }, 800);
  };

  const handleSuggested = (q: string) => {
    setInput(q);
  };

  const handleClear = () => {
    clearConversation();
    const welcome = getWelcomeMessage(user.name);
    setMessages([welcome]);
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="AI Career Advisor"
        description="Get personalized career guidance based on your skills, goals, and progress."
        action={
          <Button variant="secondary" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4" /> New Conversation
          </Button>
        }
      />

      {!profileComplete ? (
        <div className="card">
          <EmptyState
            icon={<UserCircle className="w-6 h-6" />}
            title="Complete your profile first"
            description="Your Career Advisor can provide more personalized guidance once you add your skills and career goals."
            action={<Link to="/learner/profile"><Button>Complete Profile</Button></Link>}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2">
            <div className="card flex flex-col h-[600px]">
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <Avatar src={user.avatar} name={user.name} size="sm" />
                    )}
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block text-left rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-brand text-white rounded-tr-sm'
                          : 'bg-ink-50 text-ink rounded-tl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      </div>
                      {msg.includeRoadmapLink && (
                        <div className="mt-2">
                          <Button size="sm" variant="secondary" onClick={() => navigate('/learner/roadmap/create')}>
                            <Sparkles className="w-3.5 h-3.5" /> Generate My Roadmap
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-ink-50 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-ink-300 animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-ink-300 animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-ink-300 animate-pulse" style={{ animationDelay: '300ms' }} />
                        <span className="text-sm text-ink-400 ml-1.5">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggested questions */}
              {messages.length <= 1 && !loading && (
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggested(q)}
                      className="text-sm px-3 py-1.5 rounded-full border border-ink-200 text-ink-500 hover:border-brand hover:text-brand-700 hover:bg-brand-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-ink-100 p-4">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Ask a question about your career..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <Button type="submit" disabled={!input.trim() || loading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Context panel */}
          <div>
            <div className="card p-5">
              <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-brand" /> Your Career Context
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-1.5">Career Goal</p>
                  <p className="text-sm font-medium text-ink">{context.learningGoal}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-1.5">Current Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length > 0 ? skills.map((s) => (
                      <Badge key={s.id} variant="gray">{s.name}</Badge>
                    )) : <span className="text-sm text-ink-400">No skills selected</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-1.5">Skill Levels</p>
                  <div className="space-y-1">
                    {skills.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-600">{s.name}</span>
                        <Badge variant="outline">{profile?.skillLevels[s.id] ?? 'beginner'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-ink-50">
                  <span className="text-sm text-ink-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Hours/week</span>
                  <span className="text-sm font-medium text-ink">{context.availableHoursPerWeek}h</span>
                </div>
                {roadmap && (
                  <div className="pt-3 border-t border-ink-50">
                    <p className="text-xs font-medium text-ink-400 uppercase tracking-wider mb-1.5">Roadmap Progress</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink-600">{roadmap.goal}</span>
                      <span className="text-sm font-semibold text-brand">{progress.percentage}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-5 mt-4">
              <h3 className="font-semibold text-ink mb-3">Related Actions</h3>
              <Link to="/learner/roadmap/create" className="flex items-center justify-between p-3 rounded-lg hover:bg-ink-50 transition-colors group">
                <span className="text-sm text-ink-600">Generate Learning Roadmap</span>
                <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand" />
              </Link>
              <Link to="/learner/mentors" className="flex items-center justify-between p-3 rounded-lg hover:bg-ink-50 transition-colors group">
                <span className="text-sm text-ink-600">Find Mentors</span>
                <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand" />
              </Link>
              <Link to="/learner/progress" className="flex items-center justify-between p-3 rounded-lg hover:bg-ink-50 transition-colors group">
                <span className="text-sm text-ink-600">View My Progress</span>
                <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
