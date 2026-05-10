const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireModerator = require('../middleware/requireModerator');

// GET /api/flags  — moderator only
router.get('/', auth, requireModerator, async (req, res, next) => {
  const { resolved } = req.query;
  try {
    let sql = `
      SELECT f.*, u.name AS reported_by_name
      FROM flags f
      LEFT JOIN users u ON u.id = f.reported_by`;
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

// PATCH /api/flags/:id/resolve  — moderator only
router.patch('/:id/resolve', auth, requireModerator, async (req, res, next) => {
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
