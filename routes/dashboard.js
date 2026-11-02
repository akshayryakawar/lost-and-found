/**
 * Dashboard Router
 */

const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const allItems = (await dbService.getItems({ limit: 100 })).items;
    const myReports = allItems.filter(i => i.reportedBy && (i.reportedBy.id === userId || i.reportedBy._id === userId));
    const myClaims = await dbService.getClaims({ claimedBy: userId });

    res.render('pages/dashboard/index', {
      title: 'My Dashboard',
      myReports,
      myClaims
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
});

module.exports = router;
