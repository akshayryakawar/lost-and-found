/**
 * Claims Router
 */

const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { ensureAuthenticated } = require('../middleware/auth');
const { validateClaim } = require('../middleware/validation');

router.post('/', ensureAuthenticated, validateClaim, claimController.postCreateClaim);

module.exports = router;
