import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Message, MessageReaction, MessageStatus } from '../types/index.js';

export interface ChatParticipant {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
  isOnline?: boolean;
}

export interface ChatRoomProps {
  /** Chat ID */
  chatId?: string;
  /** Name/title of the chat or contact */
  chatName?: string;
  /** Chat avatar URL or initial letter fallback */
  chatAvatarUrl?: string | null;
  /** Chat type: direct message or group conversation */
  chatType?: 'direct' | 'group';
  /** Presence or status text (e.g. "Online", "Typing...", "Last seen at 10:30 AM") */
  statusText?: string;
  /** Current logged-in user ID to distinguish sent vs received messages */
  currentUserId: string;
  /** Array of messages representing the chat history */
  messages?: Message[];
  /** Callback fired when user submits a new message */
  onSendMessage?: (payload: { text: string; replyToId?: string | null; mediaUrl?: string | null }) => void | Promise<void>;
  /** Callback fired when user reacts with an emoji to a message */
  onReaction?: (messageId: string, emoji: string) => void | Promise<void>;
  /** Callback fired when user edits a message */
  onEditMessage?: (messageId: string, newText: string) => void | Promise<void>;
  /** Callback fired when user deletes a message */
  onDeleteMessage?: (messageId: string) => void | Promise<void>;
  /** Callback fired when user pins or unpins a message */
  onPinMessage?: (messageId: string, isPinned: boolean) => void | Promise<void>;
  /** Callback when user starts or stops typing */
  onTyping?: (isTyping: boolean) => void;
  /** Smart reply suggestions list */
  smartReplies?: string[];
  /** Optional loading state */
  isLoading?: boolean;
  /** Optional custom CSS classes */
  className?: string;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ChatRoom: React.FC<ChatRoomProps> = ({
  chatId = 'chat-default',
  chatName = 'Direct Chat',
  chatAvatarUrl,
  chatType = 'direct',
  statusText = 'Online',
  currentUserId,
  messages = [],
  onSendMessage,
  onReaction,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onTyping,
  smartReplies = ['Sounds good!', 'Understood, thanks!', 'I will check and let you know.'],
  isLoading = false,
  className = ''
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showEmojiBarFor, setShowEmojiBarFor] = useState<string | null>(null);
  const [activeTranslations, setActiveTranslations] = useState<Record<string, string>>({});
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages if not scrolled up
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isScrolledUp]);

  // Handle scroll position to show/hide "Scroll to bottom" button
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 150);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
  };

  // Typing event handler with 1.5s debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  // Handle Send Message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (onSendMessage) {
        await onSendMessage({
          text: trimmed,
          replyToId: replyingTo ? replyingTo.id : null
        });
      }
      setInputText('');
      setReplyingTo(null);
      if (onTyping) onTyping(false);
      // Re-focus textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom();
      }, 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Enter sends message, Shift+Enter adds newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick reaction trigger
  const handleEmojiClick = async (messageId: string, emoji: string) => {
    setShowEmojiBarFor(null);
    if (onReaction) {
      await onReaction(messageId, emoji);
    }
  };

  // Commit Edit
  const handleSaveEdit = async (messageId: string) => {
    if (!editText.trim()) return;
    if (onEditMessage) {
      await onEditMessage(messageId, editText.trim());
    }
    setEditingMessageId(null);
    setEditText('');
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: Message[] }[] = [];
    let currentLabel = '';
    let currentItems: Message[] = [];

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let label = msgDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });

      if (msgDate.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      }

      if (label !== currentLabel) {
        if (currentItems.length > 0) {
          groups.push({ dateLabel: currentLabel, items: currentItems });
        }
        currentLabel = label;
        currentItems = [msg];
      } else {
        currentItems.push(msg);
      }
    });

    if (currentItems.length > 0) {
      groups.push({ dateLabel: currentLabel, items: currentItems });
    }

    return groups;
  }, [messages]);

  // Find pinned messages
  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => Number(m.is_pinned) === 1 && !m.is_deleted);
  }, [messages]);

  // Lookup map for replied messages
  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  // Format timestamp helper
  const formatTime = (timestamp: string | number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Render message delivery status tick
  const renderStatusTicks = (status: MessageStatus) => {
    if (status === 'sending') {
      return <span className="inline-block text-xs opacity-60 ml-1">⏱</span>;
    }
    if (status === 'sent') {
      return <span className="inline-block text-xs text-slate-400 font-bold ml-1" title="Sent">✓</span>;
    }
    if (status === 'delivered') {
      return <span className="inline-block text-xs text-slate-400 font-bold ml-1" title="Delivered">✓✓</span>;
    }
    if (status === 'read') {
      return <span className="inline-block text-xs text-sky-400 font-bold ml-1" title="Read">✓✓</span>;
    }
    return null;
  };

  return (
    <div
      id="chat-room-container"
      className={`flex flex-col h-full w-full bg-[#efe7de] dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 overflow-hidden relative font-sans ${className}`}
    >
      {/* Top Header */}
      <header
        id="chat-room-header"
        className="flex items-center justify-between px-4 py-3 bg-[#075e54] dark:bg-[#202c33] text-white shadow-sm z-10 select-none"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div
            id="chat-avatar"
            className="w-10 h-10 rounded-full bg-[#25d366] text-[#064b39] font-bold flex items-center justify-center shrink-0 shadow-inner overflow-hidden"
          >
            {chatAvatarUrl ? (
              <img src={chatAvatarUrl} alt={chatName} className="w-full h-full object-cover" />
            ) : (
              <span>{chatName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <h2 id="chat-title" className="text-base font-semibold truncate leading-tight">
              {chatName}
            </h2>
            <span
              id="chat-status"
              className={`text-xs truncate ${
                statusText.toLowerCase().includes('online') || statusText.toLowerCase().includes('typing')
                  ? 'text-emerald-200'
                  : 'text-slate-300'
              }`}
            >
              {statusText}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-slate-100">
          <button
            type="button"
            id="chat-search-btn"
            title="Search in chat"
            className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            type="button"
            id="chat-options-btn"
            title="More options"
            className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Pinned Message Banner */}
      {pinnedMessages.length > 0 && (
        <div
          id="pinned-messages-banner"
          className="flex items-center justify-between px-4 py-2 bg-amber-100/90 dark:bg-amber-950/80 border-b border-amber-300/60 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shadow-sm z-10"
        >
          <div className="flex items-center space-x-2 truncate">
            <span className="font-semibold flex items-center shrink-0">📌 Pinned:</span>
            <span className="truncate">{pinnedMessages[pinnedMessages.length - 1]?.text || '[Media file]'}</span>
          </div>
          {onPinMessage && (
            <button
              type="button"
              id="unpin-button"
              onClick={() => onPinMessage(pinnedMessages[pinnedMessages.length - 1]!.id, false)}
              className="text-amber-800 dark:text-amber-300 hover:underline shrink-0 ml-2 font-medium"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Messages Scrollable History Area */}
      <div
        id="messages-scroll-area"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4"
        style={{
          backgroundImage:
            'radial-gradient(rgba(180, 160, 140, 0.2) 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
        role="log"
        aria-label="Message history"
      >
        {isLoading && (
          <div id="messages-loading" className="flex justify-center py-6 text-sm text-slate-500 dark:text-slate-400">
            <span className="animate-pulse">Loading message history...</span>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div id="messages-empty-state" className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 dark:text-slate-400 select-none">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[#075e54] dark:text-emerald-400 text-2xl mb-3 shadow-inner">
              💬
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No messages yet</h3>
            <p className="text-xs max-w-xs mt-1">Send a message below to start the conversation with {chatName}.</p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.dateLabel} className="space-y-3">
            {/* Date separator divider */}
            <div className="flex justify-center my-3">
              <span className="px-3 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-md shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                {group.dateLabel}
              </span>
            </div>

            {/* Individual Messages */}
            {group.items.map((message) => {
              const isMe = message.sender_id === currentUserId;
              const repliedMessage = message.reply_to_id ? messagesById.get(message.reply_to_id) : null;
              const isEditing = editingMessageId === message.id;

              // Parse translations if present
              let parsedTranslations: Record<string, string> | null = null;
              if (message.translations) {
                try {
                  parsedTranslations = typeof message.translations === 'string'
                    ? JSON.parse(message.translations)
                    : message.translations;
                } catch {
                  parsedTranslations = null;
                }
              }

              // Active translated text if user toggled
              const activeLang = activeTranslations[message.id];
              const displayText = activeLang && parsedTranslations && parsedTranslations[activeLang]
                ? parsedTranslations[activeLang]
                : message.text;

              return (
                <div
                  key={message.id}
                  id={`msg-row-${message.id}`}
                  className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
                  onMouseLeave={() => setShowEmojiBarFor(null)}
                >
                  {/* Floating Action Menu (Triggered on hover or click) */}
                  <div
                    id={`msg-actions-${message.id}`}
                    className={`absolute z-20 -top-8 ${
                      isMe ? 'right-0' : 'left-0'
                    } hidden group-hover:flex items-center space-x-1 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-md text-xs`}
                  >
                    <button
                      type="button"
                      title="React"
                      onClick={() => setShowEmojiBarFor(showEmojiBarFor === message.id ? null : message.id)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"
                    >
                      😊
                    </button>
                    <button
                      type="button"
                      title="Reply"
                      onClick={() => {
                        setReplyingTo(message);
                        textareaRef.current?.focus();
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"
                    >
                      ↩
                    </button>
                    {onPinMessage && (
                      <button
                        type="button"
                        title={Number(message.is_pinned) === 1 ? 'Unpin' : 'Pin'}
                        onClick={() => onPinMessage(message.id, Number(message.is_pinned) !== 1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"
                      >
                        📌
                      </button>
                    )}
                    {isMe && onEditMessage && !message.is_deleted && (
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => {
                          setEditingMessageId(message.id);
                          setEditText(message.text || '');
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300"
                      >
                        ✏️
                      </button>
                    )}
                    {isMe && onDeleteMessage && !message.is_deleted && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => onDeleteMessage(message.id)}
                        className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-full text-rose-600 dark:text-rose-400"
                      >
                        🗑
                      </button>
                    )}
                  </div>

                  {/* Emoji Quick Picker Row */}
                  {showEmojiBarFor === message.id && (
                    <div
                      id={`emoji-bar-${message.id}`}
                      className={`absolute z-30 -top-10 ${
                        isMe ? 'right-0' : 'left-0'
                      } flex items-center space-x-1 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-lg animate-in fade-in zoom-in-95`}
                    >
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleEmojiClick(message.id, emoji)}
                          className="hover:scale-125 transition-transform px-1 text-base"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    id={`message-bubble-${message.id}`}
                    className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-sm text-sm break-words relative transition-all ${
                      isMe
                        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-[#e9edef] rounded-tr-none'
                        : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-[#e9edef] rounded-tl-none'
                    } ${Number(message.is_pinned) === 1 ? 'ring-2 ring-amber-400/80 dark:ring-amber-500/60' : ''}`}
                  >
                    {/* Group Sender Name */}
                    {!isMe && chatType === 'group' && (
                      <span className="block text-[11px] font-bold text-[#075e54] dark:text-[#8de7c1] mb-1">
                        {message.sender_id}
                      </span>
                    )}

                    {/* Replied Message Reference */}
                    {repliedMessage && (
                      <div
                        id={`reply-preview-bubble-${message.id}`}
                        className={`mb-2 p-2 rounded border-l-4 text-xs ${
                          isMe
                            ? 'bg-emerald-100/70 dark:bg-[#02493b] border-emerald-600'
                            : 'bg-slate-100 dark:bg-[#182229] border-[#075e54]'
                        }`}
                      >
                        <span className="block font-semibold opacity-75">
                          {repliedMessage.sender_id === currentUserId ? 'You' : repliedMessage.sender_id}
                        </span>
                        <p className="line-clamp-2 italic opacity-90">{repliedMessage.text || '[Attachment]'}</p>
                      </div>
                    )}

                    {/* Inline Edit Form */}
                    {isEditing ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          id={`edit-textarea-${message.id}`}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-xs p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-[#2a3942] focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end space-x-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-black/5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(message.id)}
                            className="px-2 py-1 bg-[#075e54] text-white rounded font-medium hover:bg-emerald-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Soft deleted notice */}
                        {Number(message.is_deleted) === 1 ? (
                          <p className="italic text-slate-500 dark:text-slate-400 text-xs flex items-center">
                            <span className="mr-1">🚫</span> This message was deleted.
                          </p>
                        ) : (
                          <>
                            {/* Media content if attached */}
                            {message.media_url && (
                              <div className="mb-2 rounded overflow-hidden">
                                {message.message_type === 'image' ? (
                                  <img
                                    src={message.media_url}
                                    alt="Attachment"
                                    className="max-h-64 w-full object-cover rounded"
                                    loading="lazy"
                                  />
                                ) : message.message_type === 'audio' || message.message_type === 'voice_note' ? (
                                  <audio controls src={message.media_url} className="w-full h-8" />
                                ) : (
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center space-x-2 p-2 rounded bg-black/5 dark:bg-white/5 hover:underline text-xs"
                                  >
                                    <span>📎</span>
                                    <span className="truncate">Download Attachment</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Message text */}
                            <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>

                            {/* Translations toggles (Sinhala, Tamil, English) */}
                            {parsedTranslations && Object.keys(parsedTranslations).length > 0 && (
                              <div className="mt-2 pt-1.5 border-t border-black/5 dark:border-white/10 flex items-center space-x-2 text-[11px]">
                                <span className="opacity-60 text-[10px]">🌐 Translate:</span>
                                {Object.entries(parsedTranslations).map(([lang, translatedVal]) => {
                                  if (!translatedVal) return null;
                                  const langLabels: Record<string, string> = {
                                    si: 'සිංහල',
                                    ta: 'தமிழ்',
                                    en: 'English'
                                  };
                                  const isActive = activeTranslations[message.id] === lang;
                                  return (
                                    <button
                                      key={lang}
                                      type="button"
                                      onClick={() => {
                                        setActiveTranslations((prev) => ({
                                          ...prev,
                                          [message.id]: isActive ? '' : lang
                                        }));
                                      }}
                                      className={`px-1.5 py-0.5 rounded transition-colors ${
                                        isActive
                                          ? 'bg-[#075e54] text-white font-medium'
                                          : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                                      }`}
                                    >
                                      {langLabels[lang] || lang}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Metadata: Time, Edited mark, Status ticks */}
                    <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400 select-none">
                      {Number(message.is_pinned) === 1 && <span title="Pinned">📌</span>}
                      {Number(message.is_edited) === 1 && !message.is_deleted && <span>edited</span>}
                      <span>{formatTime(message.created_at)}</span>
                      {isMe && !message.is_deleted && renderStatusTicks(message.status)}
                    </div>
                  </div>

                  {/* Message Reactions summary pill */}
                  {/* (If reactions are stored on the message or passed as reactions array) */}
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {isScrolledUp && (
        <button
          type="button"
          id="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="absolute right-4 bottom-20 z-20 w-9 h-9 rounded-full bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* Replying Preview Banner */}
      {replyingTo && (
        <div
          id="active-reply-banner"
          className="flex items-center justify-between px-4 py-2 bg-[#d9fdd3] dark:bg-[#182229] border-t border-slate-300 dark:border-slate-700 text-xs shadow-inner"
        >
          <div className="flex flex-col min-w-0 pr-2">
            <span className="font-semibold text-[#075e54] dark:text-[#8de7c1]">
              Replying to {replyingTo.sender_id === currentUserId ? 'yourself' : replyingTo.sender_id}
            </span>
            <span className="truncate text-slate-600 dark:text-slate-300 italic">{replyingTo.text || '[Media]'}</span>
          </div>
          <button
            type="button"
            id="cancel-reply-btn"
            onClick={() => setReplyingTo(null)}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-lg px-1 font-bold"
            aria-label="Cancel reply"
          >
            ×
          </button>
        </div>
      )}

      {/* Smart Reply Suggestions Bar */}
      {smartReplies && smartReplies.length > 0 && !inputText.trim() && (
        <div
          id="smart-replies-bar"
          className="flex items-center space-x-2 px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#111b21] overflow-x-auto scrollbar-none border-t border-slate-200/60 dark:border-slate-800"
        >
          <span className="text-[10px] text-slate-400 shrink-0 font-medium select-none">AI Suggestions:</span>
          {smartReplies.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              id={`smart-reply-chip-${idx}`}
              onClick={() => {
                setInputText(reply);
                textareaRef.current?.focus();
              }}
              className="shrink-0 px-3 py-1 bg-white dark:bg-[#202c33] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 text-xs rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-colors whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Message Composer / Input Area */}
      <form
        id="chat-composer-form"
        onSubmit={handleSend}
        className="flex items-center px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-700/60 space-x-2 z-10"
      >
        {/* Quick Emoji Button */}
        <button
          type="button"
          id="composer-emoji-btn"
          title="Insert emoji"
          onClick={() => {
            setInputText((prev) => prev + ' 😊');
            textareaRef.current?.focus();
          }}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full focus:outline-none transition-colors"
          aria-label="Insert emoji"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Attachment Button */}
        <button
          type="button"
          id="composer-attach-btn"
          title="Attach media or document"
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full focus:outline-none transition-colors"
          aria-label="Attach file"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,audio/*,application/pdf';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                setInputText((prev) => `${prev} [Attachment: ${file.name}]`);
              }
            };
            input.click();
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Text Input / Expanding Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            id="composer-input"
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (Press Enter to send)..."
            className="w-full resize-none max-h-32 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#2a3942] text-slate-900 dark:text-[#e9edef] placeholder-slate-400 dark:placeholder-slate-400 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#25d366] shadow-sm leading-normal"
            aria-label="Message text input"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          id="composer-send-btn"
          disabled={!inputText.trim() || isSubmitting}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md shrink-0 ${
            inputText.trim() && !isSubmitting
              ? 'bg-[#25d366] hover:bg-[#20ba5a] text-[#053e28] cursor-pointer'
              : 'bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          {isSubmitting ? (
            <span className="inline-block animate-spin text-sm">↻</span>
          ) : (
            <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;
