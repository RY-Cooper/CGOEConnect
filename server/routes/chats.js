const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Returns true if user can access chat; writes 403/404 to res and returns false otherwise.
async function assertAccess(chatId, userId, res) {
  try {
    const { rows: [chat] } = await db.query(
      'SELECT is_private, created_by FROM chats WHERE id = $1', [chatId]
    );
    if (!chat) { res.status(404).json({ error: 'Chat not found' }); return false; }
    if (!chat.is_private || chat.created_by === userId) return true;
    try {
      const { rows: [member] } = await db.query(
        'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]
      );
      if (member) return true;
    } catch {
      // chat_members table may not exist yet — allow access
      return true;
    }
    res.status(403).json({ error: 'Access denied', code: 'NOT_MEMBER' });
    return false;
  } catch {
    // is_private column may not exist yet — allow access
    return true;
  }
}

// GET /api/chats/general  — must come before /:id
router.get('/general', auth, async (req, res, next) => {
  try {
    let { rows } = await db.query(
      `SELECT c.*, u.name AS created_by_name, u.profile_pic AS created_by_pic
       FROM chats c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.class_id IS NULL
       ORDER BY c.created_at ASC`
    );
    if (!rows.length) {
      const { rows: created } = await db.query(
        `INSERT INTO chats (title, tags) VALUES ('#introductions', '{}') RETURNING *`
      );
      rows = [{ ...created[0], created_by_name: null, created_by_pic: null }];
    }
    res.json({ chats: rows });
  } catch (err) { next(err); }
});

// GET /api/chats/mine — subchats created by current user (must come before /:id)
router.get('/mine', auth, async (req, res, next) => {
  try {
    let rows;
    try {
      const result = await db.query(
        `SELECT c.*,
           u.name AS created_by_name, u.profile_pic AS created_by_pic,
           cl.name AS class_name
         FROM chats c
         LEFT JOIN users u ON u.id = c.created_by
         LEFT JOIN classes cl ON cl.id = c.class_id
         WHERE c.created_by = $1 AND (c.is_channel = false OR c.is_channel IS NULL)
         ORDER BY c.created_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    } catch {
      // is_channel column may not exist yet — fall back to simpler query
      const result = await db.query(
        `SELECT c.*,
           u.name AS created_by_name, u.profile_pic AS created_by_pic,
           cl.name AS class_name
         FROM chats c
         LEFT JOIN users u ON u.id = c.created_by
         LEFT JOIN classes cl ON cl.id = c.class_id
         WHERE c.created_by = $1
         ORDER BY c.created_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    }

    // Enrich with member/request counts — gracefully skip if tables don't exist yet
    let memberCounts = {}, pendingCounts = {};
    if (rows.length) {
      const ids = rows.map(c => c.id);
      try {
        const [mc, pc] = await Promise.all([
          db.query('SELECT chat_id, count(*) FROM chat_members WHERE chat_id = ANY($1::uuid[]) GROUP BY chat_id', [ids]),
          db.query(`SELECT chat_id, count(*) FROM chat_join_requests WHERE chat_id = ANY($1::uuid[]) AND status = 'pending' GROUP BY chat_id`, [ids]),
        ]);
        for (const r of mc.rows) memberCounts[r.chat_id] = Number(r.count);
        for (const r of pc.rows) pendingCounts[r.chat_id] = Number(r.count);
      } catch { /* tables may not exist yet — counts default to 0 */ }
    }

    const enriched = rows.map(c => ({
      ...c,
      member_count: memberCounts[c.id] ?? 0,
      pending_requests: pendingCounts[c.id] ?? 0,
    }));
    res.json({ chats: enriched });
  } catch (err) { next(err); }
});

// GET /api/chats/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.name AS created_by_name, u.profile_pic AS created_by_pic
       FROM chats c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Chat not found' });
    const chat = rows[0];

    let is_member = chat.created_by === req.user.id;
    let request_status = null;
    try {
      const [memRow, reqRow] = await Promise.all([
        db.query('SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chat.id, req.user.id]),
        db.query(`SELECT status FROM chat_join_requests WHERE chat_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`, [chat.id, req.user.id]),
      ]);
      if (memRow.rows.length) is_member = true;
      request_status = reqRow.rows[0]?.status ?? null;
    } catch { /* tables may not exist yet */ }

    res.json({ chat: { ...chat, is_member, request_status } });
  } catch (err) { next(err); }
});

