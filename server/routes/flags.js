const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

function requireModOrAdmin(req, res, next) {
  if (req.user?.role !== 'moderator' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Moderator or admin access required' });
  }
  next();
}

// GET /api/flags
router.get('/', auth, requireModOrAdmin, async (req, res, next) => {
  const { resolved } = req.query;
  try {
    let sql = `
      SELECT f.*,
        u.name AS reported_by_name,
        CASE
          WHEN f.target_type = 'message' THEN m.content
          WHEN f.target_type = 'review'  THEN r.content
          ELSE NULL
        END AS target_content,
        CASE
          WHEN f.target_type = 'message' THEN m.chat_id::text
          ELSE NULL
        END AS target_chat_id,
        CASE
          WHEN f.target_type = 'message' THEN ch.class_id
          ELSE NULL
        END AS target_class_id
      FROM flags f
      LEFT JOIN users u ON u.id = f.reported_by
      LEFT JOIN messages m ON f.target_type = 'message' AND m.id::text = f.target_id
      LEFT JOIN chats ch ON ch.id = m.chat_id
      LEFT JOIN reviews r ON f.target_type = 'review' AND r.id::text = f.target_id`;
    const params = [];
    if (resolved !== undefined) {
      sql += ' WHERE f.resolved = $1';
      params.push(resolved === 'true');
    }
    sql += ' ORDER BY f.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json({ flags: rows });
  } catch (err) { next(err); }
});

// PATCH /api/flags/:id/resolve
router.patch('/:id/resolve', auth, requireModOrAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'UPDATE flags SET resolved = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Flag not found' });
    res.json({ flag: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
