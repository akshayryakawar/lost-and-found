/**
 * Items Router
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const itemController = require('../controllers/itemController');
const { ensureAuthenticated } = require('../middleware/auth');
const { validateItemReport } = require('../middleware/validation');
const { MAX_FILE_SIZE } = require('../services/storageService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// Item listings and search
router.get('/', itemController.getItems);
router.get('/report', ensureAuthenticated, itemController.getReportForm);
router.post('/', ensureAuthenticated, upload.single('itemImage'), validateItemReport, itemController.postReportItem);

// Item details, editing, and deletion
router.get('/:id', itemController.getItemDetails);
router.get('/:id/edit', ensureAuthenticated, itemController.getEditForm);
router.post('/:id/edit', ensureAuthenticated, validateItemReport, itemController.postEditItem);
router.post('/:id/delete', ensureAuthenticated, itemController.postDeleteItem);

module.exports = router;
