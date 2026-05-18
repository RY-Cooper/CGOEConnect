const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const requireModerator = require('../middleware/requireModerator');

// POST /api/feedback — any authenticated user
router.post('/', auth, async (req, res, next) => {
  const { category, message } = req.body;
  if (!['bug', 'feature', 'general'].includes(category)) {
    return res.status(400).json({ error: 'category must be bug, feature, or general' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO feedback (user_id, category, message) VALUES ($1, $2, $3) RETURNING id, created_at`,
      [req.user.id, category, message.trim()]
    );
    res.status(201).json({ feedback: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/feedback — mod or admin
router.get('/', auth, requireModerator, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT f.id, f.category, f.message, f.status, f.created_at,
             u.name AS author_name, u.email AS author_email, u.profile_pic AS author_pic
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
    `);
    res.json({ feedback: rows });
  } catch (err) { next(err); }
});

// PATCH /api/feedback/:id/status — mod or admin
router.patch('/:id/status', auth, requireModerator, async (req, res, next) => {
  const { status } = req.body;
  if (!['open', 'in_progress', 'resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be open, in_progress, resolved, or rejected' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE feedback SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Feedback not found' });
    res.json({ feedback: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
