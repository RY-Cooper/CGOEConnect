const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

function postQuery(extraWhere, params, currentUserId) {
  return db.query(
    `SELECT p.*,
       u.name        AS author_name,
       u.profile_pic AS author_pic,
       u.timezone    AS author_timezone,
       (SELECT count(*) FROM post_upvotes WHERE post_id = p.id)                             AS upvotes,
       EXISTS(SELECT 1 FROM post_upvotes WHERE post_id = p.id AND user_id = $${params.length + 1}) AS upvoted,
       (SELECT count(*) FROM comments    WHERE post_id = p.id)                             AS comment_count,
       EXISTS(SELECT 1 FROM saved_posts  WHERE post_id = p.id AND user_id = $${params.length + 1}) AS saved
     FROM posts p
     LEFT JOIN users u ON u.id = p.author_id
     ${extraWhere}
     ORDER BY p.created_at DESC`,
    [...params, currentUserId]
  );
}

// GET /api/posts  — feed filtered to user's enrolled classes + general posts
router.get('/', auth, async (req, res, next) => {
  try {
    const { rows: enrolled } = await db.query(
      'SELECT class_id FROM user_classes WHERE user_id = $1', [req.user.id]
    );
    const classIds = enrolled.map(r => r.class_id);

    const { rows } = await db.query(
      `SELECT p.*,
         u.name        AS author_name,
         u.profile_pic AS author_pic,
         u.timezone    AS author_timezone,
         (SELECT count(*) FROM post_upvotes WHERE post_id = p.id)                      AS upvotes,
         EXISTS(SELECT 1 FROM post_upvotes WHERE post_id = p.id AND user_id = $1)      AS upvoted,
         (SELECT count(*) FROM comments    WHERE post_id = p.id)                      AS comment_count,
         EXISTS(SELECT 1 FROM saved_posts  WHERE post_id = p.id AND user_id = $1)      AS saved
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.class_id IS NULL OR p.class_id = ANY($2::text[])
       ORDER BY p.created_at DESC`,
      [req.user.id, classIds]
    );
    res.json({ posts: rows });
  } catch (err) { next(err); }
});

// POST /api/posts
router.post('/', auth, async (req, res, next) => {
  const { content, class_id, chat_id } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const { rows: [post] } = await db.query(
      `INSERT INTO posts (author_id, class_id, chat_id, content) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, class_id || null, chat_id || null, content]
    );
    const { rows: [author] } = await db.query('SELECT name, profile_pic, timezone FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({
      post: { ...post, author_name: author.name, author_pic: author.profile_pic,
        author_timezone: author.timezone ?? '',
        upvotes: 0, upvoted: false, comment_count: 0, saved: false },
    });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/upvote  — toggle
router.post('/:id/upvote', auth, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT 1 FROM post_upvotes WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM post_upvotes WHERE post_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]);
    } else {
      await db.query('INSERT INTO post_upvotes (post_id, user_id) VALUES ($1,$2)',
        [req.params.id, req.user.id]);
    }
    const { rows: [{ count }] } = await db.query(
      'SELECT count(*) FROM post_upvotes WHERE post_id = $1', [req.params.id]
    );
    res.json({ upvotes: Number(count), upvoted: !existing.rows.length });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/save  — toggle
router.post('/:id/save', auth, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT 1 FROM saved_posts WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM saved_posts WHERE post_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]);
    } else {
      await db.query('INSERT INTO saved_posts (post_id, user_id) VALUES ($1,$2)',
        [req.params.id, req.user.id]);
    }
    res.json({ saved: !existing.rows.length });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/flag  { reason }
router.post('/:id/flag', auth, async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE posts SET flagged = true WHERE id = $1', [req.params.id]);
    await client.query(
      `INSERT INTO flags (target_type, target_id, reported_by, reason) VALUES ('post',$1,$2,$3)`,
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

// GET /api/posts/:id/comments
router.get('/:id/comments', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*, u.name AS author_name, u.profile_pic AS author_pic
       FROM comments c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({ comments: rows });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/comments  { content }
router.post('/:id/comments', auth, async (req, res, next) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const { rows: [comment] } = await db.query(
      'INSERT INTO comments (post_id, author_id, content) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.user.id, content]
    );
    const { rows: [author] } = await db.query('SELECT name, profile_pic FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({ comment: { ...comment, author_name: author.name, author_pic: author.profile_pic } });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id — author, moderator, or admin
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows: [post] } = await db.query('SELECT author_id FROM posts WHERE id=$1', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const isAuthor = post.author_id === req.user.id;
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    if (!isAuthor && !isMod) return res.status(403).json({ error: 'Forbidden' });
    await db.query('DELETE FROM post_upvotes WHERE post_id=$1', [req.params.id]);
    await db.query('DELETE FROM saved_posts WHERE post_id=$1', [req.params.id]);
    await db.query('DELETE FROM comments WHERE post_id=$1', [req.params.id]);
    await db.query("DELETE FROM flags WHERE target_type='post' AND target_id=$1", [req.params.id]);
    await db.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
