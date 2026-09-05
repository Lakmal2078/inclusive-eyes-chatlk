import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { UserPresenceStatus } from "./UserPresenceStatus.js";
const COMMON_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];
const ChatRoom = ({
  chatId = "chat-default",
  chatName = "Direct Chat",
  chatAvatarUrl,
  chatType = "direct",
  statusText = "Online",
  peerUserId,
  isOnline,
  currentUserId,
  messages = [],
  onSendMessage,
  onReaction,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onTyping,
  smartReplies = ["Sounds good!", "Understood, thanks!", "I will check and let you know."],
  isLoading = false,
  className = ""
}) => {
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEmojiBarFor, setShowEmojiBarFor] = useState(null);
  const [activeTranslations, setActiveTranslations] = useState({});
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isScrolledUp]);
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 150);
  }, []);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsScrolledUp(false);
  };
  const handleInputChange = (e) => {
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
  const handleSend = async (e) => {
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
      setInputText("");
      setReplyingTo(null);
      if (onTyping) onTyping(false);
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom();
      }, 50);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleEmojiClick = async (messageId, emoji) => {
    setShowEmojiBarFor(null);
    if (onReaction) {
      await onReaction(messageId, emoji);
    }
  };
  const handleSaveEdit = async (messageId) => {
    if (!editText.trim()) return;
    if (onEditMessage) {
      await onEditMessage(messageId, editText.trim());
    }
    setEditingMessageId(null);
    setEditText("");
  };
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentLabel = "";
    let currentItems = [];
    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      const today = /* @__PURE__ */ new Date();
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(today.getDate() - 1);
      let label = msgDate.toLocaleDateString(void 0, {
        month: "short",
        day: "numeric",
        year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : void 0
      });
      if (msgDate.toDateString() === today.toDateString()) {
        label = "Today";
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        label = "Yesterday";
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
  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => Number(m.is_pinned) === 1 && !m.is_deleted);
  }, [messages]);
  const messagesById = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);
  const formatTime = (timestamp) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };
  const renderStatusTicks = (status) => {
    if (status === "sending") {
      return /* @__PURE__ */ jsx("span", { className: "inline-block text-xs opacity-60 ml-1", children: "\u23F1" });
    }
    if (status === "sent") {
      return /* @__PURE__ */ jsx("span", { className: "inline-block text-xs text-slate-400 font-bold ml-1", title: "Sent", children: "\u2713" });
    }
    if (status === "delivered") {
      return /* @__PURE__ */ jsx("span", { className: "inline-block text-xs text-slate-400 font-bold ml-1", title: "Delivered", children: "\u2713\u2713" });
    }
    if (status === "read") {
      return /* @__PURE__ */ jsx("span", { className: "inline-block text-xs text-sky-400 font-bold ml-1", title: "Read", children: "\u2713\u2713" });
    }
    return null;
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id: "chat-room-container",
      className: `flex flex-col h-full w-full bg-[#efe7de] dark:bg-[#0b141a] text-slate-900 dark:text-slate-100 overflow-hidden relative font-sans ${className}`,
      children: [
        /* @__PURE__ */ jsxs(
          "header",
          {
            id: "chat-room-header",
            className: "flex items-center justify-between px-4 py-3 bg-[#075e54] dark:bg-[#202c33] text-white shadow-sm z-10 select-none",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3 min-w-0", children: [
                /* @__PURE__ */ jsx(
                  UserPresenceStatus,
                  {
                    userId: peerUserId,
                    initialIsOnline: isOnline !== void 0 ? isOnline : statusText.toLowerCase().includes("online"),
                    position: "bottom-right",
                    size: "md",
                    children: /* @__PURE__ */ jsx(
                      "div",
                      {
                        id: "chat-avatar",
                        className: "w-10 h-10 rounded-full bg-[#25d366] text-[#064b39] font-bold flex items-center justify-center shrink-0 shadow-inner overflow-hidden",
                        children: chatAvatarUrl ? /* @__PURE__ */ jsx("img", { src: chatAvatarUrl, alt: chatName, className: "w-full h-full object-cover" }) : /* @__PURE__ */ jsx("span", { children: chatName.charAt(0).toUpperCase() })
                      }
                    )
                  }
                ),
                /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex flex-col", children: [
                  /* @__PURE__ */ jsx("h2", { id: "chat-title", className: "text-base font-semibold truncate leading-tight", children: chatName }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      id: "chat-status",
                      className: `text-xs truncate ${statusText.toLowerCase().includes("online") || statusText.toLowerCase().includes("typing") ? "text-emerald-200" : "text-slate-300"}`,
                      children: statusText
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-1 text-slate-100", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    id: "chat-search-btn",
                    title: "Search in chat",
                    className: "p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none",
                    "aria-label": "Search messages",
                    children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }) })
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    id: "chat-options-btn",
                    title: "More options",
                    className: "p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none",
                    "aria-label": "More options",
                    children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { d: "M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" }) })
                  }
                )
              ] })
            ]
          }
        ),
        pinnedMessages.length > 0 && /* @__PURE__ */ jsxs(
          "div",
          {
            id: "pinned-messages-banner",
            className: "flex items-center justify-between px-4 py-2 bg-amber-100/90 dark:bg-amber-950/80 border-b border-amber-300/60 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shadow-sm z-10",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 truncate", children: [
                /* @__PURE__ */ jsx("span", { className: "font-semibold flex items-center shrink-0", children: "\u{1F4CC} Pinned:" }),
                /* @__PURE__ */ jsx("span", { className: "truncate", children: pinnedMessages[pinnedMessages.length - 1]?.text || "[Media file]" })
              ] }),
              onPinMessage && /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: "unpin-button",
                  onClick: () => onPinMessage(pinnedMessages[pinnedMessages.length - 1].id, false),
                  className: "text-amber-800 dark:text-amber-300 hover:underline shrink-0 ml-2 font-medium",
                  children: "Unpin"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "div",
          {
            id: "messages-scroll-area",
            ref: scrollContainerRef,
            onScroll: handleScroll,
            className: "flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4",
            style: {
              backgroundImage: "radial-gradient(rgba(180, 160, 140, 0.2) 1px, transparent 1px)",
              backgroundSize: "16px 16px"
            },
            role: "log",
            "aria-label": "Message history",
            children: [
              isLoading && /* @__PURE__ */ jsx("div", { id: "messages-loading", className: "flex justify-center py-6 text-sm text-slate-500 dark:text-slate-400", children: /* @__PURE__ */ jsx("span", { className: "animate-pulse", children: "Loading message history..." }) }),
              !isLoading && messages.length === 0 && /* @__PURE__ */ jsxs("div", { id: "messages-empty-state", className: "flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 dark:text-slate-400 select-none", children: [
                /* @__PURE__ */ jsx("div", { className: "w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[#075e54] dark:text-emerald-400 text-2xl mb-3 shadow-inner", children: "\u{1F4AC}" }),
                /* @__PURE__ */ jsx("h3", { className: "font-semibold text-slate-700 dark:text-slate-200 text-sm", children: "No messages yet" }),
                /* @__PURE__ */ jsxs("p", { className: "text-xs max-w-xs mt-1", children: [
                  "Send a message below to start the conversation with ",
                  chatName,
                  "."
                ] })
              ] }),
              groupedMessages.map((group) => /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                /* @__PURE__ */ jsx("div", { className: "flex justify-center my-3", children: /* @__PURE__ */ jsx("span", { className: "px-3 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-md shadow-sm border border-slate-200/50 dark:border-slate-700/50", children: group.dateLabel }) }),
                group.items.map((message) => {
                  const isMe = message.sender_id === currentUserId;
                  const repliedMessage = message.reply_to_id ? messagesById.get(message.reply_to_id) : null;
                  const isEditing = editingMessageId === message.id;
                  let parsedTranslations = null;
                  if (message.translations) {
                    try {
                      parsedTranslations = typeof message.translations === "string" ? JSON.parse(message.translations) : message.translations;
                    } catch {
                      parsedTranslations = null;
                    }
                  }
                  const activeLang = activeTranslations[message.id];
                  const displayText = activeLang && parsedTranslations && parsedTranslations[activeLang] ? parsedTranslations[activeLang] : message.text;
                  return /* @__PURE__ */ jsxs(
                    "div",
                    {
                      id: `msg-row-${message.id}`,
                      className: `flex flex-col group relative ${isMe ? "items-end" : "items-start"}`,
                      onMouseLeave: () => setShowEmojiBarFor(null),
                      children: [
                        /* @__PURE__ */ jsxs(
                          "div",
                          {
                            id: `msg-actions-${message.id}`,
                            className: `absolute z-20 -top-8 ${isMe ? "right-0" : "left-0"} hidden group-hover:flex items-center space-x-1 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-md text-xs`,
                            children: [
                              /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  title: "React",
                                  onClick: () => setShowEmojiBarFor(showEmojiBarFor === message.id ? null : message.id),
                                  className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300",
                                  children: "\u{1F60A}"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  title: "Reply",
                                  onClick: () => {
                                    setReplyingTo(message);
                                    textareaRef.current?.focus();
                                  },
                                  className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300",
                                  children: "\u21A9"
                                }
                              ),
                              onPinMessage && /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  title: Number(message.is_pinned) === 1 ? "Unpin" : "Pin",
                                  onClick: () => onPinMessage(message.id, Number(message.is_pinned) !== 1),
                                  className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300",
                                  children: "\u{1F4CC}"
                                }
                              ),
                              isMe && onEditMessage && !message.is_deleted && /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  title: "Edit",
                                  onClick: () => {
                                    setEditingMessageId(message.id);
                                    setEditText(message.text || "");
                                  },
                                  className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300",
                                  children: "\u270F\uFE0F"
                                }
                              ),
                              isMe && onDeleteMessage && !message.is_deleted && /* @__PURE__ */ jsx(
                                "button",
                                {
                                  type: "button",
                                  title: "Delete",
                                  onClick: () => onDeleteMessage(message.id),
                                  className: "p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-full text-rose-600 dark:text-rose-400",
                                  children: "\u{1F5D1}"
                                }
                              )
                            ]
                          }
                        ),
                        showEmojiBarFor === message.id && /* @__PURE__ */ jsx(
                          "div",
                          {
                            id: `emoji-bar-${message.id}`,
                            className: `absolute z-30 -top-10 ${isMe ? "right-0" : "left-0"} flex items-center space-x-1 bg-white dark:bg-[#202c33] border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 shadow-lg animate-in fade-in zoom-in-95`,
                            children: COMMON_EMOJIS.map((emoji) => /* @__PURE__ */ jsx(
                              "button",
                              {
                                type: "button",
                                onClick: () => handleEmojiClick(message.id, emoji),
                                className: "hover:scale-125 transition-transform px-1 text-base",
                                children: emoji
                              },
                              emoji
                            ))
                          }
                        ),
                        /* @__PURE__ */ jsxs(
                          "div",
                          {
                            id: `message-bubble-${message.id}`,
                            className: `max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-sm text-sm break-words relative transition-all ${isMe ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-[#e9edef] rounded-tr-none" : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-[#e9edef] rounded-tl-none"} ${Number(message.is_pinned) === 1 ? "ring-2 ring-amber-400/80 dark:ring-amber-500/60" : ""}`,
                            children: [
                              !isMe && chatType === "group" && /* @__PURE__ */ jsx("span", { className: "block text-[11px] font-bold text-[#075e54] dark:text-[#8de7c1] mb-1", children: message.sender_id }),
                              repliedMessage && /* @__PURE__ */ jsxs(
                                "div",
                                {
                                  id: `reply-preview-bubble-${message.id}`,
                                  className: `mb-2 p-2 rounded border-l-4 text-xs ${isMe ? "bg-emerald-100/70 dark:bg-[#02493b] border-emerald-600" : "bg-slate-100 dark:bg-[#182229] border-[#075e54]"}`,
                                  children: [
                                    /* @__PURE__ */ jsx("span", { className: "block font-semibold opacity-75", children: repliedMessage.sender_id === currentUserId ? "You" : repliedMessage.sender_id }),
                                    /* @__PURE__ */ jsx("p", { className: "line-clamp-2 italic opacity-90", children: repliedMessage.text || "[Attachment]" })
                                  ]
                                }
                              ),
                              isEditing ? /* @__PURE__ */ jsxs("div", { className: "mt-1 space-y-2", children: [
                                /* @__PURE__ */ jsx(
                                  "textarea",
                                  {
                                    id: `edit-textarea-${message.id}`,
                                    value: editText,
                                    onChange: (e) => setEditText(e.target.value),
                                    className: "w-full text-xs p-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-[#2a3942] focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white",
                                    rows: 2,
                                    autoFocus: true
                                  }
                                ),
                                /* @__PURE__ */ jsxs("div", { className: "flex justify-end space-x-2 text-xs", children: [
                                  /* @__PURE__ */ jsx(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => setEditingMessageId(null),
                                      className: "px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:bg-black/5",
                                      children: "Cancel"
                                    }
                                  ),
                                  /* @__PURE__ */ jsx(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => handleSaveEdit(message.id),
                                      className: "px-2 py-1 bg-[#075e54] text-white rounded font-medium hover:bg-emerald-700",
                                      children: "Save"
                                    }
                                  )
                                ] })
                              ] }) : /* @__PURE__ */ jsx(Fragment, { children: Number(message.is_deleted) === 1 ? /* @__PURE__ */ jsxs("p", { className: "italic text-slate-500 dark:text-slate-400 text-xs flex items-center", children: [
                                /* @__PURE__ */ jsx("span", { className: "mr-1", children: "\u{1F6AB}" }),
                                " This message was deleted."
                              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                                message.media_url && /* @__PURE__ */ jsx("div", { className: "mb-2 rounded overflow-hidden", children: message.message_type === "image" ? /* @__PURE__ */ jsx(
                                  "img",
                                  {
                                    src: message.media_url,
                                    alt: "Attachment",
                                    className: "max-h-64 w-full object-cover rounded",
                                    loading: "lazy"
                                  }
                                ) : message.message_type === "audio" || message.message_type === "voice_note" ? /* @__PURE__ */ jsx("audio", { controls: true, src: message.media_url, className: "w-full h-8" }) : /* @__PURE__ */ jsxs(
                                  "a",
                                  {
                                    href: message.media_url,
                                    target: "_blank",
                                    rel: "noreferrer",
                                    className: "flex items-center space-x-2 p-2 rounded bg-black/5 dark:bg-white/5 hover:underline text-xs",
                                    children: [
                                      /* @__PURE__ */ jsx("span", { children: "\u{1F4CE}" }),
                                      /* @__PURE__ */ jsx("span", { className: "truncate", children: "Download Attachment" })
                                    ]
                                  }
                                ) }),
                                /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap leading-relaxed", children: displayText }),
                                parsedTranslations && Object.keys(parsedTranslations).length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-2 pt-1.5 border-t border-black/5 dark:border-white/10 flex items-center space-x-2 text-[11px]", children: [
                                  /* @__PURE__ */ jsx("span", { className: "opacity-60 text-[10px]", children: "\u{1F310} Translate:" }),
                                  Object.entries(parsedTranslations).map(([lang, translatedVal]) => {
                                    if (!translatedVal) return null;
                                    const langLabels = {
                                      si: "\u0DC3\u0DD2\u0D82\u0DC4\u0DBD",
                                      ta: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD",
                                      en: "English"
                                    };
                                    const isActive = activeTranslations[message.id] === lang;
                                    return /* @__PURE__ */ jsx(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => {
                                          setActiveTranslations((prev) => ({
                                            ...prev,
                                            [message.id]: isActive ? "" : lang
                                          }));
                                        },
                                        className: `px-1.5 py-0.5 rounded transition-colors ${isActive ? "bg-[#075e54] text-white font-medium" : "bg-black/5 dark:bg-white/10 hover:bg-black/10"}`,
                                        children: langLabels[lang] || lang
                                      },
                                      lang
                                    );
                                  })
                                ] })
                              ] }) }),
                              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end space-x-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400 select-none", children: [
                                Number(message.is_pinned) === 1 && /* @__PURE__ */ jsx("span", { title: "Pinned", children: "\u{1F4CC}" }),
                                Number(message.is_edited) === 1 && !message.is_deleted && /* @__PURE__ */ jsx("span", { children: "edited" }),
                                /* @__PURE__ */ jsx("span", { children: formatTime(message.created_at) }),
                                isMe && !message.is_deleted && renderStatusTicks(message.status)
                              ] })
                            ]
                          }
                        )
                      ]
                    },
                    message.id
                  );
                })
              ] }, group.dateLabel)),
              /* @__PURE__ */ jsx("div", { ref: messagesEndRef })
            ]
          }
        ),
        isScrolledUp && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            id: "scroll-to-bottom-btn",
            onClick: scrollToBottom,
            "aria-label": "Scroll to bottom",
            className: "absolute right-4 bottom-20 z-20 w-9 h-9 rounded-full bg-white dark:bg-[#202c33] text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:outline-none",
            children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M19 14l-7 7m0 0l-7-7m7 7V3" }) })
          }
        ),
        replyingTo && /* @__PURE__ */ jsxs(
          "div",
          {
            id: "active-reply-banner",
            className: "flex items-center justify-between px-4 py-2 bg-[#d9fdd3] dark:bg-[#182229] border-t border-slate-300 dark:border-slate-700 text-xs shadow-inner",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col min-w-0 pr-2", children: [
                /* @__PURE__ */ jsxs("span", { className: "font-semibold text-[#075e54] dark:text-[#8de7c1]", children: [
                  "Replying to ",
                  replyingTo.sender_id === currentUserId ? "yourself" : replyingTo.sender_id
                ] }),
                /* @__PURE__ */ jsx("span", { className: "truncate text-slate-600 dark:text-slate-300 italic", children: replyingTo.text || "[Media]" })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: "cancel-reply-btn",
                  onClick: () => setReplyingTo(null),
                  className: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-lg px-1 font-bold",
                  "aria-label": "Cancel reply",
                  children: "\xD7"
                }
              )
            ]
          }
        ),
        smartReplies && smartReplies.length > 0 && !inputText.trim() && /* @__PURE__ */ jsxs(
          "div",
          {
            id: "smart-replies-bar",
            className: "flex items-center space-x-2 px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#111b21] overflow-x-auto scrollbar-none border-t border-slate-200/60 dark:border-slate-800",
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 shrink-0 font-medium select-none", children: "AI Suggestions:" }),
              smartReplies.map((reply, idx) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: `smart-reply-chip-${idx}`,
                  onClick: () => {
                    setInputText(reply);
                    textareaRef.current?.focus();
                  },
                  className: "shrink-0 px-3 py-1 bg-white dark:bg-[#202c33] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 text-xs rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-colors whitespace-nowrap",
                  children: reply
                },
                idx
              ))
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "form",
          {
            id: "chat-composer-form",
            onSubmit: handleSend,
            className: "flex items-center px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-slate-200 dark:border-slate-700/60 space-x-2 z-10",
            children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: "composer-emoji-btn",
                  title: "Insert emoji",
                  onClick: () => {
                    setInputText((prev) => prev + " \u{1F60A}");
                    textareaRef.current?.focus();
                  },
                  className: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full focus:outline-none transition-colors",
                  "aria-label": "Insert emoji",
                  children: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx(
                    "path",
                    {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      strokeWidth: "2",
                      d: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    }
                  ) })
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: "composer-attach-btn",
                  title: "Attach media or document",
                  className: "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2 rounded-full focus:outline-none transition-colors",
                  "aria-label": "Attach file",
                  onClick: () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*,audio/*,application/pdf";
                    input.onchange = (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setInputText((prev) => `${prev} [Attachment: ${file.name}]`);
                      }
                    };
                    input.click();
                  },
                  children: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx(
                    "path",
                    {
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      strokeWidth: "2",
                      d: "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    }
                  ) })
                }
              ),
              /* @__PURE__ */ jsx("div", { className: "flex-1 relative", children: /* @__PURE__ */ jsx(
                "textarea",
                {
                  ref: textareaRef,
                  id: "composer-input",
                  rows: 1,
                  value: inputText,
                  onChange: handleInputChange,
                  onKeyDown: handleKeyDown,
                  placeholder: "Type a message (Press Enter to send)...",
                  className: "w-full resize-none max-h-32 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#2a3942] text-slate-900 dark:text-[#e9edef] placeholder-slate-400 dark:placeholder-slate-400 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[#25d366] shadow-sm leading-normal",
                  "aria-label": "Message text input"
                }
              ) }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "submit",
                  id: "composer-send-btn",
                  disabled: !inputText.trim() || isSubmitting,
                  className: `w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-md shrink-0 ${inputText.trim() && !isSubmitting ? "bg-[#25d366] hover:bg-[#20ba5a] text-[#053e28] cursor-pointer" : "bg-slate-300 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"}`,
                  "aria-label": "Send message",
                  children: isSubmitting ? /* @__PURE__ */ jsx("span", { className: "inline-block animate-spin text-sm", children: "\u21BB" }) : /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 translate-x-0.5", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx("path", { d: "M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" }) })
                }
              )
            ]
          }
        )
      ]
    }
  );
};
var ChatRoom_default = ChatRoom;
export {
  ChatRoom,
  ChatRoom_default as default
};
