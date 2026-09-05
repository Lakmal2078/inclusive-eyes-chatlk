/**
 * ChatLK Core TypeScript Interfaces and Types
 */

export type UserRole = 'user' | 'admin';
export type GroupRole = 'admin' | 'member';
export type ModerationStatus = 'clean' | 'flagged' | 'blocked';
export type ModerationSeverity = 'low' | 'medium' | 'high';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice_note' | 'location';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface User {
  id: string;
  username: string;
  phone: string;
  display_name: string;
  password_hash?: string;
  avatar_url?: string | null;
  bio?: string | null;
  is_premium?: number;
  is_business?: number;
  is_verified?: number;
  language?: string;
  last_seen?: string | number | null;
  is_online?: number;
  auto_translate?: number;
  mute_notifications?: number;
  role: UserRole;
  created_at: string | number;
  updated_at: string | number;
}

export interface UserChatSettings {
  autoTranslate: boolean;
  muteNotifications: boolean;
  language?: string;
  isChatMuted?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  user?: Partial<User>;
}

export interface MessageTranslations {
  si?: string;
  ta?: string;
  en?: string;
  [lang: string]: string | undefined;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text?: string | null;
  message_type: MessageType;
  media_url?: string | null;
  media_thumbnail?: string | null;
  media_size?: number | null;
  reply_to_id?: string | null;
  status: MessageStatus;
  is_edited: number;
  edited_at?: string | number | null;
  is_deleted: number;
  deleted_at?: string | null;
  translations?: string | null; // JSON string of MessageTranslations
  is_pinned: number;
  pinned_by?: string | null;
  pinned_at?: string | null;
  moderation_status?: ModerationStatus;
  moderation_reason?: string | null;
  created_at: string | number;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  username?: string;
}

export interface PushSubscriptionData {
  id: string;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  created_at: string;
}

export interface FlaggedMessage {
  id: string;
  message_id: string;
  reason?: string | null;
  severity: ModerationSeverity;
  reviewed: number;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface MutedChat {
  user_id: string;
  chat_id: string;
  created_at: string;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen?: string | number | null;
}

export type PresenceStatus = 'online' | 'offline';

export interface UserPresenceStatusProps {
  userId?: string;
  initialIsOnline?: boolean;
  initialLastSeen?: string | number | null;
  authToken?: string;
  apiBase?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' | 'inline';
  pollInterval?: number;
  className?: string;
  dotClassName?: string;
  children?: any;
  onChange?: (presence: UserPresence) => void;
}

export interface Bindings {
  AI?: any;
  APP_NAME?: string;
  CACHE?: any;
  CHAT_ROOM?: any;
  CORS_ORIGIN?: string;
  DB: any;
  JWT_SECRET: string;
  MAX_FILE_SIZE_MB?: string;
  MEDIA?: any;
  PREMIUM_MAX_FILE_SIZE_MB?: string;
  SUPPORTED_LANGUAGES?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}
