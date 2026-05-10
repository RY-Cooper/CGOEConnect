const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/classes?program=CGOE
router.get('/', auth, async (req, res, next) => {
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
    res.json({ chats: rows });
  } catch (err) { next(err); }
});

// POST /api/classes/:classId/chats
router.post('/:classId/chats', auth, async (req, res, next) => {
  const { title, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO chats (class_id, title, tags, created_by)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [req.params.classId, title, tags || [], req.user.id]
    );
    res.status(201).json({ chat: rows[0] });
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
