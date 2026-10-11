import { Hono } from 'hono';
import { dbService } from '../services/database.js';
import { verify } from '../lib/jwt.js';

export const inviteRoutes = new Hono();

/**
 * GET /api/invites/:code - Public preview of invite link
 */
inviteRoutes.get('/:code', async c => {
  const code = c.req.param('code');
  if (!code || code.length < 3) {
    return c.json({ valid: false, error: 'Invalid invite code format' }, 400);
  }

  const invite = await dbService.getInviteByCode(c.env.DB, code);
  if (!invite) {
    return c.json({ valid: false, error: 'Invite link not found' }, 404);
  }

  if (invite.is_expired) {
    return c.json({ valid: false, error: 'This invite link has expired' }, 410);
  }

  if (invite.is_exhausted) {
    return c.json({ valid: false, error: 'This invite link has reached its maximum member limit' }, 410);
  }

  return c.json({
    valid: true,
    invite: {
      code: invite.code,
      group: {
        id: invite.group_id,
        name: invite.group_name,
        description: invite.group_description,
        avatar_url: invite.group_avatar_url,
        member_count: Number(invite.member_count || 1)
      },
      host: {
        display_name: invite.host_display_name,
        username: invite.host_username
      }
    }
  });
});

/**
 * POST /api/invites/:code/join - Join group using invite code (Requires auth)
 */
inviteRoutes.post('/:code/join', async c => {
  let userId = c.get('userId');
  if (!userId) {
    const header = c.req.header('Authorization') || '';
    if (header.startsWith('Bearer ')) {
      try {
        const payload = await verify(header.slice(7), c.env.JWT_SECRET);
        userId = payload?.sub;
      } catch {}
    }
  }

  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const code = c.req.param('code');
  try {
    const result = await dbService.joinGroupViaInvite(c.env.DB, code, userId);
    return c.json({
      success: true,
      chatId: result.groupId,
      groupName: result.groupName,
      alreadyMember: result.alreadyMember
    });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});
