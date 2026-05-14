const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

const USER_COLS = 'id, email, name, bio, profile_pic, program, student_status, role, agreed_to_guidelines, modality_tags, identity_tags, timezone, created_at';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function withClasses(user) {
  const { rows } = await db.query('SELECT class_id FROM user_classes WHERE user_id = $1', [user.id]);
  return { ...user, classes: rows.map(r => r.class_id) };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { email, password, name, program } = req.body;
  if (!email || !password || !name || !program) {
    return res.status(400).json({ error: 'email, password, name, and program are required' });
  }
  try {
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, name, program) VALUES ($1,$2,$3,$4) RETURNING ${USER_COLS}`,
      [email, hash, name, program]
    );
    const user = await withClasses(rows[0]);
    res.status(201).json({ token: signToken(user), user });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  try {
    const { rows } = await db.query(
      `SELECT ${USER_COLS}, password_hash FROM users WHERE email = $1`, [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const { password_hash, ...rest } = rows[0];
    if (!await bcrypt.compare(password, password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = await withClasses(rest);
    res.json({ token: signToken(user), user });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = await withClasses(rows[0]);
    res.json({ user });
  } catch (err) { next(err); }
});

module.exports = router;
