/**
 * D1 Database Query Helpers and Abstraction Layer
 */

import { User, Group, GroupMember, Message, MessageReaction } from '../types/index.js';

export const dbService = {
  // --- USERS ---
  async getUserById(db: any, id: string): Promise<User | null> {
    return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  },

  async updateUserProfile(
    db: any,
    userId: string,
    data: { display_name?: string; bio?: string; avatar_url?: string; auto_translate?: number }
  ) {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.display_name !== undefined) {
      fields.push('display_name = ?');
      values.push(data.display_name);
    }
    if (data.bio !== undefined) {
      fields.push('bio = ?');
      values.push(data.bio);
    }
    if (data.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(data.avatar_url);
    }
    if (data.auto_translate !== undefined) {
      fields.push('auto_translate = ?');
      values.push(data.auto_translate);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(userId);

    await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  },

  async updateUserPresence(db: any, userId: string, isOnline: boolean) {
    const now = new Date().toISOString();
    await db.prepare(
      'UPDATE users SET is_online = ?, last_seen = ? WHERE id = ?'
    ).bind(isOnline ? 1 : 0, now, userId).run();
  },

  // --- GROUPS ---
  async createGroup(
    db: any,
    creatorId: string,
    data: { id?: string; name: string; description?: string; avatar_url?: string; memberIds?: string[] }
  ): Promise<Group> {
    const groupId = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Insert into groups table
    await db.prepare(
      'INSERT INTO groups (id, name, description, avatar_url, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(groupId, data.name, data.description || null, data.avatar_url || null, creatorId, now, now).run();

    // 2. Also ensure a record in chats table for unified messaging
    await db.prepare(
      'INSERT OR IGNORE INTO chats (id, type, name, avatar_url, created_at, updated_at) VALUES (?, "group", ?, ?, ?, ?)'
    ).bind(groupId, data.name, data.avatar_url || null, Date.now(), Date.now()).run();

    // 3. Add creator as admin
    await db.prepare(
      'INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, "admin", ?)'
    ).bind(groupId, creatorId, now).run();

    await db.prepare(
      'INSERT OR IGNORE INTO chat_participants (chat_id, user_id, role, joined_at) VALUES (?, ?, "admin", ?)'
    ).bind(groupId, creatorId, Date.now()).run();

    // 4. Add initial members if provided (capped at 50 members total)
    const membersToAdd = (data.memberIds || [])
      .filter(id => id !== creatorId)
      .slice(0, 49);

    for (const memberId of membersToAdd) {
      await db.prepare(
        'INSERT OR IGNORE INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, "member", ?)'
      ).bind(groupId, memberId, now).run();

      await db.prepare(
        'INSERT OR IGNORE INTO chat_participants (chat_id, user_id, role, joined_at) VALUES (?, ?, "member", ?)'
      ).bind(groupId, memberId, Date.now()).run();
    }

    return {
      id: groupId,
      name: data.name,
      description: data.description || null,
      avatar_url: data.avatar_url || null,
      created_by: creatorId,
      created_at: now,
      updated_at: now,
      member_count: membersToAdd.length + 1
    };
  },

  async getGroupById(db: any, groupId: string): Promise<Group | null> {
    const group = await db.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId).first();
    if (!group) return null;

    const countRes = await db.prepare(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?'
    ).bind(groupId).first();

    return {
      ...group,
      member_count: Number(countRes?.count || 0)
    };
  },

  async listUserGroups(db: any, userId: string): Promise<Group[]> {
    const res = await db.prepare(`
      SELECT g.*, gm.role as my_role, (
        SELECT COUNT(*) FROM group_members WHERE group_id = g.id
      ) as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
      ORDER BY g.updated_at DESC
    `).bind(userId).all();

    return res.results || [];
  },

  async getGroupMembers(db: any, groupId: string): Promise<GroupMember[]> {
    const res = await db.prepare(`
      SELECT gm.*, u.username, u.display_name, u.avatar_url, u.is_online, u.last_seen
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.role DESC, gm.joined_at ASC
    `).bind(groupId).all();

    return res.results || [];
  },

  async isGroupAdmin(db: any, groupId: string, userId: string): Promise<boolean> {
    const member = await db.prepare(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(groupId, userId).first();
    return member?.role === 'admin';
  },

  async isGroupMember(db: any, groupId: string, userId: string): Promise<boolean> {
    const member = await db.prepare(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(groupId, userId).first();
    return Boolean(member);
  },

  async addGroupMember(db: any, groupId: string, userId: string, role: string = 'member'): Promise<boolean> {
    const now = new Date().toISOString();
    await db.prepare(
      'INSERT OR IGNORE INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    ).bind(groupId, userId, role, now).run();

    await db.prepare(
      'INSERT OR IGNORE INTO chat_participants (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    ).bind(groupId, userId, role, Date.now()).run();

    return true;
  },

  async removeGroupMember(db: any, groupId: string, userId: string): Promise<boolean> {
    await db.prepare(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
    ).bind(groupId, userId).run();

    await db.prepare(
      'DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?'
    ).bind(groupId, userId).run();

    return true;
  },

  // --- REACTIONS ---
  async toggleMessageReaction(db: any, messageId: string, userId: string, emoji: string) {
    const existing = await db.prepare(
      'SELECT emoji FROM message_reactions WHERE message_id = ? AND user_id = ?'
    ).bind(messageId, userId).first();

    if (existing && existing.emoji === emoji) {
      // Toggle off
      await db.prepare(
        'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?'
      ).bind(messageId, userId).run();
      return { action: 'removed', emoji };
    }

    if (existing) {
      // Change emoji
      await db.prepare(
        'UPDATE message_reactions SET emoji = ?, created_at = datetime("now") WHERE message_id = ? AND user_id = ?'
      ).bind(emoji, messageId, userId).run();
      return { action: 'updated', emoji };
    }

    // Insert new
    await db.prepare(
      'INSERT INTO message_reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, datetime("now"))'
    ).bind(messageId, userId, emoji).run();
    return { action: 'added', emoji };
  },

  async getMessageReactions(db: any, messageId: string) {
    const listRes = await db.prepare(`
      SELECT mr.*, u.username, u.display_name
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = ?
      ORDER BY mr.created_at ASC
    `).bind(messageId).all();

    const reactions = listRes.results || [];
    const countMap: Record<string, { emoji: string; count: number; users: string[] }> = {};

    for (const r of reactions) {
      if (!countMap[r.emoji]) {
        countMap[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      countMap[r.emoji].count++;
      countMap[r.emoji].users.push(r.display_name || r.username);
    }

    return {
      messageId,
      summary: Object.values(countMap),
      reactions
    };
  },

  // --- PINNING ---
  async pinMessage(db: any, messageId: string, userId: string) {
    const now = new Date().toISOString();
    await db.prepare(
      'UPDATE messages SET is_pinned = 1, pinned_by = ?, pinned_at = ? WHERE id = ?'
    ).bind(userId, now, messageId).run();
  },

  async unpinMessage(db: any, messageId: string) {
    await db.prepare(
      'UPDATE messages SET is_pinned = 0, pinned_by = NULL, pinned_at = NULL WHERE id = ?'
    ).bind(messageId).run();
  },

  async getPinnedMessages(db: any, chatId: string) {
    const res = await db.prepare(`
      SELECT m.*, u.username as sender_username, u.display_name as sender_display_name,
             p.display_name as pinned_by_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN users p ON m.pinned_by = p.id
      WHERE m.chat_id = ? AND m.is_pinned = 1 AND m.is_deleted = 0
      ORDER BY m.pinned_at DESC
    `).bind(chatId).all();

    return res.results || [];
  },

  // --- BLOCK & MUTE ---
  async isUserBlocked(db: any, blockerId: string, blockedId: string): Promise<boolean> {
    const res = await db.prepare(
      'SELECT 1 FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?'
    ).bind(blockerId, blockedId).first();
    return Boolean(res);
  },

  async blockUser(db: any, blockerId: string, blockedId: string) {
    await db.prepare(
      'INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id, created_at) VALUES (?, ?, datetime("now"))'
    ).bind(blockerId, blockedId).run();
  },

  async unblockUser(db: any, blockerId: string, blockedId: string) {
    await db.prepare(
      'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?'
    ).bind(blockerId, blockedId).run();
  },

  async getBlockedUsers(db: any, blockerId: string) {
    const res = await db.prepare(`
      SELECT b.blocked_id, b.created_at, u.username, u.display_name, u.avatar_url
      FROM blocked_users b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `).bind(blockerId).all();
    return res.results || [];
  },

  async muteChat(db: any, userId: string, chatId: string) {
    await db.prepare(
      'INSERT OR IGNORE INTO muted_chats (user_id, chat_id, created_at) VALUES (?, ?, datetime("now"))'
    ).bind(userId, chatId).run();
  },

  async unmuteChat(db: any, userId: string, chatId: string) {
    await db.prepare(
      'DELETE FROM muted_chats WHERE user_id = ? AND chat_id = ?'
    ).bind(userId, chatId).run();
  },

  async isChatMuted(db: any, userId: string, chatId: string): Promise<boolean> {
    const res = await db.prepare(
      'SELECT 1 FROM muted_chats WHERE user_id = ? AND chat_id = ?'
    ).bind(userId, chatId).first();
    return Boolean(res);
  }
};
