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

// Password Reset
router.get('/forgot-password', ensureGuest, authController.getForgotPassword);
router.post('/forgot-password', ensureGuest, authController.postForgotPassword);
router.get('/reset-password', ensureGuest, authController.getResetPassword);
router.post('/reset-password', ensureGuest, authController.postResetPassword);

// Logout
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

module.exports = router;
