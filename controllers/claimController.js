/**
 * Claim Controller - Ownership Claim Submission & Processing
 */

const dbService = require('../services/dbService');

/**
 * Handle Ownership Claim Submission
 */
exports.postCreateClaim = async (req, res) => {
  const { itemId, proofDescription, message } = req.body;

  try {
    const targetItem = await dbService.getItemById(itemId);

    if (!targetItem) {
      req.flash('error_msg', 'Item not found.');
      return res.redirect('/items');
    }

    if (targetItem.status === 'claimed' || targetItem.status === 'returned') {
      req.flash('error_msg', 'This item is no longer available for claims.');
      return res.redirect(`/items/${itemId}`);
    }

    const reporterId = targetItem.reportedBy ? (targetItem.reportedBy.id || targetItem.reportedBy._id) : null;
    const currentUserId = req.session.user.id || req.session.user._id;

    if (reporterId && reporterId === currentUserId) {
      req.flash('error_msg', 'You cannot submit an ownership claim on an item you reported yourself.');
      return res.redirect(`/items/${itemId}`);
    }

    const existingClaims = await dbService.getClaims({ itemId, claimedBy: currentUserId });
    if (existingClaims && existingClaims.length > 0) {
      req.flash('error_msg', 'You have already submitted a claim for this item.');
      return res.redirect(`/items/${itemId}`);
    }

    await dbService.createClaim({
      itemId,
      claimedBy: req.session.user,
      proofDescription,
      message: message || ''
    });

    await dbService.createNotification({
      userId: currentUserId,
      type: 'claim_status',
      message: `Your ownership claim for "${targetItem.title}" was submitted to campus security for review.`
    });

    req.flash('success_msg', 'Your ownership claim was submitted for verification!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error creating claim:', err);
    req.flash('error_msg', err.message || 'Failed to submit claim. Please try again.');
    res.redirect(`/items/${itemId}`);
  }
};
