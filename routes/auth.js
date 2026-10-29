/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureGuest } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

// Login
router.get('/login', ensureGuest, authController.getLogin);
router.post('/login', ensureGuest, validateLogin, authController.postLogin);

// Register
router.get('/register', ensureGuest, authController.getRegister);
router.post('/register', ensureGuest, validateRegister, authController.postRegister);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
