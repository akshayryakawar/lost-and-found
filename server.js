/**
 * Campus Lost & Found - Express Server (Supabase PostgreSQL & Storage)
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');

const { isSupabaseConfigured, testSupabaseConnection } = require('./config/supabase');
const dbService = require('./services/dbService');
const { uploadItemImage, MAX_FILE_SIZE } = require('./services/storageService');
const authRoutes = require('./routes/auth');
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth');
const { validateItemReport, validateClaim } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required when NODE_ENV is production.');
}

app.locals.assetVersion = Date.now();

// Configure Multer for in-memory file handling before upload to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  secret: process.env.SESSION_SECRET || 'campus_lost_and_found_default_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Flash Messages Middleware
app.use(flash());

// Global template variables middleware
app.use(async (req, res, next) => {
  try {
    res.locals.currentUser = req.session.user || null;
    res.locals.isSupabaseActive = isSupabaseConfigured();
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
// Authentication Routes (Login, Register, Logout)
// ==========================================
app.use('/auth', authRoutes);

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
// Routes: Items Directory (Search & Filter)
// ==========================================
app.get('/items', async (req, res) => {
  const { search, type, category, location, status, page } = req.query;
  const currentPage = parseInt(page, 10) || 1;
  const filters = { search, type, category, location, status };
  const buildPageUrl = (pageNumber) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', pageNumber);
    return `/items?${params.toString()}`;
  };

  try {
    const result = await dbService.getItems({
      search,
      type,
      category,
      location,
      status,
      page: currentPage,
      limit: 6
    });

    res.render('pages/items/index', {
      title: 'Browse Items',
      items: result.items,
      currentFilters: filters,
      buildPageUrl,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems
      }
    });
  } catch (err) {
    console.error('Error on items directory:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

// ==========================================
// Routes: Report Item Form (Protected)
// ==========================================
app.get('/items/report', ensureAuthenticated, (req, res) => {
  const selectedType = req.query.type || 'lost';
  res.render('pages/items/report', {
    title: 'Report Item',
    selectedType
  });
});

// ==========================================
// Routes: Item Details
// ==========================================
app.get('/items/:id', async (req, res) => {
  try {
    const item = await dbService.getItemById(req.params.id);

    if (!item) {
      return res.status(404).render('pages/errors/404', { title: 'Item Not Found' });
    }

    // Duplicate match detection simulation
    const itemsList = (await dbService.getItems({ limit: 20 })).items;
    const potentialMatch = itemsList.find(other =>
      (other.id !== item.id && other._id !== item._id) &&
      other.type !== item.type &&
      (other.category === item.category || other.title.toLowerCase().includes(item.title.toLowerCase().split(' ')[0]))
    );

    res.render('pages/items/show', {
      title: item.title,
      item,
      potentialMatch
    });
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

// Create Item Submission with Image Upload to Supabase Storage
app.post('/items', ensureAuthenticated, upload.single('itemImage'), validateItemReport, async (req, res) => {
  const { title, type, category, location, spotDetails, dateLostOrFound, description } = req.body;

  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadItemImage(req.file);
    } else {
      imageUrl = type === 'lost' 
        ? 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80';
    }

    const newItem = await dbService.createItem({
      title,
      type,
      category,
      location: spotDetails ? `${location} (${spotDetails})` : location,
      dateLostOrFound: dateLostOrFound ? new Date(dateLostOrFound) : new Date(),
      description,
      imageUrl,
      reportedBy: req.session.user,
      status: 'open'
    });

    const currentUserId = req.session.user.id || req.session.user._id;
    await dbService.createNotification({
      userId: currentUserId,
      type: 'item_status',
      message: `Your report for "${newItem.title}" has been successfully logged into the campus system.`
    });

    req.flash('success_msg', 'Item report registered successfully!');
    res.redirect(`/items/${newItem.id || newItem._id}`);
  } catch (err) {
    console.error('Error creating item:', err);
    req.flash('error_msg', err.message || 'Failed to register item.');
    res.redirect('/items/report');
  }
});

// ==========================================
// Routes: Claims Submission (Protected + Validated)
// ==========================================
app.post('/claims', ensureAuthenticated, validateClaim, async (req, res) => {
  const { itemId, proofDescription, message } = req.body;

  try {
    const targetItem = await dbService.getItemById(itemId);

    if (targetItem) {
      const reporterId = targetItem.reportedBy ? (targetItem.reportedBy.id || targetItem.reportedBy._id) : null;
      const currentUserId = req.session.user.id || req.session.user._id;

      if (reporterId && reporterId === currentUserId) {
        req.flash('error_msg', 'You cannot submit an ownership claim on an item you reported yourself.');
        return res.redirect(`/items/${itemId}`);
      }

      await dbService.createClaim({
        itemId,
        claimedBy: req.session.user,
        proofDescription,
        message: message || ''
      });

      await dbService.createNotification({
        userId: currentUserId,
        type: 'claim_status',
        message: `Your ownership claim for "${targetItem.title}" was submitted to campus security for review.`
      });
    }

    req.flash('success_msg', 'Your ownership claim was submitted for verification!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error creating claim:', err);
    req.flash('error_msg', 'Failed to submit claim. Please try again.');
    res.redirect(`/items/${itemId}`);
  }
});

// ==========================================
// Routes: User Dashboard (Protected)
// ==========================================
app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const allItems = (await dbService.getItems({ limit: 100 })).items;
    const myReports = allItems.filter(i => i.reportedBy && (i.reportedBy.id === userId || i.reportedBy._id === userId));
    const myClaims = await dbService.getClaims({ claimedBy: userId });

    res.render('pages/dashboard/index', {
      title: 'My Dashboard',
      myReports,
      myClaims
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

// ==========================================
// Routes: Admin Portal (Admin Protected)
// ==========================================
app.get('/admin', ensureAdmin, async (req, res) => {
  try {
    const [adminStats, itemsRes, claims, profiles] = await Promise.all([
      dbService.getStats(),
      dbService.getItems({ limit: 100 }),
      dbService.getClaims(),
      dbService.getAllProfiles()
    ]);

    res.render('pages/admin/index', {
      title: 'Admin Moderation',
      adminStats,
      items: itemsRes.items,
      claims,
      users: profiles
    });
  } catch (err) {
    console.error('Admin portal error:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

// Admin Approve Claim (Admin Protected)
app.post('/admin/claims/:id/approve', ensureAdmin, async (req, res) => {
  try {
    const updatedClaim = await dbService.updateClaimStatus(req.params.id, 'approved');
    if (updatedClaim && updatedClaim.claimedBy) {
      const claimantId = updatedClaim.claimedBy.id || updatedClaim.claimedBy._id || updatedClaim.claimedBy;
      await dbService.createNotification({
        userId: claimantId,
        type: 'claim_status',
        message: `Great news! Your ownership claim was approved. Collect your item at Student Center Room 102.`
      });
    }
    req.flash('success_msg', 'Claim approved successfully.');
  } catch (err) {
    console.error('Error approving claim:', err);
    req.flash('error_msg', 'Failed to approve claim.');
  }
  res.redirect('/admin');
});

// Admin Reject Claim (Admin Protected)
app.post('/admin/claims/:id/reject', ensureAdmin, async (req, res) => {
  try {
    const updatedClaim = await dbService.updateClaimStatus(req.params.id, 'rejected');
    if (updatedClaim && updatedClaim.claimedBy) {
      const claimantId = updatedClaim.claimedBy.id || updatedClaim.claimedBy._id || updatedClaim.claimedBy;
      await dbService.createNotification({
        userId: claimantId,
        type: 'claim_status',
        message: `Your ownership claim was not approved due to insufficient verification proof.`
      });
    }
    req.flash('info_msg', 'Claim marked as rejected.');
  } catch (err) {
    console.error('Error rejecting claim:', err);
    req.flash('error_msg', 'Failed to reject claim.');
  }
  res.redirect('/admin');
});

// Admin Update Item Status (Admin Protected)
app.post('/admin/items/:id/status', ensureAdmin, async (req, res) => {
  try {
    await dbService.updateItemStatus(req.params.id, req.body.status);
    req.flash('success_msg', 'Item status updated successfully.');
  } catch (err) {
    console.error('Error updating status:', err);
    req.flash('error_msg', 'Failed to update item status.');
  }
  res.redirect('/admin');
});

// ==========================================
// Routes: Notifications (Protected)
// ==========================================
app.get('/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const notifications = await dbService.getNotifications(userId);
    res.render('pages/notifications/index', {
      title: 'Notifications',
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

app.post('/notifications/mark-read', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    await dbService.markNotificationsRead(userId);
    req.flash('success_msg', 'All notifications marked as read.');
  } catch (err) {
    console.error('Error marking notifications:', err);
  }
  res.redirect('/notifications');
});

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
