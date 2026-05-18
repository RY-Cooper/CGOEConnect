const jwt = require('jsonwebtoken');
const db  = require('../db');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  try {
    const { rows } = await db.query(
      'SELECT banned, suspended_until FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const { banned, suspended_until } = rows[0];
    if (banned) return res.status(403).json({ error: 'Your account has been permanently banned.' });
    if (suspended_until && new Date(suspended_until) > new Date()) {
      return res.status(403).json({ error: `Your account is suspended until ${new Date(suspended_until).toLocaleString()}.` });
    }
    next();
  } catch (err) {
    next(err);
  }
};
