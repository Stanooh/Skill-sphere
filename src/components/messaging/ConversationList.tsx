'use client';

import { useState } from 'react';
import { Search, MessageSquare, Clock, AlertCircle, RotateCw } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: ConversationListProps) {
  const [query, setQuery] = useState('');

  const filtered = conversations.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const nameMatch = c.otherUser?.name.toLowerCase().includes(q);
    const lastMsgMatch = c.lastMessage?.toLowerCase().includes(q);
    return Boolean(nameMatch || lastMsgMatch);
  });

  return (
    <div className="flex flex-col h-full bg-ink-800 border-r border-ink-200">
      {/* Header & Search */}
      <div className="p-4 border-b border-ink-200">
        <h2 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand" />
          Messages
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-ink-700/60 border border-ink-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-ink placeholder-ink-400 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-ink-200/50">
        {loading ? (
          <div className="p-8 text-center text-ink-400 space-y-2">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand mb-2" />
            <p className="text-sm">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-950 text-red-400 flex items-center justify-center mx-auto border border-red-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Failed to load conversations</p>
              <p className="text-xs text-ink-400 mt-1 max-w-xs mx-auto break-words">{error}</p>
            </div>
            {onRetry && (
              <Button size="sm" variant="secondary" onClick={onRetry} className="inline-flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" /> Try Again
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-ink-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-ink-300 opacity-50" />
            <p className="text-sm font-medium">No conversations found</p>
            <p className="text-xs">
              {query ? 'No conversations match your search.' : 'Start a conversation from a mentor or learner profile.'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            const other = conv.otherUser;
            const unread = conv.unreadCount ?? 0;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                  isSelected
                    ? 'bg-brand/10 border-l-4 border-brand'
                    : 'hover:bg-ink-700/40'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar src={other?.avatar} name={other?.name ?? 'User'} size="md" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>
                      {other?.name ?? 'User'}
                    </p>
                    <span className="text-[11px] text-ink-400 shrink-0 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge variant={other?.role === 'mentor' ? 'brand' : 'gray'}>
                      {other?.role === 'mentor' ? 'Mentor' : 'Learner'}
                    </Badge>
                  </div>

                  <p
                    className={`text-xs truncate ${
                      unread > 0 ? 'font-medium text-ink' : 'text-ink-400'
                    }`}
                  >
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
