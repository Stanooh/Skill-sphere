'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getMentorReviews,
  getMentorRatingSummary,
  checkRatingEligibility,
  submitMentorReview,
  deleteMentorReview,
} from '@/services/mentorReviewService';
import type { MentorReview, MentorRatingSummary, RatingEligibility } from '@/types';

interface MentorRatingSectionProps {
  mentorId: string;
  mentorName: string;
  onRatingUpdated?: (summary: MentorRatingSummary) => void;
}

export function MentorRatingSection({
  mentorId,
  mentorName,
  onRatingUpdated,
}: MentorRatingSectionProps) {
  const { user } = useAuth();
  const { show } = useToast();

  const [reviews, setReviews] = useState<MentorReview[]>([]);
  const [summary, setSummary] = useState<MentorRatingSummary | null>(null);
  const [eligibility, setEligibility] = useState<RatingEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [revs, summ, elig] = await Promise.all([
      getMentorReviews(mentorId),
      getMentorRatingSummary(mentorId),
      checkRatingEligibility(mentorId, user?.id),
    ]);

    setReviews(revs);
    setSummary(summ);
    setEligibility(elig);
    if (onRatingUpdated) onRatingUpdated(summ);

    if (elig.existingReview) {
      setRating(elig.existingReview.rating);
      setReviewText(elig.existingReview.review);
    } else {
      setRating(5);
      setReviewText('');
    }

    setLoading(false);
  }, [mentorId, user?.id, onRatingUpdated]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await loadData();
    };
    void run();
    return () => {
      active = false;
    };
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const result = await submitMentorReview({
      mentorId,
      rating,
      review: reviewText,
    });

    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Failed to submit review.');
      return;
    }

    show(
      eligibility?.existingReview ? 'Your review has been updated.' : 'Thank you! Your review was submitted.',
      'success'
    );
    setModalOpen(false);
    await loadData();
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    const res = await deleteMentorReview(reviewId);
    if (res.success) {
      show('Your review has been deleted.', 'info');
      await loadData();
    } else {
      show(res.error || 'Failed to delete review.', 'error');
    }
  };

  const isSelf = user?.id === mentorId;
  const isLearner = user?.role === 'learner';
  const hasExistingReview = !!eligibility?.existingReview;

  return (
    <div className="card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-ink">Ratings & Reviews</h2>
          <p className="text-xs text-ink-400 mt-0.5">
            Real feedback from verified learners who interacted with {mentorName}.
          </p>
        </div>

        {isLearner && !isSelf && (
          <div>
            {eligibility?.canRate ? (
              <Button
                variant={hasExistingReview ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setModalOpen(true)}
                className="gap-2 shrink-0"
              >
                {hasExistingReview ? (
                  <>
                    <Edit3 className="w-4 h-4" /> Edit Your Review
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Rate Mentor
                  </>
                )}
              </Button>
            ) : (
              <div className="text-xs text-ink-400 flex items-center gap-1.5 bg-ink-50 p-2.5 rounded-lg border border-ink-100">
                <AlertCircle className="w-4 h-4 text-ink-300 shrink-0" />
                <span>{eligibility?.reason || 'Interact with this mentor to leave a review.'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-ink-300">Loading reviews...</div>
      ) : summary && summary.totalReviews > 0 ? (
        <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-6 items-center">
          {/* Average Rating Block */}
          <div className="flex flex-col items-center justify-center p-4 bg-ink-50 rounded-xl border border-ink-100 text-center">
            <span className="text-4xl font-extrabold text-ink">{summary.averageRating.toFixed(1)}</span>
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(summary.averageRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-ink-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-ink-400">
              {summary.totalReviews} {summary.totalReviews === 1 ? 'rating' : 'ratings'}
            </span>
          </div>

          {/* Rating Distribution Bars */}
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = summary.distribution[String(stars) as '1' | '2' | '3' | '4' | '5'] || 0;
              const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs text-ink-400">
                  <span className="w-12 flex items-center gap-1 justify-end font-medium">
                    {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-ink-300">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center bg-ink-50 rounded-xl border border-dashed border-ink-200">
          <Star className="w-8 h-8 text-ink-300 mx-auto mb-2" />
          <p className="font-semibold text-ink text-sm">No ratings yet</p>
          <p className="text-xs text-ink-400 mt-1 max-w-sm mx-auto">
            {mentorName} has not received any learner reviews yet. Complete a mentorship session or workshop with them to share your feedback.
          </p>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-ink-100">
          <h3 className="text-sm font-semibold text-ink">Recent Reviews ({reviews.length})</h3>
          <div className="space-y-3">
            {reviews.map((rev) => {
              const isAuthor = user?.id === rev.learnerId;
              return (
                <div key={rev.id} className="p-4 rounded-xl bg-ink-50 border border-ink-100 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={rev.learnerAvatar} name={rev.learnerName || 'Learner'} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{rev.learnerName}</span>
                          {isAuthor && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand/10 text-brand font-medium">
                              Your review
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-300">
                          {new Date(rev.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-200'
                            }`}
                          />
                        ))}
                      </div>

                      {isAuthor && (
                        <div className="flex items-center gap-1 pl-2 border-l border-ink-200">
                          <button
                            onClick={() => setModalOpen(true)}
                            className="text-ink-400 hover:text-brand transition-colors p-1"
                            title="Edit Review"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rev.id)}
                            className="text-ink-400 hover:text-red-500 transition-colors p-1"
                            title="Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {rev.review ? (
                    <p className="text-xs text-ink-500 leading-relaxed pl-9">{rev.review}</p>
                  ) : (
                    <p className="text-xs text-ink-300 italic pl-9">Rating submitted without written comments.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review Submission Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={hasExistingReview ? `Update Review for ${mentorName}` : `Rate & Review ${mentorName}`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="label mb-2 block font-medium">Rating (1 to 5 Stars)</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-ink-200'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-semibold text-sm text-ink">
                  {rating === 1 && '1 star — Needs improvement'}
                  {rating === 2 && '2 stars — Fair'}
                  {rating === 3 && '3 stars — Good'}
                  {rating === 4 && '4 stars — Very good'}
                  {rating === 5 && '5 stars — Outstanding'}
                </span>
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block font-medium">
                Written Review <span className="text-ink-300 font-normal">(Optional)</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience working with this mentor, how they helped your skills, communication, etc."
                className="input min-h-[100px] text-sm"
                maxLength={1000}
              />
              <p className="text-[11px] text-ink-300 text-right mt-1">
                {reviewText.length}/1000 characters
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : hasExistingReview ? 'Update Review' : 'Submit Review'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