// GET /api/chats/:chatId/messages
router.get('/:chatId/messages', auth, async (req, res, next) => {
  const { chatId } = req.params;
  try {
    if (!await assertAccess(chatId, req.user.id, res)) return;

    const { rows: messages } = await db.query(
      `SELECT m.*, u.name AS author_name, u.profile_pic AS author_pic, u.role AS author_role, u.timezone AS author_timezone
       FROM messages m
       LEFT JOIN users u ON u.id = m.author_id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC`,
      [chatId]
    );

    // Enrich with saved status — gracefully skip if table doesn't exist yet
    let savedSet = new Set();
    if (messages.length) {
      try {
        const { rows: sv } = await db.query(
          `SELECT message_id FROM saved_messages WHERE message_id = ANY($1::uuid[]) AND user_id = $2`,
          [messages.map(m => m.id), req.user.id]
        );
        for (const r of sv) savedSet.add(r.message_id);
      } catch { /* saved_messages table may not exist yet */ }
    }
    if (!messages.length) return res.json({ messages: [] });

    const ids = messages.map(m => m.id);

    const [reactRows, helpRows, pollRows, voteRows, schedRows] = await Promise.all([
      db.query(
        `SELECT message_id, emoji, array_agg(user_id::text) AS user_ids
         FROM message_reactions WHERE message_id = ANY($1::uuid[])
         GROUP BY message_id, emoji`,
        [ids]
      ),
      db.query(
        `SELECT message_id, array_agg(user_id::text) AS user_ids
         FROM message_helpful WHERE message_id = ANY($1::uuid[])
         GROUP BY message_id`,
        [ids]
      ),
      db.query(
        `SELECT p.id, p.message_id, p.question,
           json_agg(
             json_build_object('id',po.id,'text',po.text,
               'votes',(SELECT count(*) FROM poll_votes WHERE option_id = po.id))
             ORDER BY po.display_order
           ) AS options
         FROM polls p
         JOIN poll_options po ON po.poll_id = p.id
         WHERE p.message_id = ANY($1::uuid[])
         GROUP BY p.id`,
        [ids]
      ),
      db.query(
        `SELECT pv.poll_id::text, pv.user_id::text, pv.option_id::text
         FROM poll_votes pv
         JOIN polls p ON p.id = pv.poll_id
         WHERE p.message_id = ANY($1::uuid[])`,
        [ids]
      ),
      db.query(
        `SELECT s.*, array_agg(sa.user_id::text) FILTER (WHERE sa.user_id IS NOT NULL) AS attendees
         FROM schedulers s
         LEFT JOIN scheduler_attendees sa ON sa.scheduler_id = s.id
         WHERE s.message_id = ANY($1::uuid[])
         GROUP BY s.id`,
        [ids]
      ),
    ]);

    const byReaction = {};
    for (const r of reactRows.rows) {
      (byReaction[r.message_id] ||= []).push({ emoji: r.emoji, userIds: r.user_ids });
    }
    const byHelpful = {};
    for (const h of helpRows.rows) byHelpful[h.message_id] = h.user_ids;

    const votedByPoll = {};
    for (const v of voteRows.rows) {
      (votedByPoll[v.poll_id] ||= {})[v.user_id] = v.option_id;
    }
    const byPoll = {};
    for (const p of pollRows.rows) {
      byPoll[p.message_id] = { id: p.id, question: p.question, options: p.options, votedBy: votedByPoll[p.id] || {} };
    }
    const bySched = {};
    for (const s of schedRows.rows) {
      bySched[s.message_id] = { id: s.id, title: s.title, date: s.date, time: s.time, location: s.location, attendees: s.attendees || [] };
    }

    const enriched = messages.map(m => ({
      ...m,
      reactions:       byReaction[m.id] || [],
      helpful:         (byHelpful[m.id] || []).length,
      markedHelpfulBy: byHelpful[m.id] || [],
      poll:            byPoll[m.id] || null,
      scheduler:       bySched[m.id] || null,
      saved:           savedSet.has(m.id),
    }));

    res.json({ messages: enriched });
  } catch (err) { next(err); }
});

