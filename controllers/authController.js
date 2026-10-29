/**
 * Authentication Controller - Supabase PostgreSQL & Express Session
 */

const bcrypt = require('bcryptjs');
const dbService = require('../services/dbService');

/**
 * Render Login Page
 */
exports.getLogin = (req, res) => {
  res.render('pages/auth/login', {
    title: 'Sign In',
    redirectUrl: req.query.redirect || ''
  });
};

/**
 * Handle Login Form Submission
 */
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const redirectUrl = req.query.redirect ? decodeURIComponent(req.query.redirect) : null;

  try {
    const user = await dbService.findUserWithCredentials(email);

    if (!user) {
      req.flash('error_msg', 'No account found with this email address.');
      return res.redirect(`/auth/login${redirectUrl ? '?redirect=' + encodeURIComponent(redirectUrl) : ''}`);
    }

    // Verify Password with bcrypt
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      req.flash('error_msg', 'Invalid password. Please check your credentials.');
      return res.redirect(`/auth/login${redirectUrl ? '?redirect=' + encodeURIComponent(redirectUrl) : ''}`);
    }

    // Establish secure session with profile details (NO password hash in session)
    req.session.user = {
      id: user.id || user._id,
      _id: user.id || user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', `Welcome back, ${user.name}!`);

    if (redirectUrl) return res.redirect(redirectUrl);
    return res.redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error_msg', 'An unexpected error occurred during login. Please try again.');
    res.redirect('/auth/login');
  }
};

/**
 * Render Register Page
 */
exports.getRegister = (req, res) => {
  res.render('pages/auth/register', {
    title: 'Register Student Account'
  });
};

/**
 * Handle Register Form Submission
 */
exports.postRegister = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await dbService.findUserWithCredentials(email);
    if (existing) {
      req.flash('error_msg', 'An account with that email already exists. Please sign in.');
      return res.redirect('/auth/login');
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user in profiles and auth_credentials
    const newProfile = await dbService.createUser({
      name,
      email,
      passwordHash,
      role: 'student'
    });

    // Auto-login newly registered profile
    req.session.user = {
      id: newProfile.id || newProfile._id,
      _id: newProfile.id || newProfile._id,
      name: newProfile.name,
      email: newProfile.email,
      role: newProfile.role
    };

    req.flash('success_msg', 'Registration successful! Welcome to Campus Lost & Found.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error_msg', 'Failed to register account. Please check your details and try again.');
    res.redirect('/auth/register');
  }
};

/**
 * Handle Sign Out
 */
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('campus_session_id');
    res.redirect('/?info=' + encodeURIComponent('You have been safely signed out.'));
  });
};
