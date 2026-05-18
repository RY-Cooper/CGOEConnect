const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/notifications — most recent 40, plus unread count
router.get('/', auth, async (req, res, next) => {
  try {
    const [{ rows: notifications }, { rows: [{ count }] }] = await Promise.all([
      db.query(
        `SELECT n.*, u.name AS actor_name, u.profile_pic AS actor_pic
         FROM notifications n
         LEFT JOIN users u ON u.id = n.actor_id
         WHERE n.user_id = $1
         ORDER BY n.created_at DESC
         LIMIT 40`,
        [req.user.id]
      ),
      db.query(
        `SELECT count(*) FROM notifications WHERE user_id = $1 AND read = false`,
        [req.user.id]
      ),
    ]);
    res.json({ notifications, unread: Number(count) });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', auth, async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
