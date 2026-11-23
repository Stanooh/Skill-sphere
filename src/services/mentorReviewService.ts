import { createClient } from '@/lib/supabase/client';
import type { MentorReview, MentorRatingSummary, RatingEligibility } from '@/types';

type DbReviewRow = {
  id: string;
  mentor_id: string;
  learner_id: string;
  session_id: string | null;
  workshop_id: string | null;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

function mapReview(row: DbReviewRow): MentorReview {
  return {
    id: row.id,
    mentorId: row.mentor_id,
    learnerId: row.learner_id,
    learnerName: row.profiles?.full_name || 'SkillSphere Learner',
    learnerAvatar: row.profiles?.avatar_url || undefined,
    sessionId: row.session_id ?? undefined,
    workshopId: row.workshop_id ?? undefined,
    rating: row.rating,
    review: row.review,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Checks if the currently authenticated user (or given learnerId) is eligible
 * to rate a mentor based on authentic platform interactions (sessions or workshops).
 */
export async function checkRatingEligibility(
  mentorId: string,
  providedLearnerId?: string
): Promise<RatingEligibility> {
  const supabase = createClient();

  let learnerId = providedLearnerId;
  if (!learnerId) {
    const { data: authData } = await supabase.auth.getUser();
    learnerId = authData.user?.id;
  }

  if (!learnerId) {
    return {
      canRate: false,
      reason: 'Sign in as a learner to rate this mentor.',
    };
  }

  if (learnerId === mentorId) {
    return {
      canRate: false,
      reason: 'You cannot rate yourself.',
    };
  }

  // Check if learner already submitted a review
  const { data: existingReviewData } = await supabase
    .from('mentor_reviews')
    .select('*, profiles:learner_id(full_name, avatar_url)')
    .eq('mentor_id', mentorId)
    .eq('learner_id', learnerId)
    .maybeSingle();

  const existingReview = existingReviewData ? mapReview(existingReviewData as DbReviewRow) : null;

  // Verify interaction eligibility via database RPC
  const { data: eligible, error: rpcErr } = await supabase.rpc('can_learner_rate_mentor', {
    p_learner_id: learnerId,
    p_mentor_id: mentorId,
  });

  if (rpcErr || !eligible) {
    // If they already have an existing review, they can still view/edit it
    if (existingReview) {
      return {
        canRate: true,
        existingReview,
      };
    }

    return {
      canRate: false,
      reason: 'You can only rate mentors with whom you have an accepted or completed session, or attended their workshop.',
      existingReview: null,
    };
  }

  return {
    canRate: true,
    existingReview,
  };
}

/**
 * Loads all reviews for a mentor, ordered by most recent first.
 */
export async function getMentorReviews(mentorId: string): Promise<MentorReview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_reviews')
    .select('*, profiles:learner_id(full_name, avatar_url)')
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[mentorReviewService] getMentorReviews error:', error);
    return [];
  }

  return (data as DbReviewRow[]).map(mapReview);
}

/**
 * Loads the rating summary (average rating, count, distribution) for a mentor.
 */
export async function getMentorRatingSummary(mentorId: string): Promise<MentorRatingSummary> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_mentor_rating_summary', {
    p_mentor_id: mentorId,
  });

  if (error || !data) {
    console.warn('[mentorReviewService] get_mentor_rating_summary RPC error, falling back to manual aggregation:', error);
    // Fallback: manually aggregate
    const reviews = await getMentorReviews(mentorId);
    const total = reviews.length;
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;
    for (const r of reviews) {
      sum += r.rating;
      distribution[String(r.rating)] = (distribution[String(r.rating)] || 0) + 1;
    }
    const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0.0;
    return {
      mentorId,
      averageRating: avg,
      totalReviews: total,
      distribution: distribution as MentorRatingSummary['distribution'],
    };
  }

  return data as MentorRatingSummary;
}

/**
 * Submits or updates a learner's review for a mentor.
 */
export async function submitMentorReview(input: {
  mentorId: string;
  rating: number;
  review?: string;
  sessionId?: string;
  workshopId?: string;
}): Promise<{ success: boolean; review?: MentorReview; error?: string }> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const learnerId = authData.user?.id;

  if (!learnerId) {
    return { success: false, error: 'You must be signed in to submit a rating.' };
  }

  if (learnerId === input.mentorId) {
    return { success: false, error: 'Mentors cannot rate themselves.' };
  }

  const ratingInt = Math.round(input.rating);
  if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return { success: false, error: 'Rating must be an integer between 1 and 5 stars.' };
  }

  const reviewText = (input.review || '').trim();

  // Validate interaction eligibility
  const eligibility = await checkRatingEligibility(input.mentorId, learnerId);
  if (!eligibility.canRate) {
    return { success: false, error: eligibility.reason || 'You are not eligible to rate this mentor.' };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('mentor_reviews')
    .upsert(
      {
        mentor_id: input.mentorId,
        learner_id: learnerId,
        session_id: input.sessionId || null,
        workshop_id: input.workshopId || null,
        rating: ratingInt,
        review: reviewText,
        updated_at: now,
      },
      { onConflict: 'mentor_id,learner_id' }
    )
    .select('*, profiles:learner_id(full_name, avatar_url)')
    .single();

  if (error || !data) {
    console.error('[mentorReviewService] submitMentorReview error:', error);
    return { success: false, error: error?.message || 'Failed to save your review. Please try again.' };
  }

  const savedReview = mapReview(data as DbReviewRow);

  // Send notification to mentor about new or updated rating
  try {
    await supabase.from('notifications').insert({
      user_id: input.mentorId,
      notification_type: 'mentor_review_received',
      title: 'New Rating & Review',
      message: `${savedReview.learnerName} gave you a ${ratingInt}-star rating${reviewText ? `: "${reviewText.slice(0, 70)}..."` : '.'}`,
      event_key: `review_${savedReview.id}`,
      read: false,
    });
  } catch {
    // Non-blocking
  }

  return { success: true, review: savedReview };
}

/**
 * Deletes a learner's review.
 */
export async function deleteMentorReview(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('mentor_reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('[mentorReviewService] deleteMentorReview error:', error);
    return { success: false, error: error.message || 'Failed to delete review.' };
  }

  return { success: true };
}
