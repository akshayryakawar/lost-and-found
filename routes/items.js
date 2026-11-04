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

// Multer error handler for the report route
function handleUpload(req, res, next) {
  upload.single('itemImage')(req, res, (err) => {
    if (err) {
      let message = 'Image upload failed.';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'Uploaded image exceeds the 5MB file size limit.';
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Unexpected file field. Please use the designated image upload area.';
      }
      req.flash('error_msg', message);
      return req.session.save(() => res.redirect('/items/report'));
    }
    next();
  });
}

// Item listings and search
router.get('/', itemController.getItems);
router.get('/report', ensureAuthenticated, itemController.getReportForm);
router.post('/', ensureAuthenticated, handleUpload, validateItemReport, itemController.postReportItem);

// Item details, editing, and deletion
router.get('/:id', itemController.getItemDetails);
router.get('/:id/edit', ensureAuthenticated, itemController.getEditForm);
router.post('/:id/edit', ensureAuthenticated, validateItemReport, itemController.postEditItem);
router.post('/:id/delete', ensureAuthenticated, itemController.postDeleteItem);

module.exports = router;
