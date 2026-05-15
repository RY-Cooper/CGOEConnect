const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// POST /api/reviews/:id/helpful  — toggle
router.post('/:id/helpful', auth, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT 1 FROM review_helpful WHERE review_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await db.query('DELETE FROM review_helpful WHERE review_id = $1 AND user_id = $2',
        [req.params.id, req.user.id]);
    } else {
      await db.query('INSERT INTO review_helpful (review_id, user_id) VALUES ($1,$2)',
        [req.params.id, req.user.id]);
    }
    const { rows: [{ count }] } = await db.query(
      'SELECT count(*) FROM review_helpful WHERE review_id = $1', [req.params.id]
    );
    res.json({ helpful_votes: Number(count), marked: !existing.rows.length });
  } catch (err) { next(err); }
});

// POST /api/reviews/:id/flag  { reason }
router.post('/:id/flag', auth, async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE reviews SET flagged = true WHERE id = $1', [req.params.id]);
    await client.query(
      `INSERT INTO flags (target_type, target_id, reported_by, reason) VALUES ('review',$1,$2,$3)`,
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

// DELETE /api/reviews/:id — author, moderator, or admin
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows: [review] } = await db.query('SELECT author_id FROM reviews WHERE id=$1', [req.params.id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    const isAuthor = review.author_id === req.user.id;
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    if (!isAuthor && !isMod) return res.status(403).json({ error: 'Forbidden' });
    await db.query('DELETE FROM review_helpful WHERE review_id=$1', [req.params.id]);
    await db.query("DELETE FROM flags WHERE target_type='review' AND target_id=$1", [req.params.id]);
    await db.query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
