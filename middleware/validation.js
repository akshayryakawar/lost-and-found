/**
 * Input Validation and Sanitization Middleware
 */

const ALLOWED_CATEGORIES = [
  'electronics',
  'id_cards',
  'keys_wallets',
  'bags_backpacks',
  'books_notes',
  'clothing',
  'accessories',
  'sports',
  'other'
];

/**
 * Validate User Registration Payload
 */
function validateRegister(req, res, next) {
  const { name, email, password, confirmPassword } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('Please enter a valid campus email address.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  if (password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  if (errors.length > 0) {
    req.flash('error_msg', errors.join(' '));
    return res.redirect('/auth/register');
  }

  // Clean inputs
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();

  next();
}

/**
 * Validate User Login Payload
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error_msg', 'Please provide both email and password.');
    return res.redirect('/auth/login');
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

/**
 * Validate Item Report Payload
 */
function validateItemReport(req, res, next) {
  const { title, type, category, location, description } = req.body;
  const errors = [];

  if (!title || title.trim().length < 3) {
    errors.push('Item title must be at least 3 characters.');
  }

  if (!type || !['lost', 'found'].includes(type)) {
    errors.push('Type must be either "lost" or "found".');
  }

  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    errors.push('Please select a valid category.');
  }

  if (!location || location.trim().length < 2) {
    errors.push('Campus location is required.');
  }

  if (!description || description.trim().length < 5) {
    errors.push('Please provide a descriptive explanation (at least 5 characters).');
  }

  if (errors.length > 0) {
    req.flash('error_msg', errors.join(' '));
    return res.redirect(req.header('Referer') || '/items/report');
  }

  next();
}

/**
 * Validate Claim Payload
 */
function validateClaim(req, res, next) {
  const { itemId, proofDescription } = req.body;
  const errors = [];

  if (!itemId) {
    errors.push('Item reference ID is missing.');
  }

  if (!proofDescription || proofDescription.trim().length < 10) {
    errors.push('Proof of ownership description must be at least 10 characters.');
  }

  if (errors.length > 0) {
    req.flash('error_msg', errors.join(' '));
    return res.redirect(req.header('Referer') || '/items');
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateItemReport,
  validateClaim
};
