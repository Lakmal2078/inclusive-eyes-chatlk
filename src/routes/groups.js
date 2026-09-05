/**
 * Group Chat Routes (Feature 2)
 */

import { Hono } from 'hono';
import { dbService } from '../services/database.js';

const groupRoutes = new Hono();

/**
 * POST /api/groups - Create a new group chat
 */
groupRoutes.post('/', async c => {
  const userId = c.get('userId');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return c.json({ error: 'Group name is required' }, 400);
  }

  const name = body.name.trim().slice(0, 100);
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null;
  const avatarUrl = typeof body.avatar_url === 'string' ? body.avatar_url : null;
  const memberIds = Array.isArray(body.memberIds) ? body.memberIds : [];

  const group = await dbService.createGroup(c.env.DB, userId, {
    name,
    description,
    avatar_url: avatarUrl,
    memberIds
  });

  return c.json(group, 201);
});

/**
 * GET /api/groups - List all groups for current user
 */
groupRoutes.get('/', async c => {
  const userId = c.get('userId');
  const groups = await dbService.listUserGroups(c.env.DB, userId);
  return c.json({ groups });
});

/**
 * GET /api/groups/:id - Get group details and member list
 */
groupRoutes.get('/:id', async c => {
  const userId = c.get('userId');
  const groupId = c.req.param('id');

  const isMember = await dbService.isGroupMember(c.env.DB, groupId, userId);
  if (!isMember) {
    return c.json({ error: 'You are not a member of this group' }, 403);
  }

  const group = await dbService.getGroupById(c.env.DB, groupId);
  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  const members = await dbService.getGroupMembers(c.env.DB, groupId);
  return c.json({
    ...group,
    members
  });
});

/**
 * POST /api/groups/:id/members - Add member to group (Admin only, up to 50 members)
 */
groupRoutes.post('/:id/members', async c => {
  const callerId = c.get('userId');
  const groupId = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  const targetUserId = body?.userId || body?.user_id;
  if (!targetUserId) {
    return c.json({ error: 'userId is required' }, 400);
  }

  const isAdmin = await dbService.isGroupAdmin(c.env.DB, groupId, callerId);
  if (!isAdmin) {
    return c.json({ error: 'Only group admins can add members' }, 403);
  }

  const group = await dbService.getGroupById(c.env.DB, groupId);
  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  if ((group.member_count || 0) >= 50) {
    return c.json({ error: 'Group has reached maximum limit of 50 members' }, 400);
  }

  const role = body.role === 'admin' ? 'admin' : 'member';
  await dbService.addGroupMember(c.env.DB, groupId, targetUserId, role);

  return c.json({ success: true, message: 'Member added successfully' });
});

/**
 * DELETE /api/groups/:id/members/:userId - Remove member or leave group
 */
groupRoutes.delete('/:id/members/:userId', async c => {
  const callerId = c.get('userId');
  const groupId = c.req.param('id');
  const targetUserId = c.req.param('userId');

  const isAdmin = await dbService.isGroupAdmin(c.env.DB, groupId, callerId);
  const isSelf = callerId === targetUserId;

  if (!isAdmin && !isSelf) {
    return c.json({ error: 'Only admins can remove other members' }, 403);
  }

  await dbService.removeGroupMember(c.env.DB, groupId, targetUserId);
  return c.json({ success: true, message: 'Member removed successfully' });
});

/**
 * PATCH /api/groups/:id - Update group info (name, description, avatar)
 */
groupRoutes.patch('/:id', async c => {
  const callerId = c.get('userId');
  const groupId = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  const isAdmin = await dbService.isGroupAdmin(c.env.DB, groupId, callerId);
  if (!isAdmin) {
    return c.json({ error: 'Only group admins can update group information' }, 403);
  }

  const fields = [];
  const values = [];

  if (body?.name && typeof body.name === 'string') {
    fields.push('name = ?');
    values.push(body.name.trim().slice(0, 100));
  }
  if (body?.description !== undefined) {
    fields.push('description = ?');
    values.push(body.description);
  }
  if (body?.avatar_url !== undefined) {
    fields.push('avatar_url = ?');
    values.push(body.avatar_url);
  }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const now = new Date().toISOString();
  fields.push('updated_at = ?');
  values.push(now);
  values.push(groupId);

  await c.env.DB.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  const updated = await dbService.getGroupById(c.env.DB, groupId);
  return c.json(updated);
});

/**
 * DELETE /api/groups/:id - Delete group (Admin only)
 */
groupRoutes.delete('/:id', async c => {
  const callerId = c.get('userId');
  const groupId = c.req.param('id');

  const isAdmin = await dbService.isGroupAdmin(c.env.DB, groupId, callerId);
  if (!isAdmin) {
    return c.json({ error: 'Only group admins can delete the group' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId).run();
  await c.env.DB.prepare('DELETE FROM chats WHERE id = ?').bind(groupId).run();

  return c.json({ success: true, message: 'Group deleted successfully' });
});

export default groupRoutes;
