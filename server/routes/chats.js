const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

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
    res.json({ chat: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/chats/:chatId/messages
router.get('/:chatId/messages', auth, async (req, res, next) => {
  const { chatId } = req.params;
  try {
    const { rows: messages } = await db.query(
      `SELECT m.*, u.name AS author_name, u.profile_pic AS author_pic, u.role AS author_role
       FROM messages m
       LEFT JOIN users u ON u.id = m.author_id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC`,
      [chatId]
    );
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

    // Build lookup maps
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
    }));

    res.json({ messages: enriched });
  } catch (err) { next(err); }
});

// DELETE /api/chats/:id — admin only
router.delete('/:id', auth, async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { rows: [chat] } = await db.query('SELECT id FROM chats WHERE id = $1', [req.params.id]);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    await db.query('DELETE FROM chats WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/chats/:chatId/messages
router.post('/:chatId/messages', auth, async (req, res, next) => {
  const { chatId } = req.params;
  const { content, imageUrl, poll, scheduler } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [msg] } = await client.query(
      `INSERT INTO messages (chat_id, author_id, content, image_url)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [chatId, req.user.id, content, imageUrl || null]
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

    const { rows: [author] } = await db.query('SELECT name, profile_pic, role FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({
      message: { ...msg, author_name: author.name, author_pic: author.profile_pic, author_role: author.role,
        reactions: [], helpful: 0, markedHelpfulBy: [], poll: null, scheduler: null },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
