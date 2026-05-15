const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const USER_COLS = 'id, email, name, bio, profile_pic, program, student_status, role, agreed_to_guidelines, modality_tags, identity_tags, timezone, created_at';

// GET /api/users — admin only, list all users
router.get('/', auth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${USER_COLS} FROM users ORDER BY created_at DESC`);
    res.json({ users: rows });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/role — admin only
router.patch('/:id/role', auth, requireAdmin, async (req, res, next) => {
  const { role } = req.body;
  if (!['student', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be student, moderator, or admin' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE users SET role=$1 WHERE id=$2 RETURNING ${USER_COLS}`,
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

async function withClasses(user) {
  const { rows } = await db.query('SELECT class_id FROM user_classes WHERE user_id = $1', [user.id]);
  return { ...user, classes: rows.map(r => r.class_id) };
}

// GET /api/users/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: await withClasses(rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put('/:id', auth, async (req, res, next) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const { name, bio, profile_pic, student_status, modality_tags, identity_tags, agreed_to_guidelines, timezone } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET
        name                 = COALESCE($1, name),
        bio                  = COALESCE($2, bio),
        profile_pic          = COALESCE($3, profile_pic),
        student_status       = COALESCE($4, student_status),
        modality_tags        = COALESCE($5, modality_tags),
        identity_tags        = COALESCE($6, identity_tags),
        agreed_to_guidelines = COALESCE($7, agreed_to_guidelines),
        timezone             = COALESCE($8, timezone)
       WHERE id = $9 RETURNING ${USER_COLS}`,
      [name, bio, profile_pic, student_status, modality_tags, identity_tags, agreed_to_guidelines, timezone, req.params.id]
    );
    res.json({ user: await withClasses(rows[0]) });
  } catch (err) { next(err); }
});

// POST /api/users/:id/classes/:classId — enroll
router.post('/:id/classes/:classId', auth, async (req, res, next) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  try {
    await db.query(
      'INSERT INTO user_classes (user_id, class_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.params.id, req.params.classId]
    );
    res.status(204).send();
  } catch (err) { next(err); }
});

// DELETE /api/users/:id/classes/:classId — unenroll
router.delete('/:id/classes/:classId', auth, async (req, res, next) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  try {
    await db.query('DELETE FROM user_classes WHERE user_id = $1 AND class_id = $2', [req.params.id, req.params.classId]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — delete own account
router.delete('/:id', auth, async (req, res, next) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const uid = req.params.id;
    await client.query('DELETE FROM message_reactions WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM message_helpful WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM poll_votes WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM scheduler_attendees WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM user_classes WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM saved_posts WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM post_upvotes WHERE user_id=$1', [uid]);
    await client.query('DELETE FROM flags WHERE reported_by=$1', [uid]);
    await client.query('DELETE FROM comments WHERE author_id=$1', [uid]);
    await client.query('DELETE FROM messages WHERE author_id=$1', [uid]);
    await client.query('DELETE FROM posts WHERE author_id=$1', [uid]);
    await client.query('DELETE FROM reviews WHERE author_id=$1', [uid]);
    await client.query('UPDATE chats SET moderator_id=NULL WHERE moderator_id=$1', [uid]);
    await client.query('UPDATE chats SET created_by=NULL WHERE created_by=$1', [uid]);
    await client.query('DELETE FROM users WHERE id=$1', [uid]);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/users/:id/saved-posts
router.get('/:id/saved-posts', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*,
         u.name        AS author_name,
         u.profile_pic AS author_pic,
         (SELECT count(*) FROM post_upvotes  WHERE post_id = p.id)                           AS upvotes,
         EXISTS(SELECT 1 FROM post_upvotes   WHERE post_id = p.id AND user_id = $2)          AS upvoted,
         (SELECT count(*) FROM comments      WHERE post_id = p.id)                           AS comment_count,
         true                                                                                 AS saved
       FROM posts p
       JOIN saved_posts sp ON sp.post_id = p.id
       LEFT JOIN users u   ON u.id = p.author_id
       WHERE sp.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.id, req.user.id]
    );
    res.json({ posts: rows });
  } catch (err) { next(err); }
});

module.exports = router;
