import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../supabase.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET in .env');
  process.exit(1);
}
// Reject weak secrets in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  console.error('[SECURITY] JWT_SECRET is too short for production (min 32 chars). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64\'))"');
  process.exit(1);
}

const JWT_EXPIRES_IN = '24h';

/**
 * POST /api/auth/login
 * Body: { portal_id, password }
 * Returns: { token, user }
 */
router.post('/login', async (req, res) => {
  const { portal_id, password } = req.body;

  if (!portal_id || !password) {
    return res.status(400).json({ error: 'Portal ID and password are required.' });
  }

  try {
    // 1. Find user by portal_id
    const { data: user, error } = await supabase
      .from('portal_users')
      .select('portal_id, name, email, role, department, department_id, section_id, batch_year, register_number, dob, password_hash')
      .eq('portal_id', portal_id.trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 2. Verify password hash
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account not activated. Contact Admin.' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 3. Sign JWT
    const payload = {
      portal_id: user.portal_id,
      role: user.role,
      name: user.name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 4. Return token + user (never send password_hash to client)
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Returns: user object (fresh from DB)
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from DB
    const { data: user, error } = await supabase
      .from('portal_users')
      .select('portal_id, name, email, role, department, department_id, section_id, batch_year, register_number, dob')
      .eq('portal_id', decoded.portal_id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    console.error('Auth/me error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
