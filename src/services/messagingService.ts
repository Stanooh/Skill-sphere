import { createClient } from '@/lib/supabase/client';
import type { Conversation, DirectMessage, ConversationParticipant } from '@/types';

interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface DbConversationWithParticipants {
  id: string;
  learner_id: string;
  mentor_id: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  learner?: DbProfile | null;
  mentor?: DbProfile | null;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

function mapMessage(row: DbMessage): DirectMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * Gets or creates a conversation between a learner and a mentor.
 */
export async function getOrCreateConversation(
  learnerId: string,
  mentorId: string
): Promise<Conversation | null> {
  const supabase = createClient();

  // Try finding existing conversation
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select(`
      id,
      learner_id,
      mentor_id,
      last_message_at,
      created_at,
      updated_at,
      learner:profiles!conversations_learner_id_fkey(id, full_name, email, role),
      mentor:profiles!conversations_mentor_id_fkey(id, full_name, email, role)
    `)
    .eq('learner_id', learnerId)
    .eq('mentor_id', mentorId)
    .maybeSingle();

  if (findError) {
    console.error('[messaging] Conversation lookup failed:', {
      message: findError.message,
      code: findError.code,
      details: findError.details,
      hint: findError.hint,
      learnerId,
      mentorId,
    });
    throw findError;
  }

  if (existing) {
    const row = existing as unknown as DbConversationWithParticipants;
    return {
      id: row.id,
      learnerId: row.learner_id,
      mentorId: row.mentor_id,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      otherUser: {
        id: row.mentor?.id || mentorId,
        name: row.mentor?.full_name || row.mentor?.email?.split('@')[0] || 'Mentor',
        email: row.mentor?.email || '',
        role: (row.mentor?.role as 'mentor') || 'mentor',
      },
    };
  }

  // Create new conversation
  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      learner_id: learnerId,
      mentor_id: mentorId,
      last_message_at: new Date().toISOString(),
    })
    .select(`
      id,
      learner_id,
      mentor_id,
      last_message_at,
      created_at,
      updated_at,
      learner:profiles!conversations_learner_id_fkey(id, full_name, email, role),
      mentor:profiles!conversations_mentor_id_fkey(id, full_name, email, role)
    `)
    .single();

  if (createError) {
    console.error('[messaging] Conversation creation failed:', {
      message: createError.message,
      code: createError.code,
      details: createError.details,
      hint: createError.hint,
      learnerId,
      mentorId,
    });
    throw createError;
  }

  const row = created as unknown as DbConversationWithParticipants;
  return {
    id: row.id,
    learnerId: row.learner_id,
    mentorId: row.mentor_id,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    otherUser: {
      id: row.mentor?.id || mentorId,
      name: row.mentor?.full_name || row.mentor?.email?.split('@')[0] || 'Mentor',
      email: row.mentor?.email || '',
      role: (row.mentor?.role as 'mentor') || 'mentor',
    },
  };
}

/**
 * Loads all conversations for the authenticated user with other participant profile details and last message preview.
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const supabase = createClient();

  // Fetch conversations where user is learner or mentor with embedded participant profiles
  const { data: convData, error: convError } = await supabase
    .from('conversations')
    .select(`
      id,
      learner_id,
      mentor_id,
      last_message_at,
      created_at,
      updated_at,
      learner:profiles!conversations_learner_id_fkey(id, full_name, email, role),
      mentor:profiles!conversations_mentor_id_fkey(id, full_name, email, role)
    `)
    .or(`learner_id.eq.${userId},mentor_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (convError) {
    console.error('[messaging] Conversation query failed:', {
      message: convError.message,
      code: convError.code,
      details: convError.details,
      hint: convError.hint,
      userId,
    });
    throw convError;
  }

  if (!convData) return [];

  const rows = convData as unknown as DbConversationWithParticipants[];
  if (rows.length === 0) return [];

  // Fetch latest message and unread count for each conversation
  const conversations: Conversation[] = await Promise.all(
    rows.map(async (row) => {
      const isLearner = row.learner_id === userId;
      const otherDbProfile = isLearner ? row.mentor : row.learner;
      const otherId = isLearner ? row.mentor_id : row.learner_id;

      const otherUser: ConversationParticipant = {
        id: otherId,
        name: otherDbProfile?.full_name || otherDbProfile?.email?.split('@')[0] || 'User',
        email: otherDbProfile?.email || '',
        role: (otherDbProfile?.role as 'learner' | 'mentor' | 'admin') || (isLearner ? 'mentor' : 'learner'),
      };

      // Get last message
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', row.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count (messages sent by other user where read_at is null)
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', row.id)
        .neq('sender_id', userId)
        .is('read_at', null);

      return {
        id: row.id,
        learnerId: row.learner_id,
        mentorId: row.mentor_id,
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        otherUser,
        lastMessage: lastMsg?.content,
        unreadCount: unreadCount ?? 0,
      };
    })
  );

  return conversations;
}

/**
 * Fetches all messages for a conversation ordered chronologically.
 */
export async function getConversationMessages(conversationId: string): Promise<DirectMessage[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[messaging] Messages query failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      conversationId,
    });
    throw error;
  }

  if (!data) return [];
  return (data as DbMessage[]).map(mapMessage);
}

/**
 * Sends a message within a conversation.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<DirectMessage | null> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 5000) return null;

  const supabase = createClient();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmed,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[messaging] Send message failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      conversationId,
      senderId,
    });
    throw error;
  }

  return mapMessage(data as DbMessage);
}

/**
 * Marks unread messages in a conversation as read.
 */
export async function markConversationRead(
  conversationId: string,
  currentUserId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .is('read_at', null);

  if (error) {
    console.error('[messaging] Error marking messages read:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

/**
 * Subscribes to real-time incoming messages in a specific conversation.
 */
export function subscribeToConversation(
  conversationId: string,
  onNewMessage: (msg: DirectMessage) => void
): () => void {
  const supabase = createClient();

  const channel = supabase
    .channel(`chat_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(mapMessage(payload.new as DbMessage));
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to conversation updates (new conversations or updated last_message_at).
 */
export function subscribeToUserConversations(
  userId: string,
  onConversationChange: () => void
): () => void {
  const supabase = createClient();

  const channel = supabase
    .channel(`user_conversations_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onConversationChange();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
