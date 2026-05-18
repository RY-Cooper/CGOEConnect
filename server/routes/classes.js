const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// POST /api/classes — admin only
router.post('/', auth, requireAdmin, async (req, res, next) => {
  const { id, name, programs } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO classes (id, name, programs) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET name=$2, programs=$3 RETURNING *`,
      [id.trim(), name.trim(), programs || []]
    );
    res.status(201).json({ class: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/classes/:id — admin only, cascades chats/resources/reviews/enrollments
router.delete('/:id', auth, requireAdmin, async (req, res, next) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const classId = req.params.id;

    // cascade messages inside class chats
    await client.query(`
      DELETE FROM message_reactions WHERE message_id IN (
        SELECT m.id FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM message_helpful WHERE message_id IN (
        SELECT m.id FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM poll_votes WHERE poll_id IN (
        SELECT p.id FROM polls p JOIN messages m ON m.id = p.message_id
        JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM poll_options WHERE poll_id IN (
        SELECT p.id FROM polls p JOIN messages m ON m.id = p.message_id
        JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM polls WHERE message_id IN (
        SELECT m.id FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM scheduler_attendees WHERE scheduler_id IN (
        SELECT s.id FROM schedulers s JOIN messages m ON m.id = s.message_id
        JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM schedulers WHERE message_id IN (
        SELECT m.id FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM flags WHERE target_type = 'message' AND target_id IN (
        SELECT m.id FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE class_id = $1)`, [classId]);
    await client.query(`DELETE FROM chats WHERE class_id = $1`, [classId]);

    // resources
    await client.query(`DELETE FROM resources WHERE class_id = $1`, [classId]);

    // reviews
    await client.query(`
      DELETE FROM review_helpful WHERE review_id IN (SELECT id FROM reviews WHERE class_id = $1)`, [classId]);
    await client.query(`
      DELETE FROM flags WHERE target_type = 'review' AND target_id IN (
        SELECT id FROM reviews WHERE class_id = $1)`, [classId]);
    await client.query(`DELETE FROM reviews WHERE class_id = $1`, [classId]);

    // user enrollments
    await client.query(`
      UPDATE users SET classes = array_remove(classes, $1) WHERE $1 = ANY(classes)`, [classId]);

    await client.query(`DELETE FROM classes WHERE id = $1`, [classId]);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/classes?program=CGOE — public so the registration form can load the catalog
router.get('/', async (req, res, next) => {
  try {
    const { program } = req.query;
    const { rows } = program
      ? await db.query('SELECT * FROM classes WHERE $1 = ANY(programs) ORDER BY id', [program])
      : await db.query('SELECT * FROM classes ORDER BY id');
    res.json({ classes: rows });
  } catch (err) { next(err); }
});

// GET /api/classes/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM classes WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Class not found' });
    res.json({ class: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/classes/:classId/chats
router.get('/:classId/chats', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.name AS created_by_name, u.profile_pic AS created_by_pic
       FROM chats c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.class_id = $1
       ORDER BY c.pinned DESC, c.created_at ASC`,
      [req.params.classId]
    );

    // Enrich with membership — gracefully skip if new tables don't exist yet
    let enriched = rows.map(c => ({ ...c, is_member: c.created_by === req.user.id, request_status: null }));
    if (rows.length) {
      const ids = rows.map(c => c.id);
      try {
        const [memRows, reqRows] = await Promise.all([
          db.query(`SELECT chat_id FROM chat_members WHERE chat_id = ANY($1::uuid[]) AND user_id = $2`, [ids, req.user.id]),
          db.query(`SELECT DISTINCT ON (chat_id) chat_id, status FROM chat_join_requests WHERE chat_id = ANY($1::uuid[]) AND user_id = $2 ORDER BY chat_id, created_at DESC`, [ids, req.user.id]),
        ]);
        const memberSet = new Set(memRows.rows.map(r => r.chat_id));
        const reqMap = {};
        for (const r of reqRows.rows) reqMap[r.chat_id] = r.status;
        enriched = rows.map(c => ({
          ...c,
          is_member: c.created_by === req.user.id || memberSet.has(c.id),
          request_status: reqMap[c.id] ?? null,
        }));
      } catch { /* tables may not exist yet */ }
    }
    res.json({ chats: enriched });
  } catch (err) { next(err); }
});

// POST /api/classes/:classId/chats
// is_channel=true requires admin; subchats open to all authenticated users
router.post('/:classId/chats', auth, async (req, res, next) => {
  const { title, tags, is_channel, is_private } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (is_channel && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create class channels' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Try with is_private column; fall back if it doesn't exist yet
    let chat;
    try {
      const { rows: [c] } = await client.query(
        `INSERT INTO chats (class_id, title, tags, created_by, moderator_id, is_channel, is_private)
         VALUES ($1,$2,$3,$4,$4,$5,$6)
         RETURNING *`,
        [req.params.classId, title, tags || [], req.user.id, Boolean(is_channel), Boolean(is_private)]
      );
      chat = c;
    } catch {
      const { rows: [c] } = await client.query(
        `INSERT INTO chats (class_id, title, tags, created_by, moderator_id, is_channel)
         VALUES ($1,$2,$3,$4,$4,$5)
         RETURNING *`,
        [req.params.classId, title, tags || [], req.user.id, Boolean(is_channel)]
      );
      chat = c;
    }
    // Auto-add creator as member (skip if table doesn't exist)
    try {
      await client.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [chat.id, req.user.id]
      );
    } catch { /* chat_members table may not exist yet */ }
    await client.query('COMMIT');
    res.status(201).json({ chat: { ...chat, is_member: true, request_status: null } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/classes/:classId/resources
router.get('/:classId/resources', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS uploaded_by_name
       FROM resources r
       LEFT JOIN users u ON u.id = r.uploaded_by
       WHERE r.class_id = $1 ORDER BY r.created_at DESC`,
      [req.params.classId]
    );
    res.json({ resources: rows });
  } catch (err) { next(err); }
});

// POST /api/classes/:classId/resources
router.post('/:classId/resources', auth, async (req, res, next) => {
  const { title, url, file_type } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'title and url are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO resources (class_id, title, url, file_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.classId, title, url, file_type || 'Link', req.user.id]
    );
    res.status(201).json({ resource: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/classes/:classId/resources/:id
router.delete('/:classId/resources/:id', auth, async (req, res, next) => {
  try {
    const { rows: [r] } = await db.query('SELECT * FROM resources WHERE id = $1', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Resource not found' });
    if (r.uploaded_by !== req.user.id && req.user.role !== 'moderator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.query('DELETE FROM resources WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/classes/:classId/reviews
router.get('/:classId/reviews', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*,
         u.name        AS author_name,
         u.profile_pic AS author_pic,
         (SELECT count(*) FROM review_helpful WHERE review_id = r.id)        AS helpful_votes,
         EXISTS(SELECT 1 FROM review_helpful WHERE review_id = r.id AND user_id = $2) AS marked_helpful
       FROM reviews r
       LEFT JOIN users u ON u.id = r.author_id
       WHERE r.class_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.classId, req.user.id]
    );
    res.json({ reviews: rows });
  } catch (err) { next(err); }
});

// POST /api/classes/:classId/reviews
router.post('/:classId/reviews', auth, async (req, res, next) => {
  const { rating, content, cgoe_specific } = req.body;
  if (!rating || !content) return res.status(400).json({ error: 'rating and content are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO reviews (class_id, author_id, rating, content, cgoe_specific)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [req.params.classId, req.user.id, rating, content, cgoe_specific || false]
    );
    res.status(201).json({ review: { ...rows[0], helpful_votes: 0, marked_helpful: false } });
  } catch (err) { next(err); }
});

module.exports = router;
