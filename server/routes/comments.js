const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

// POST /api/comments/:id/flag  { reason }
router.post('/:id/flag', auth, async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE comments SET flagged = true WHERE id = $1', [req.params.id]);
    await client.query(
      `INSERT INTO flags (target_type, target_id, reported_by, reason) VALUES ('comment',$1,$2,$3)`,
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

// DELETE /api/comments/:id — author, moderator, or admin
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { rows: [comment] } = await db.query('SELECT author_id FROM comments WHERE id=$1', [req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const isAuthor = comment.author_id === req.user.id;
    const isMod = req.user.role === 'moderator' || req.user.role === 'admin';
    if (!isAuthor && !isMod) return res.status(403).json({ error: 'Forbidden' });
    await db.query("DELETE FROM flags WHERE target_type='comment' AND target_id=$1", [req.params.id]);
    await db.query('DELETE FROM comments WHERE id=$1', [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

module.exports = router;
