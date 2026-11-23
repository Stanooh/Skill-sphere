import { createClient } from '@/lib/supabase/client';
import type { AdminActionLog } from '@/types';

interface DbAdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_id: string;
  target_type: string;
  note: string | null;
  created_at: string;
}

function mapLog(row: DbAdminLog): AdminActionLog {
  return {
    id: row.id,
    adminId: row.admin_id,
    action: row.action,
    targetId: row.target_id,
    targetType: row.target_type as AdminActionLog['targetType'],
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function recordAdminAction(action: {
  adminId: string;
  action: string;
  targetId: string;
  targetType: AdminActionLog['targetType'];
  note?: string;
}): Promise<AdminActionLog | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('admin_action_logs')
    .insert({
      admin_id: action.adminId,
      action: action.action,
      target_id: action.targetId,
      target_type: action.targetType,
      note: action.note || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[adminLogService] recordAdminAction error:', error);
    return null;
  }

  return mapLog(data as DbAdminLog);
}

export async function getAdminActionLogs(): Promise<AdminActionLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('admin_action_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('[adminLogService] getAdminActionLogs error:', error);
    return [];
  }

  return (data as DbAdminLog[]).map(mapLog);
}
