/**
 * Notification Controller
 */

const dbService = require('../services/dbService');

/**
 * Get User Notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    const notifications = await dbService.getNotifications(userId);
    res.render('pages/notifications/index', {
      title: 'Notifications',
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
};

/**
 * Mark All Notifications as Read
 */
exports.postMarkNotificationsRead = async (req, res) => {
  try {
    const userId = req.session.user.id || req.session.user._id;
    await dbService.markNotificationsRead(userId);
    req.flash('success_msg', 'All notifications marked as read.');
  } catch (err) {
    console.error('Error marking notifications:', err);
  }
  res.redirect('/notifications');
};
