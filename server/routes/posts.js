const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireModerator = require('../middleware/requireModerator');
const { notify } = require('../notify');

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
     ORDER BY p.pinned DESC, p.created_at DESC`,
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
         EXISTS(SELECT 1 FROM saved_posts  WHERE post_id = p.id AND user_id = $1)      AS saved,
         (SELECT json_build_object(
           'id', pp.id,
           'question', pp.question,
           'voted_option_id', (SELECT option_id FROM post_poll_votes WHERE poll_id = pp.id AND user_id = $1),
           'options', (
             SELECT json_agg(json_build_object(
               'id', po.id, 'text', po.text, 'display_order', po.display_order,
               'votes', (SELECT count(*) FROM post_poll_votes WHERE option_id = po.id)
             ) ORDER BY po.display_order)
             FROM post_poll_options po WHERE po.poll_id = pp.id
           )
         ) FROM post_polls pp WHERE pp.post_id = p.id)                                 AS poll
       FROM posts p
       LEFT JOIN users u ON u.id = p.author_id
       WHERE p.class_id IS NULL OR p.class_id = ANY($2::text[])
       ORDER BY p.pinned DESC, p.created_at DESC`,
      [req.user.id, classIds]
    );
    res.json({ posts: rows });
  } catch (err) { next(err); }
});

// POST /api/posts
router.post('/', auth, async (req, res, next) => {
  const { content, class_id, chat_id, image_url, poll } = req.body;
  if (!content && !image_url && !poll) return res.status(400).json({ error: 'content is required' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [post] } = await client.query(
      `INSERT INTO posts (author_id, class_id, chat_id, content, image_url) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, class_id || null, chat_id || null, content || '', image_url || null]
    );
    let pollData = null;
    if (poll && poll.question && Array.isArray(poll.options) && poll.options.length >= 2) {
      const { rows: [pp] } = await client.query(
        'INSERT INTO post_polls (post_id, question) VALUES ($1,$2) RETURNING id',
        [post.id, poll.question]
      );
      for (let i = 0; i < poll.options.length; i++) {
        await client.query(
          'INSERT INTO post_poll_options (poll_id, text, display_order) VALUES ($1,$2,$3)',
          [pp.id, poll.options[i], i]
        );
      }
      const { rows: opts } = await client.query(
        `SELECT id, text, display_order, 0 AS votes FROM post_poll_options WHERE poll_id = $1 ORDER BY display_order`,
        [pp.id]
      );
      pollData = { id: pp.id, question: poll.question, voted_option_id: null, options: opts };
    }
    await client.query('COMMIT');
    const { rows: [author] } = await db.query('SELECT name, profile_pic, timezone FROM users WHERE id = $1', [req.user.id]);
    res.status(201).json({
      post: { ...post, author_name: author.name, author_pic: author.profile_pic,
        author_timezone: author.timezone ?? '',
        upvotes: 0, upvoted: false, comment_count: 0, saved: false, poll: pollData },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
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
      // Notify post author
      const { rows: [post] } = await db.query(
        'SELECT author_id, class_id, chat_id FROM posts WHERE id = $1', [req.params.id]
      );
      if (post) notify(post.author_id, req.user.id, 'post_upvote', 'post', req.params.id,
        { class_id: post.class_id, chat_id: post.chat_id });
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
    const [{ rows: [comment] }, { rows: [author] }, { rows: [post] }] = await Promise.all([
      db.query('INSERT INTO comments (post_id, author_id, content) VALUES ($1,$2,$3) RETURNING *',
        [req.params.id, req.user.id, content]),
      db.query('SELECT name, profile_pic FROM users WHERE id = $1', [req.user.id]),
      db.query('SELECT author_id, class_id, chat_id FROM posts WHERE id = $1', [req.params.id]),
    ]);
    if (post) notify(post.author_id, req.user.id, 'comment', 'post', req.params.id,
      { class_id: post.class_id, chat_id: post.chat_id });
    res.status(201).json({ comment: { ...comment, author_name: author.name, author_pic: author.profile_pic } });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/vote  { optionId }
router.post('/:id/vote', auth, async (req, res, next) => {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId is required' });
  try {
    const { rows: [poll] } = await db.query(
      'SELECT id FROM post_polls WHERE post_id = $1', [req.params.id]
    );
    if (!poll) return res.status(404).json({ error: 'No poll on this post' });
    await db.query(
      `INSERT INTO post_poll_votes (poll_id, option_id, user_id) VALUES ($1,$2,$3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $2`,
      [poll.id, optionId, req.user.id]
    );
    const { rows: options } = await db.query(
      `SELECT po.id, po.text, po.display_order,
         (SELECT count(*) FROM post_poll_votes WHERE option_id = po.id) AS votes
       FROM post_poll_options po WHERE po.poll_id = $1 ORDER BY po.display_order`,
      [poll.id]
    );
    res.json({ options, voted_option_id: optionId });
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

// PATCH /api/posts/:id/pin — mod or admin, toggles pinned
router.patch('/:id/pin', auth, requireModerator, async (req, res, next) => {
  try {
    const { rows: [post] } = await db.query('SELECT pinned FROM posts WHERE id = $1', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const { rows: [updated] } = await db.query(
      'UPDATE posts SET pinned = $1 WHERE id = $2 RETURNING id, pinned',
      [!post.pinned, req.params.id]
    );
    res.json({ post: updated });
  } catch (err) { next(err); }
});

module.exports = router;
