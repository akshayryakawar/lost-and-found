/**
 * Admin Router
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAdmin } = require('../middleware/auth');

// All admin routes require admin privileges
router.use(ensureAdmin);

router.get('/', adminController.getAdminDashboard);
router.post('/claims/:id/approve', adminController.postApproveClaim);
router.post('/claims/:id/reject', adminController.postRejectClaim);
router.post('/items/:id/status', adminController.postUpdateItemStatus);
router.post('/items/:id/delete', adminController.postDeleteItem);
router.post('/users/:id/role', adminController.postUpdateUserRole);

module.exports = router;
