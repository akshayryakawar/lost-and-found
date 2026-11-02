/**
 * Authentication Controller - Supabase PostgreSQL & Express Session
 */

const bcrypt = require('bcryptjs');
const dbService = require('../services/dbService');
const { sendPasswordResetEmail } = require('../services/emailService');

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

/**
 * Render Forgot Password Page
 */
exports.getForgotPassword = (req, res) => {
  res.render('pages/auth/forgot-password', {
    title: 'Forgot Password'
  });
};

/**
 * Handle Forgot Password Submission
 */
exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const result = await dbService.createPasswordResetToken(email);
    if (result && result.token) {
      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${result.token}`;
      await sendPasswordResetEmail({
        to: result.user.email,
        name: result.user.name,
        resetUrl
      });
      if (!process.env.SMTP_HOST) {
        req.flash('info_msg', `[Demo Mode] Reset link generated: ${resetUrl}`);
      }
    }
    req.flash('success_msg', 'If an account exists with that email address, password reset instructions have been sent.');
    res.redirect('/auth/forgot-password');
  } catch (err) {
    console.error('Forgot password error:', err);
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * Render Reset Password Page
 */
exports.getResetPassword = (req, res) => {
  const { token } = req.query;
  if (!token) {
    req.flash('error_msg', 'Missing or invalid password reset token.');
    return res.redirect('/auth/forgot-password');
  }
  res.render('pages/auth/reset-password', {
    title: 'Reset Password',
    token
  });
};

/**
 * Handle Reset Password Submission
 */
exports.postResetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token) {
    req.flash('error_msg', 'Missing password reset token.');
    return res.redirect('/auth/forgot-password');
  }
  if (!password || password.length < 8) {
    req.flash('error_msg', 'Password must be at least 8 characters long.');
    return res.redirect(`/auth/reset-password?token=${encodeURIComponent(token)}`);
  }
  if (password !== confirmPassword) {
    req.flash('error_msg', 'Passwords do not match.');
    return res.redirect(`/auth/reset-password?token=${encodeURIComponent(token)}`);
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await dbService.verifyAndConsumePasswordResetToken(token, passwordHash);

    req.flash('success_msg', 'Your password has been successfully reset. You can now sign in with your new credentials.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Password reset error:', err);
    req.flash('error_msg', err.message || 'Failed to reset password.');
    res.redirect('/auth/forgot-password');
  }
};