// DELETE /api/chats/:id — admin or subchat creator
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows: [chat] } = await db.query(
      'SELECT id, created_by, is_channel FROM chats WHERE id = $1', [req.params.id]
    );
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const isAdmin   = req.user.role === 'admin';
    const isCreator = chat.created_by === req.user.id && !chat.is_channel;
    if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Forbidden' });
    await db.query('DELETE FROM chats WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/chats/:chatId/messages
router.post('/:chatId/messages', auth, async (req, res, next) => {
  const { chatId } = req.params;
  const { content, imageUrl, poll, scheduler } = req.body;
  const hasPoll = poll?.question && Array.isArray(poll.options) && poll.options.length;
  const hasScheduler = Boolean(scheduler?.title);
  if (!content && !hasPoll && !hasScheduler) return res.status(400).json({ error: 'content, poll, or scheduler is required' });

  if (!await assertAccess(chatId, req.user.id, res)) return;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [msg] } = await client.query(
      `INSERT INTO messages (chat_id, author_id, content, image_url)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [chatId, req.user.id, content || '', imageUrl || null]
    );

    if (poll?.question && Array.isArray(poll.options) && poll.options.length) {
      const { rows: [{ id: pollId }] } = await client.query(
        'INSERT INTO polls (message_id, question) VALUES ($1,$2) RETURNING id',
        [msg.id, poll.question]
      );
      for (let i = 0; i < poll.options.length; i++) {
        await client.query(
          'INSERT INTO poll_options (poll_id, text, display_order) VALUES ($1,$2,$3)',
          [pollId, poll.options[i], i]
        );
      }
    }

    if (scheduler?.title) {
      const { rows: [{ id: schedId }] } = await client.query(
        `INSERT INTO schedulers (message_id, title, date, time, location)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [msg.id, scheduler.title, scheduler.date, scheduler.time, scheduler.location || '']
      );
      await client.query(
        'INSERT INTO scheduler_attendees (scheduler_id, user_id) VALUES ($1,$2)',
        [schedId, req.user.id]
      );
    }

    await client.query('COMMIT');

    const { rows: [author] } = await db.query('SELECT name, profile_pic, role, timezone FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({
      message: { ...msg, author_name: author.name, author_pic: author.profile_pic, author_role: author.role,
        author_timezone: author.timezone ?? '',
        reactions: [], helpful: 0, markedHelpfulBy: [], poll: null, scheduler: null, saved: false },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/chats/:id/members — creator or admin only
router.get('/:id/members', auth, async (req, res, next) => {
  try {
    const { rows: [chat] } = await db.query('SELECT created_by FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the creator can view members' });
    }
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.profile_pic, u.program, cm.joined_at
       FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.chat_id = $1
       ORDER BY cm.joined_at ASC`,
      [req.params.id]
    );
    res.json({ members: rows });
  } catch (err) { next(err); }
});

// POST /api/chats/:id/members — add member by userId (creator or admin)
router.post('/:id/members', auth, async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    const { rows: [chat] } = await db.query('SELECT created_by FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the creator can add members' });
    }
    const { rows: [user] } = await db.query('SELECT id, name, profile_pic, program FROM users WHERE id = $1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, userId]
    );
    await db.query(
      `UPDATE chat_join_requests SET status = 'accepted' WHERE chat_id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    res.status(201).json({ member: { ...user, joined_at: new Date().toISOString() } });
  } catch (err) { next(err); }
});

// DELETE /api/chats/:id/members/:userId — remove member (creator or admin)
router.delete('/:id/members/:userId', auth, async (req, res, next) => {
  try {
    const { rows: [chat] } = await db.query('SELECT created_by FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the creator can remove members' });
    }
    if (req.params.userId === chat.created_by) {
      return res.status(400).json({ error: 'Cannot remove the creator' });
    }
    await db.query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/chats/:id/join-request — request to join a private chat
router.post('/:id/join-request', auth, async (req, res, next) => {
  try {
    const { rows: [chat] } = await db.query('SELECT id, is_private, created_by FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.is_private) return res.status(400).json({ error: 'Chat is not private' });
    if (chat.created_by === req.user.id) return res.status(400).json({ error: 'You are the creator' });

    const { rows: [member] } = await db.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chat.id, req.user.id]
    );
    if (member) return res.status(400).json({ error: 'Already a member' });

    await db.query(
      `INSERT INTO chat_join_requests (chat_id, user_id)
       VALUES ($1,$2)
       ON CONFLICT (chat_id, user_id) DO UPDATE SET status = 'pending', created_at = NOW()`,
      [chat.id, req.user.id]
    );
    res.status(201).json({ status: 'pending' });
  } catch (err) { next(err); }
});

// GET /api/chats/:id/join-requests — list pending requests (creator or admin)
router.get('/:id/join-requests', auth, async (req, res, next) => {
  try {
    const { rows: [chat] } = await db.query('SELECT created_by FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the creator can view requests' });
    }
    const { rows } = await db.query(
      `SELECT jr.id, jr.status, jr.created_at,
         u.id AS user_id, u.name AS user_name, u.profile_pic AS user_pic, u.program AS user_program
       FROM chat_join_requests jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.chat_id = $1 AND jr.status = 'pending'
       ORDER BY jr.created_at ASC`,
      [req.params.id]
    );
    res.json({ requests: rows });
  } catch (err) { next(err); }
});

// PATCH /api/chats/:id/join-requests/:requestId — accept or deny
router.patch('/:id/join-requests/:requestId', auth, async (req, res, next) => {
  const { action } = req.body;
  if (!['accept', 'deny'].includes(action)) {
    return res.status(400).json({ error: 'action must be accept or deny' });
  }
  try {
    const { rows: [chat] } = await db.query('SELECT created_by FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the creator can respond to requests' });
    }
    const status = action === 'accept' ? 'accepted' : 'denied';
    const { rows: [jr] } = await db.query(
      `UPDATE chat_join_requests SET status = $1 WHERE id = $2 AND chat_id = $3 RETURNING user_id`,
      [status, req.params.requestId, req.params.id]
    );
    if (!jr) return res.status(404).json({ error: 'Request not found' });
    if (action === 'accept') {
      await db.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [req.params.id, jr.user_id]
      );
    }
    res.json({ status });
  } catch (err) { next(err); }
});

module.exports = router;
