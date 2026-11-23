import { createClient } from '@/lib/supabase/client';
import type { EmployerContactRequest } from '@/types';

interface DbContactRequest {
  id: string;
  learner_id: string;
  employer_name: string;
  employer_email: string;
  company_name: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

function mapContactRequest(row: DbContactRequest): EmployerContactRequest {
  return {
    id: row.id,
    learnerId: row.learner_id,
    employerName: row.employer_name,
    employerEmail: row.employer_email,
    companyName: row.company_name,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createEmployerContactRequest(
  request: Omit<EmployerContactRequest, 'id' | 'createdAt' | 'status'>
): Promise<EmployerContactRequest | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('employer_contact_requests')
    .insert({
      learner_id: request.learnerId,
      employer_name: request.employerName,
      employer_email: request.employerEmail,
      company_name: request.companyName,
      message: request.message,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[contactRequestService] createEmployerContactRequest error:', error);
    return null;
  }

  // Notify learner about the new contact request
  try {
    await supabase.from('notifications').insert({
      user_id: request.learnerId,
      title: 'New Employer Contact Request',
      message: `${request.employerName} from ${request.companyName} sent you an inquiry: "${request.message.slice(0, 75)}${request.message.length > 75 ? '...' : ''}"`,
      read: false,
    });
  } catch (notifErr) {
    console.warn('[contactRequestService] failed to create notification:', notifErr);
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
): Promise<EmployerContactRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('employer_contact_requests')
    .update({ status })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[contactRequestService] updateContactRequestStatus error:', error);
    return null;
  }

  return mapContactRequest(data as DbContactRequest);
}
