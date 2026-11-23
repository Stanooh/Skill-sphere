'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CalendarDays, ClipboardList, BookOpen, Users, ArrowRight, AlertCircle, Star } from 'lucide-react';
import {
  getSessionsForMentor,
  getWorkshopsForMentor,
} from '@/services/dataService';
import { getMyMentorProfile } from '@/services/mentorProfileService';
import { getMentorReviews, getMentorRatingSummary } from '@/services/mentorReviewService';
import type { MentorProfile, MentorReview, MentorRatingSummary } from '@/types';

export function MentorDashboard() {
  const { user } = useAuth();
  const [refreshKey] = useState(0);
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [reviews, setReviews] = useState<MentorReview[]>([]);
  const [ratingSummary, setRatingSummary] = useState<MentorRatingSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [prof, revs, summary] = await Promise.all([
        getMyMentorProfile(user.id),
        getMentorReviews(user.id),
        getMentorRatingSummary(user.id),
      ]);
      if (!active) return;
      setProfile(prof);
      setReviews(revs);
      setRatingSummary(summary);
    };
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const profileReady = profile?.profileComplete === true;
  const sessions = getSessionsForMentor(user.id);
  const pendingRequests = sessions.filter((s) => s.status === 'pending');
  const acceptedSessions = sessions.filter((s) => s.status === 'accepted');
  const workshops = getWorkshopsForMentor(user.id);

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Manage your mentorship requests, sessions, and workshops." />

      {!profileReady && (
        <div className="card p-5 mb-6 border-l-4 border-amber-500 bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Your profile is not visible to learners yet</p>
              <p className="text-sm text-ink-400 mt-1">Complete your profile with a professional title, bio, at least one skill, and availability to appear in mentor search results.</p>
              <Link href="/mentor/profile" className="inline-block mt-3">
                <Button size="sm" variant="secondary">
                  Complete your profile <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Requests" value={pendingRequests.length} icon={<ClipboardList className="w-5 h-5" />} />
        <StatCard label="Confirmed Sessions" value={acceptedSessions.length} icon={<CalendarDays className="w-5 h-5" />} />
        <StatCard label="Active Workshops" value={workshops.filter((w) => w.status === 'published').length} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard
          label="Rating"
          value={
            (ratingSummary ? ratingSummary.totalReviews : (profile?.reviewCount ?? 0)) > 0
              ? (ratingSummary ? ratingSummary.averageRating : (profile?.rating ?? 0)).toFixed(1)
              : 'No ratings'
          }
          icon={<Users className="w-5 h-5" />}
          sublabel={
            (ratingSummary ? ratingSummary.totalReviews : (profile?.reviewCount ?? 0)) > 0
              ? `${ratingSummary ? ratingSummary.totalReviews : profile?.reviewCount} ${
                  (ratingSummary ? ratingSummary.totalReviews : profile?.reviewCount) === 1
                    ? 'review'
                    : 'reviews'
                }`
              : '0 reviews'
          }
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending requests */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Pending Requests</h2>
            <Link href="/mentor/requests"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
          {pendingRequests.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-6 h-6" />}
              title="No pending requests"
              description="New mentorship requests will appear here."
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-400">{new Date(s.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <Link href="/mentor/requests"><Button size="sm">Review</Button></Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming sessions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Upcoming Sessions</h2>
            <Link href="/mentor/sessions"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
          {acceptedSessions.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="No upcoming sessions"
              description="Accepted sessions will appear here."
            />
          ) : (
            <div className="space-y-3">
              {acceptedSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-400">{new Date(s.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-green-700">Confirmed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workshops */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Your Workshops</h2>
          <Link href="/mentor/workshops"><Button variant="ghost" size="sm">Manage <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        {workshops.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No workshops yet"
              description="Create a workshop to share your expertise with learners."
              action={<Link href="/mentor/workshops"><Button>Create Workshop</Button></Link>}
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workshops.slice(0, 3).map((w) => (
              <div key={w.id} className="card p-5">
                <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                <p className="text-sm text-ink-400 mb-3">{new Date(w.date).toLocaleDateString()}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-400">{w.registeredLearnerIds.length}/{w.capacity} registered</span>
                  <span className="text-ink-400">{w.durationMinutes} min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learner Feedback & Reviews */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Learner Reviews & Ratings</h2>
            <p className="text-sm text-ink-400">Feedback and performance metrics from learners you have mentored.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <div className="card p-6 flex flex-col justify-center">
            <div className="text-center pb-4 border-b border-ink-100">
              <div className="text-4xl font-extrabold text-ink">
                {ratingSummary && ratingSummary.totalReviews > 0 ? ratingSummary.averageRating.toFixed(1) : '—'}
              </div>
              <div className="flex items-center justify-center gap-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      ratingSummary && ratingSummary.averageRating >= star
                        ? 'text-amber-500 fill-amber-500'
                        : ratingSummary && ratingSummary.averageRating >= star - 0.5
                        ? 'text-amber-500 fill-amber-500/50'
                        : 'text-ink-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-ink-400">
                {ratingSummary && ratingSummary.totalReviews > 0
                  ? `Based on ${ratingSummary.totalReviews} ${ratingSummary.totalReviews === 1 ? 'review' : 'reviews'}`
                  : 'No reviews received yet'}
              </p>
            </div>

            {/* Distribution Bars */}
            <div className="space-y-2 pt-4">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingSummary?.distribution[stars as 1 | 2 | 3 | 4 | 5] ?? 0;
                const total = ratingSummary?.totalReviews ?? 0;
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-ink-400 flex items-center gap-1 font-medium">
                      {stars} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </span>
                    <div className="flex-1 bg-ink-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-ink-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 card p-6">
            <h3 className="font-semibold text-ink mb-4">Recent Reviews</h3>
            {reviews.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                title="No reviews yet"
                description="Once learners complete sessions or attend workshops with you, their verified reviews will appear here."
              />
            ) : (
              <div className="space-y-4 divide-y divide-ink-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={rev.learnerAvatar} name={rev.learnerName || 'Learner'} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-ink">{rev.learnerName || 'Learner'}</p>
                          <p className="text-xs text-ink-400">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              rev.rating >= star
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-ink-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rev.review ? (
                      <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line pl-10">
                        {rev.review}
                      </p>
                    ) : (
                      <p className="text-xs text-ink-400 italic pl-10">Rating provided without written comment.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
