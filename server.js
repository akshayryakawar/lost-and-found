/**
 * Campus Lost & Found - Express Server (Supabase PostgreSQL & Storage)
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');

const { isSupabaseConfigured, testSupabaseConnection } = require('./config/supabase');
const dbService = require('./services/dbService');
const SupabaseSessionStore = require('./services/supabaseSessionStore');

// Route modules & controllers
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const itemController = require('./controllers/itemController');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const COLLECTION_LOCATION = process.env.COLLECTION_LOCATION || 'Student Center Security Desk, Room 102';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required.');
}

if (isProduction && !isSupabaseConfigured()) {
  throw new Error('Supabase credentials are required when NODE_ENV is production.');
}

app.locals.assetVersion = Date.now();
app.set('trust proxy', 1);

// Test Supabase connectivity on startup if credentials exist
if (isSupabaseConfigured()) {
  testSupabaseConnection();
}

// Configure View Engine & Paths
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static Assets
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  maxAge: isProduction ? undefined : 0
}));

// Rendered pages should always revalidate so users receive current templates.
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

// Body Parsing Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Middleware
app.use(session({
  name: 'campus_session_id',
  secret: process.env.SESSION_SECRET,
  store: isProduction ? new SupabaseSessionStore() : undefined,
  resave: false,
  saveUninitialized: true,
  proxy: true,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Flash Messages Middleware
app.use(flash());

// CSRF Protection (uses session, must come after session middleware)
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error_msg', 'Form session expired. Please try again.');
    return res.redirect('back');
  }
  next(err);
});

// Rate Limiting for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts from this IP, please try again after 15 minutes.'
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// Global template variables middleware
app.use(async (req, res, next) => {
  try {
    res.locals.currentUser = req.session.user || null;
    res.locals.isSupabaseActive = isSupabaseConfigured();
    res.locals.collectionLocation = COLLECTION_LOCATION;
    res.locals.unreadCount = 0;

    if (req.session.user) {
      const userId = req.session.user.id || req.session.user._id;
      const notifs = await dbService.getNotifications(userId);
      res.locals.unreadCount = notifs.filter(n => !n.isRead).length;
    }

    const successFlash = req.flash('success_msg');
    const errorFlash = req.flash('error_msg');
    const infoFlash = req.flash('info_msg');

    res.locals.success_msg = (successFlash && successFlash.length > 0) ? successFlash.join(' ') : (req.query.success || '');
    res.locals.error_msg = (errorFlash && errorFlash.length > 0) ? errorFlash.join(' ') : (req.query.error || '');
    res.locals.info_msg = (infoFlash && infoFlash.length > 0) ? infoFlash.join(' ') : (req.query.info || '');
    next();
  } catch (err) {
    console.error('Global template variables middleware error:', err);
    res.locals.unreadCount = 0;
    next();
  }
});

// ==========================================
// Routes: Homepage
// ==========================================
app.get('/', async (req, res) => {
  try {
    const [stats, itemsResult] = await Promise.all([
      dbService.getStats(),
      dbService.getItems({ limit: 6 })
    ]);

    res.render('pages/index', {
      title: 'Home',
      stats,
      recentItems: itemsResult.items
    });
  } catch (err) {
    console.error('Error on homepage:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

// ==========================================
// Modular Application Routers
// ==========================================
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/claims', claimRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/dashboard', dashboardRoutes);

// API Routes
app.get('/api/items/similar', itemController.getSimilarItems);

// 404 Catch-all Handler
app.use((req, res) => {
  res.status(404).render('pages/errors/404', { title: 'Page Not Found' });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error('[Internal Error]', err.stack);
  res.status(500).render('pages/errors/500', { title: 'Server Error' });
});

// Start Server only if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Campus Lost & Found System is Running!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Database: Supabase PostgreSQL & Storage Active`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
