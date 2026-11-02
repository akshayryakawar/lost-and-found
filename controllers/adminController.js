/**
 * Admin Controller - Moderation, Verification, and User Management
 */

const dbService = require('../services/dbService');
const { sendClaimStatusEmail } = require('../services/emailService');

const COLLECTION_LOCATION = process.env.COLLECTION_LOCATION || 'Student Center Security Desk, Room 102';

/**
 * Render Admin Console
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const [adminStats, itemsRes, claims, profiles] = await Promise.all([
      dbService.getStats(),
      dbService.getItems({ limit: 100 }),
      dbService.getClaims(),
      dbService.getAllProfiles()
    ]);

    res.render('pages/admin/index', {
      title: 'Admin Moderation',
      adminStats,
      items: itemsRes.items,
      claims,
      users: profiles
    });
  } catch (err) {
    console.error('Admin portal error:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
};

/**
 * Approve Ownership Claim
 */
exports.postApproveClaim = async (req, res) => {
  try {
    const updatedClaim = await dbService.updateClaimStatus(req.params.id, 'approved');
    if (updatedClaim && updatedClaim.claimedBy) {
      const claimantId = updatedClaim.claimedBy.id || updatedClaim.claimedBy._id || updatedClaim.claimedBy;
      await dbService.createNotification({
        userId: claimantId,
        type: 'claim_status',
        message: `Great news! Your ownership claim was approved. Collect your item at ${COLLECTION_LOCATION}.`
      });

      if (updatedClaim.claimedBy.email) {
        sendClaimStatusEmail({
          to: updatedClaim.claimedBy.email,
          name: updatedClaim.claimedBy.name,
          itemTitle: (updatedClaim.item && updatedClaim.item.title) || 'Reported Belonging',
          status: 'approved',
          collectionLocation: COLLECTION_LOCATION
        }).catch(() => {});
      }
    }
    req.flash('success_msg', 'Claim approved successfully.');
  } catch (err) {
    console.error('Error approving claim:', err);
    req.flash('error_msg', 'Failed to approve claim.');
  }
  res.redirect('/admin');
};

/**
 * Reject Ownership Claim
 */
exports.postRejectClaim = async (req, res) => {
  try {
    const updatedClaim = await dbService.updateClaimStatus(req.params.id, 'rejected');
    if (updatedClaim && updatedClaim.claimedBy) {
      const claimantId = updatedClaim.claimedBy.id || updatedClaim.claimedBy._id || updatedClaim.claimedBy;
      await dbService.createNotification({
        userId: claimantId,
        type: 'claim_status',
        message: `Your ownership claim was not approved due to insufficient verification proof.`
      });

      if (updatedClaim.claimedBy.email) {
        sendClaimStatusEmail({
          to: updatedClaim.claimedBy.email,
          name: updatedClaim.claimedBy.name,
          itemTitle: (updatedClaim.item && updatedClaim.item.title) || 'Reported Belonging',
          status: 'rejected',
          collectionLocation: COLLECTION_LOCATION
        }).catch(() => {});
      }
    }
    req.flash('info_msg', 'Claim marked as rejected.');
  } catch (err) {
    console.error('Error rejecting claim:', err);
    req.flash('error_msg', 'Failed to reject claim.');
  }
  res.redirect('/admin');
};

/**
 * Update Item Status
 */
exports.postUpdateItemStatus = async (req, res) => {
  try {
    await dbService.updateItemStatus(req.params.id, req.body.status);
    req.flash('success_msg', 'Item status updated successfully.');
  } catch (err) {
    console.error('Error updating status:', err);
    req.flash('error_msg', 'Failed to update item status.');
  }
  res.redirect('/admin');
};

/**
 * Delete Item (Admin Action)
 */
exports.postDeleteItem = async (req, res) => {
  try {
    await dbService.deleteItem(req.params.id);
    req.flash('success_msg', 'Item deleted successfully.');
  } catch (err) {
    console.error('Error deleting item:', err);
    req.flash('error_msg', 'Failed to delete item.');
  }
  res.redirect('/admin');
};

/**
 * Promote or Demote User Role
 */
exports.postUpdateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    await dbService.updateUserRole(req.params.id, role);
    req.flash('success_msg', 'User role updated successfully.');
  } catch (err) {
    console.error('Error updating user role:', err);
    req.flash('error_msg', err.message || 'Failed to update user role.');
  }
  res.redirect('/admin');
};
