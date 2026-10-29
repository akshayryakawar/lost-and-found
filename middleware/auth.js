/**
 * Authentication & Authorization Middleware
 */

/**
 * Ensure user is logged in
 */
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  const returnUrl = encodeURIComponent(req.originalUrl || '/');
  req.flash('error_msg', 'Please sign in to access this page.');
  return res.redirect(`/auth/login?redirect=${returnUrl}`);
}

/**
 * Ensure logged in user has Administrator role
 */
function ensureAdmin(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return next();
    }
    req.flash('error_msg', 'Access denied: Security Staff/Admin privileges required.');
    return res.status(403).redirect('/dashboard');
  }

  const returnUrl = encodeURIComponent(req.originalUrl || '/admin');
  req.flash('error_msg', 'Admin credentials required.');
  return res.redirect(`/auth/login?redirect=${returnUrl}`);
}

/**
 * Prevent logged-in users from seeing login/register pages
 */
function ensureGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureGuest
};
