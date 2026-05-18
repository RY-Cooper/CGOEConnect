const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { notify } = require('../notify');

// POST /api/messages/:id/reactions  { emoji }
router.post('/:id/reactions', auth, async (req, res, next) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'emoji is required' });
  try {
    await db.query(
      'INSERT INTO message_reactions (message_id, emoji, user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [req.params.id, emoji, req.user.id]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// DELETE /api/messages/:id/reactions  { emoji }
router.delete('/:id/reactions', auth, async (req, res, next) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'emoji is required' });
  try {
    await db.query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND emoji = $2 AND user_id = $3',
      [req.params.id, emoji, req.user.id]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/messages/:id/helpful  — toggles helpful vote
router.post('/:id/helpful', auth, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT 1 FROM message_helpful WHERE message_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM message_helpful WHERE message_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]);
    } else {
      await db.query('INSERT INTO message_helpful (message_id, user_id) VALUES ($1,$2)',
        [req.params.id, req.user.id]);
      const { rows: [msg] } = await db.query(
        `SELECT m.author_id, c.id AS chat_id, c.class_id
         FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.id = $1`, [req.params.id]
      );
      if (msg) notify(msg.author_id, req.user.id, 'message_helpful', 'message', req.params.id,
        { chat_id: msg.chat_id, class_id: msg.class_id });
    }
    const { rows: [{ count }] } = await db.query(
      'SELECT count(*) FROM message_helpful WHERE message_id = $1', [req.params.id]
    );
    res.json({ helpful: Number(count), marked: !existing.rows.length });
  } catch (err) { next(err); }
});

// POST /api/messages/:id/flag  { reason }
router.post('/:id/flag', auth, async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE messages SET flagged = true WHERE id = $1', [req.params.id]);
    await client.query(
      `INSERT INTO flags (target_type, target_id, reported_by, reason) VALUES ('message',$1,$2,$3)`,
      [req.params.id, req.user.id, reason]
    );
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/messages/:id/vote  { optionId }
router.post('/:id/vote', auth, async (req, res, next) => {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId is required' });
  try {
    const { rows: [poll] } = await db.query(
      'SELECT id FROM polls WHERE message_id = $1', [req.params.id]
    );
    if (!poll) return res.status(404).json({ error: 'No poll on this message' });

    await db.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $2`,
      [poll.id, optionId, req.user.id]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// POST /api/messages/:id/attend  — join/leave scheduler
router.post('/:id/attend', auth, async (req, res, next) => {
  try {
    const { rows: [sched] } = await db.query(
      'SELECT id FROM schedulers WHERE message_id = $1', [req.params.id]
    );
    if (!sched) return res.status(404).json({ error: 'No scheduler on this message' });

    const existing = await db.query(
      'SELECT 1 FROM scheduler_attendees WHERE scheduler_id = $1 AND user_id = $2',
      [sched.id, req.user.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM scheduler_attendees WHERE scheduler_id = $1 AND user_id = $2',
        [sched.id, req.user.id]);
    } else {
      await db.query('INSERT INTO scheduler_attendees (scheduler_id, user_id) VALUES ($1,$2)',
        [sched.id, req.user.id]);
    }
    const { rows } = await db.query(
      'SELECT array_agg(user_id::text) AS attendees FROM scheduler_attendees WHERE scheduler_id = $1',
      [sched.id]
    );
    res.json({ attendees: rows[0].attendees || [], attending: !existing.rows.length });
  } catch (err) { next(err); }
});

// POST /api/messages/:id/save  — toggle saved
router.post('/:id/save', auth, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT 1 FROM saved_messages WHERE message_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM saved_messages WHERE message_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]);
    } else {
      await db.query('INSERT INTO saved_messages (message_id, user_id) VALUES ($1,$2)',
        [req.params.id, req.user.id]);
    }
    res.json({ saved: !existing.rows.length });
  } catch (err) { next(err); }
});

// DELETE /api/messages/:id — author, chat moderator, or global moderator
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows: [msg] } = await db.query(
      `SELECT m.id, m.author_id, c.moderator_id FROM messages m
       JOIN chats c ON c.id = m.chat_id WHERE m.id = $1`,
      [req.params.id]
    );
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const isAuthor    = msg.author_id    === req.user.id;
    const isChatMod   = msg.moderator_id === req.user.id;
    const isGlobalMod = req.user.role === 'moderator' || req.user.role === 'admin';
    if (!isAuthor && !isChatMod && !isGlobalMod) return res.status(403).json({ error: 'Forbidden' });
    await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
