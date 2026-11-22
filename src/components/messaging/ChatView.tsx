'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Send, ArrowLeft, ExternalLink, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Conversation, DirectMessage } from '@/types';
import {
  getConversationMessages,
  sendMessage,
  markConversationRead,
  subscribeToConversation,
} from '@/services/messagingService';

interface ChatViewProps {
  conversation: Conversation;
  currentUserId: string;
  onBack?: () => void;
  onMessageSent?: () => void;
}

function formatMessageTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ChatView({
  conversation,
  currentUserId,
  onBack,
  onMessageSent,
}: ChatViewProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prevConvId, setPrevConvId] = useState(conversation.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (prevConvId !== conversation.id) {
    setPrevConvId(conversation.id);
    setLoading(true);
  }

  const otherUser = conversation.otherUser;

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load messages and subscribe to real-time events
  useEffect(() => {
    let active = true;

    void getConversationMessages(conversation.id).then((data) => {
      if (!active) return;
      setMessages(data);
      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 50);
    });

    // Mark messages as read
    void markConversationRead(conversation.id, currentUserId);

    // Subscribe to new real-time messages
    const unsubscribe = subscribeToConversation(conversation.id, (newMsg) => {
      setMessages((prev) => {
        // avoid duplicates
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => scrollToBottom('smooth'), 50);

      // If message is from other user, mark as read
      if (newMsg.senderId !== currentUserId) {
        void markConversationRead(conversation.id, currentUserId);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [conversation.id, currentUserId]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInputText('');

    const sent = await sendMessage(conversation.id, currentUserId, trimmed);
    if (sent) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
      onMessageSent?.();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-ink-900/40">
      {/* Header */}
      <div className="p-4 bg-ink-800 border-b border-ink-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-ink-400 hover:text-ink hover:bg-ink-700 rounded-lg transition-colors"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <Avatar src={otherUser?.avatar} name={otherUser?.name ?? 'User'} size="md" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink truncate">
                {otherUser?.name ?? 'User'}
              </h3>
              <Badge variant={otherUser?.role === 'mentor' ? 'brand' : 'gray'}>
                {otherUser?.role === 'mentor' ? 'Mentor' : 'Learner'}
              </Badge>
            </div>
            <p className="text-xs text-ink-400 truncate">{otherUser?.email}</p>
          </div>
        </div>

        {otherUser?.role === 'mentor' && (
          <Link href={`/mentors/${otherUser.id}`}>
            <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1.5 text-xs">
              View Profile <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-ink-400">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-ink">No messages yet</p>
            <p className="text-xs text-ink-400 max-w-sm">
              Send a message below to start your conversation with {otherUser?.name ?? 'your contact'}.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <Avatar src={otherUser?.avatar} name={otherUser?.name ?? 'User'} size="sm" />
                )}

                <div
                  className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    isMe
                      ? 'bg-brand text-white rounded-br-none'
                      : 'bg-ink-800 text-ink border border-ink-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-white/80' : 'text-ink-400'
                    }`}
                  >
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isMe && (
                      <span>
                        {msg.readAt ? (
                          <CheckCheck className="w-3 h-3 text-brand-200 inline" />
                        ) : (
                          <Check className="w-3 h-3 text-white/60 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="p-4 bg-ink-800 border-t border-ink-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              rows={2}
              maxLength={5000}
              className="w-full bg-ink-700/60 border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-none"
            />
            {inputText.length > 4000 && (
              <span className="absolute bottom-2 right-2 text-[10px] text-ink-400">
                {inputText.length} / 5000
              </span>
            )}
          </div>

          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="h-10 px-4 rounded-xl shrink-0 flex items-center justify-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
