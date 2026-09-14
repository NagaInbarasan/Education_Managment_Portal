import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import subjectRoutes from './routes/subjects.js';
import assignmentRoutes from './routes/assignments.js';
import testRoutes from './routes/tests.js';
import uploadRoutes from './routes/uploads.js';
import departmentRoutes from './routes/departments.js';
import sectionRoutes from './routes/sections.js';
import offeringRoutes from './routes/offerings.js';
import timetableRoutes from './routes/timetable.js';
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import notificationsRoutes from './routes/notifications.js';
import announcementsRoutes from './routes/announcements.js';
import aiRoutes from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
app.use(helmet());
// ============================================================
// CORS CONFIGURATION
// - Development: permissive (allow any origin)
// - Production: restricted to CORS_ORIGIN env var
// ============================================================
const corsOptions = (() => {
  if (process.env.NODE_ENV === 'production') {
    const allowed = process.env.CORS_ORIGIN;
    if (!allowed) {
      console.warn('[SECURITY] CORS_ORIGIN is not set in production. Cross-origin requests will be blocked.');
    }
    return {
      origin: allowed || false,
      credentials: true
    };
  }
  // Development: allow all origins
  return { origin: true, credentials: true };
})();
app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));

// Handle JSON parse errors — return clean JSON, not Express default HTML
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large.' });
  }
  next(err);
});

// --- RATE LIMITING ---
// Global: 100 requests per minute per IP (generous for normal use)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' }
});
app.use('/api/', globalLimiter);

// Auth: stricter limit — 10 login attempts per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a moment.' }
});
app.use('/api/auth/login', authLimiter);

// --- HEALTH CHECK (unauthenticated — used for monitoring) ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- AUTHENTICATION ROUTES (no authMiddleware — these ARE authentication) ---
app.use('/api/auth', authRoutes);

// --- ACADEMIC SUBJECT ROUTES ---
app.use('/api/subjects', subjectRoutes);
app.use('/api', assignmentRoutes);
app.use('/api', testRoutes);
app.use('/api', uploadRoutes);

// --- ACADEMIC ORGANIZATION ROUTES ---
app.use('/api/departments', departmentRoutes);
app.use('/api', sectionRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/ai', aiRoutes);

// ============================================================
// PRODUCTION DEPLOYMENT NOTES
// ============================================================
// HTTPS: This server runs HTTP. In production, TLS must be terminated
// at the reverse proxy (nginx, Caddy, AWS ALB, etc.).
// Set environment variable HTTPS_PROXY=true to suppress the warning.
// Never expose this HTTP server directly to the internet.
// ============================================================

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Phazon API server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production' && !process.env.HTTPS_PROXY) {
    console.warn('[SECURITY] Running in production without HTTPS_PROXY set. Ensure TLS is terminated at a reverse proxy.');
  }
});