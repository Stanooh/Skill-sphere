import { createClient } from '@/lib/supabase/client';
import type { EmployerContactRequest } from '@/types';

interface DbContactRequest {
  id: string;
  learner_id: string;
  employer_name: string;
  employer_email: string;
  employer_role: string | null;
  company_name: string;
  reason: string | null;
  message: string;
  sender_user_id: string | null;
  conversation_id: string | null;
  learner_reply: string | null;
  responded_at: string | null;
  status: EmployerContactRequest['status'];
  created_at: string;
}

function mapContactRequest(row: DbContactRequest): EmployerContactRequest {
  return {
    id: row.id,
    learnerId: row.learner_id,
    employerName: row.employer_name,
    employerEmail: row.employer_email,
    employerRole: row.employer_role || undefined,
    companyName: row.company_name,
    reason: row.reason || undefined,
    message: row.message,
    senderUserId: row.sender_user_id || undefined,
    conversationId: row.conversation_id || undefined,
    learnerReply: row.learner_reply || undefined,
    respondedAt: row.responded_at || undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createEmployerContactRequest(input: {
  learnerId: string;
  employerName: string;
  employerEmail: string;
  employerRole?: string;
  companyName: string;
  reason?: string;
  message: string;
}): Promise<EmployerContactRequest> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const senderUserId = authData.user?.id ?? null;

  const { data, error } = await supabase
    .from('employer_contact_requests')
    .insert({
      learner_id: input.learnerId,
      employer_name: input.employerName.trim(),
      employer_email: input.employerEmail.trim(),
      employer_role: (input.employerRole || '').trim(),
      company_name: input.companyName.trim(),
      reason: (input.reason || '').trim(),
      message: input.message.trim(),
      sender_user_id: senderUserId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[contactRequestService] createEmployerContactRequest error:', error);
    throw new Error(error?.message || 'Could not send contact request. This learner may not be eligible.');
  }

  return mapContactRequest(data as DbContactRequest);
}

export async function getEmployerContactRequestsForLearner(learnerId: string): Promise<EmployerContactRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('employer_contact_requests')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[contactRequestService] getEmployerContactRequestsForLearner error:', error);
    return [];
  }

  return (data as DbContactRequest[]).map(mapContactRequest);
}

export async function getAllEmployerContactRequests(): Promise<EmployerContactRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('employer_contact_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[contactRequestService] getAllEmployerContactRequests error:', error);
    return [];
  }

  return (data as DbContactRequest[]).map(mapContactRequest);
}

export async function updateContactRequestStatus(
  requestId: string,
  status: EmployerContactRequest['status']
): Promise<EmployerContactRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('employer_contact_requests')
    .update({ status })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[contactRequestService] updateContactRequestStatus error:', error);
    throw new Error(error?.message || 'Failed to update contact request status.');
  }

  return mapContactRequest(data as DbContactRequest);
}

export async function replyToContactRequest(input: {
  requestId: string;
  learnerId: string;
  replyMessage: string;
  senderUserId?: string;
}): Promise<EmployerContactRequest> {
  const trimmed = input.replyMessage.trim();
  if (!trimmed) {
    throw new Error('Please enter a reply message.');
  }

  const supabase = createClient();
  let conversationId: string | null = null;

  // If the sender is an authenticated SkillSphere user, create/reuse a conversation and send a message
  if (input.senderUserId && input.senderUserId !== input.learnerId) {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('learner_id', input.learnerId)
      .eq('mentor_id', input.senderUserId)
      .maybeSingle();

    if (existingConv?.id) {
      conversationId = existingConv.id;
    } else {
      const { data: createdConv } = await supabase
        .from('conversations')
        .insert({
          learner_id: input.learnerId,
          mentor_id: input.senderUserId,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      conversationId = createdConv?.id ?? null;
    }

    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: input.learnerId,
        content: trimmed,
      });
    }
  }

  const { data, error } = await supabase
    .from('employer_contact_requests')
    .update({
      learner_reply: trimmed,
      responded_at: new Date().toISOString(),
      status: 'responded',
      ...(conversationId ? { conversation_id: conversationId } : {}),
    })
    .eq('id', input.requestId)
    .eq('learner_id', input.learnerId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[contactRequestService] replyToContactRequest error:', error);
    throw new Error(error?.message || 'Failed to send reply.');
  }

  return mapContactRequest(data as DbContactRequest);
}
