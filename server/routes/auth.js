const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'CGOEConnect', email: process.env.BREVO_SENDER },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Brevo error ${res.status}`);
  }
}

const USER_COLS = 'id, email, name, bio, profile_pic, program, student_status, role, agreed_to_guidelines, modality_tags, identity_tags, timezone, created_at, suspended_until, banned';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function withClasses(user) {
  const { rows } = await db.query('SELECT class_id FROM user_classes WHERE user_id = $1', [user.id]);
  return { ...user, classes: rows.map(r => r.class_id) };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { email: rawEmail, password, name, program } = req.body;
  const email = rawEmail?.toLowerCase().trim();
  if (!email || !password || !name || !program) {
    return res.status(400).json({ error: 'email, password, name, and program are required' });
  }
  try {
    const exists = await db.query('SELECT id, banned FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      if (exists.rows[0].banned) return res.status(403).json({ error: 'This email address is not eligible for registration.' });
      return res.status(409).json({ error: 'Email already registered' });
    }

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
  const { email: rawEmail, password } = req.body;
  const email = rawEmail?.toLowerCase().trim();
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
    if (rest.banned) {
      return res.status(403).json({ error: 'Your account has been permanently banned.' });
    }
    if (rest.suspended_until && new Date(rest.suspended_until) > new Date()) {
      return res.status(403).json({ error: `Your account is suspended until ${new Date(rest.suspended_until).toLocaleString()}.` });
    }
    const user = await withClasses(rest);
    res.json({ token: signToken(user), user });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password  { email }
router.post('/forgot-password', async (req, res, next) => {
  const { email: rawEmail } = req.body;
  const email = rawEmail?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const { rows } = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    // Always return 200 so we don't reveal whether an email is registered
    if (!rows.length) return res.json({ ok: true });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)`,
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Reset your CGOEConnect password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <h2 style="margin:0 0 8px;font-size:20px;color:#1c1917">Reset your password</h2>
          <p style="margin:0 0 24px;color:#57534e;font-size:15px">
            Hi ${user.name}, click the button below to set a new password.
            This link expires in 1 hour.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#8C1515;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600">
            Reset password
          </a>
          <p style="margin:24px 0 0;color:#a8a29e;font-size:13px">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password  { token, password }
router.post('/reset-password', async (req, res, next) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const { rows } = await db.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

    const resetToken = rows[0];
    const hash = await bcrypt.hash(password, 10);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetToken.user_id]);
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [resetToken.id]);

    res.json({ ok: true });
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
