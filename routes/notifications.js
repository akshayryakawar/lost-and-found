/**
 * Notifications Router
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.get('/', notificationController.getNotifications);
router.post('/mark-read', notificationController.postMarkNotificationsRead);

module.exports = router;
