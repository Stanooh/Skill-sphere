'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatView } from '@/components/messaging/ChatView';
import { MessageSquare, AlertCircle } from 'lucide-react';
import type { Conversation } from '@/types';
import {
  getUserConversations,
  getOrCreateConversation,
  subscribeToUserConversations,
} from '@/services/messagingService';

export function MessagesView() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const mentorIdParam = searchParams.get('mentorId');
  const convIdParam = searchParams.get('conversationId');

  const selectedConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedConvIdRef.current = selectedConv?.id ?? null;
  }, [selectedConv]);

  const loadConversations = useCallback(async () => {
    if (!user) return null;
    setError(null);
    setLoading(true);
    try {
      const list = await getUserConversations(user.id);
      setConversations(list);
      return list;
    } catch (err: unknown) {
      const errMsg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to load conversations from database';
      setError(errMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load and real-time subscription
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;

    void (async () => {
      const list = await loadConversations();
      if (!active || !list) return;

      // Handle mentorId parameter: open or create conversation with this mentor
      if (mentorIdParam && user.id !== mentorIdParam) {
        const existing = list.find(
          (c) =>
            (c.learnerId === user.id && c.mentorId === mentorIdParam) ||
            (c.mentorId === user.id && c.learnerId === mentorIdParam)
        );

        if (existing) {
          setSelectedConv(existing);
          setShowMobileChat(true);
        } else {
          try {
            const created = await getOrCreateConversation(
              user.role === 'mentor' ? mentorIdParam : user.id,
              user.role === 'mentor' ? user.id : mentorIdParam
            );
            if (created && active) {
              const reloaded = await loadConversations();
              const found = reloaded?.find((c) => c.id === created.id) ?? created;
              setSelectedConv(found);
              setShowMobileChat(true);
            }
          } catch (createErr) {
            console.error('[messaging] Error auto-initiating conversation with mentor', createErr);
          }
        }
      } else if (convIdParam) {
        const found = list.find((c) => c.id === convIdParam);
        if (found && active) {
          setSelectedConv(found);
          setShowMobileChat(true);
        }
      } else if (list.length > 0 && !selectedConvIdRef.current) {
        // default select first on desktop
        setSelectedConv(list[0]);
      }
    })();

    const unsubscribe = subscribeToUserConversations(user.id, () => {
      void loadConversations();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, authLoading, mentorIdParam, convIdParam, loadConversations]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-2" />
          <span className="ml-3 text-sm text-ink-400">Verifying session...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-ink">Authentication Required</h2>
          <p className="text-sm text-ink-400">Please sign in to access your messages.</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleSelect = (conv: Conversation) => {
    setSelectedConv(conv);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8.5rem)] min-h-[500px] card overflow-hidden border border-ink-200 p-0 flex">
        {/* Left column: Conversation list */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
            showMobileChat ? 'hidden md:block' : 'block'
          }`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedConv?.id ?? null}
            onSelect={handleSelect}
            loading={loading}
            error={error}
            onRetry={() => {
              void loadConversations();
            }}
          />
        </div>

        {/* Right column: Chat view or placeholder */}
        <div
          className={`flex-1 h-full min-w-0 ${
            showMobileChat ? 'block' : 'hidden md:block'
          }`}
        >
          {selectedConv ? (
            <ChatView
              key={selectedConv.id}
              conversation={selectedConv}
              currentUserId={user.id}
              onBack={handleBackToList}
              onMessageSent={() => {
                void loadConversations();
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-ink-400 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-ink-700/40 flex items-center justify-center text-ink-300">
                <MessageSquare className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-lg font-bold text-ink">Select a conversation</h3>
              <p className="text-sm max-w-sm">
                Choose a conversation from the left to read messages or reach out to your mentors and learners.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
