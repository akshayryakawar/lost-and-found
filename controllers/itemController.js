/**
 * Item Controller - Lost & Found Listings and Reports
 */

const dbService = require('../services/dbService');
const { uploadItemImage } = require('../services/storageService');

/**
 * Browse Items Directory with Search & Filters
 */
exports.getItems = async (req, res) => {
  const { search, type, category, location, status, page } = req.query;
  const currentPage = parseInt(page, 10) || 1;
  const filters = { search, type, category, location, status };
  const buildPageUrl = (pageNumber) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set('page', pageNumber);
    return `/items?${params.toString()}`;
  };

  try {
    const result = await dbService.getItems({
      search,
      type,
      category,
      location,
      status,
      page: currentPage,
      limit: 6
    });

    res.render('pages/items/index', {
      title: 'Browse Items',
      items: result.items,
      currentFilters: filters,
      buildPageUrl,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems
      }
    });
  } catch (err) {
    console.error('Error on items directory:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
};

/**
 * Render Report Item Form
 */
exports.getReportForm = (req, res) => {
  const selectedType = req.query.type || 'lost';
  res.render('pages/items/report', {
    title: 'Report Item',
    selectedType
  });
};

/**
 * Handle Item Report Submission
 */
exports.postReportItem = async (req, res) => {
  const { title, type, category, location, spotDetails, dateLostOrFound, description } = req.body;

  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = await uploadItemImage(req.file);
    }

    const newItem = await dbService.createItem({
      title,
      type,
      category,
      location: spotDetails ? `${location} (${spotDetails})` : location,
      dateLostOrFound: dateLostOrFound ? new Date(dateLostOrFound) : new Date(),
      description,
      imageUrl,
      reportedBy: req.session.user,
      status: 'open'
    });

    const currentUserId = req.session.user.id || req.session.user._id;
    await dbService.createNotification({
      userId: currentUserId,
      type: 'item_status',
      message: `Your report for "${newItem.title}" has been successfully logged into the campus system.`
    });

    req.flash('success_msg', 'Item report registered successfully!');
    res.redirect(`/items/${newItem.id}`);
  } catch (err) {
    console.error('Error creating item:', err);
    req.flash('error_msg', err.message || 'Failed to register item.');
    res.redirect('/items/report');
  }
};

/**
 * View Single Item Details with Cross-Reference Matching
 */
exports.getItemDetails = async (req, res) => {
  try {
    const item = await dbService.getItemById(req.params.id);

    if (!item) {
      return res.status(404).render('pages/errors/404', { title: 'Item Not Found' });
    }

    // Proper potential match cross-referencing: opposite type, same category, and title keyword overlap
    const itemsList = (await dbService.getItems({ limit: 100 })).items;
    const titleWords = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const potentialMatch = itemsList.find(other => {
      const isDifferent = other.id !== item.id;
      if (!isDifferent) return false;
      const isOppositeType = other.type !== item.type;
      const isSameCategory = other.category === item.category;
      const otherTitle = (other.title || '').toLowerCase();
      const hasKeywordOverlap = titleWords.some(w => otherTitle.includes(w));
      return isOppositeType && isSameCategory && hasKeywordOverlap;
    });

    res.render('pages/items/show', {
      title: item.title,
      item,
      potentialMatch
    });
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
};

/**
 * Render Edit Item Form (Owner only, open only)
 */
exports.getEditForm = async (req, res) => {
  try {
    const item = await dbService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).render('pages/errors/404', { title: 'Item Not Found' });
    }
    const currentUserId = req.session.user.id || req.session.user._id;
    const isOwner = item.reportedBy && (item.reportedBy.id === currentUserId || item.reportedBy._id === currentUserId);
    if (!isOwner || item.status !== 'open') {
      req.flash('error_msg', 'You can only edit your own open reports.');
      return res.redirect(`/items/${req.params.id}`);
    }
    res.render('pages/items/edit', {
      title: 'Edit Report',
      item
    });
  } catch (err) {
    console.error('Error fetching edit report:', err);
    res.status(500).render('pages/errors/500', { title: 'Server Error' });
  }
};

/**
 * Handle Item Edit Submission (Owner only, open only)
 */
exports.postEditItem = async (req, res) => {
  try {
    const item = await dbService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).render('pages/errors/404', { title: 'Item Not Found' });
    }
    const currentUserId = req.session.user.id || req.session.user._id;
    const isOwner = item.reportedBy && (item.reportedBy.id === currentUserId || item.reportedBy._id === currentUserId);
    if (!isOwner || item.status !== 'open') {
      req.flash('error_msg', 'You can only edit your own open reports.');
      return res.redirect(`/items/${req.params.id}`);
    }
    const { title, category, location, description, dateLostOrFound } = req.body;
    await dbService.updateItem(req.params.id, {
      title,
      category,
      location,
      description,
      dateLostOrFound: dateLostOrFound ? new Date(dateLostOrFound) : item.dateLostOrFound
    });
    req.flash('success_msg', 'Report updated successfully.');
    res.redirect(`/items/${req.params.id}`);
  } catch (err) {
    console.error('Error updating report:', err);
    req.flash('error_msg', err.message || 'Failed to update report.');
    res.redirect(`/items/${req.params.id}`);
  }
};

/**
 * Handle Item Deletion (Owner while open, or Admin)
 */
exports.postDeleteItem = async (req, res) => {
  try {
    const item = await dbService.getItemById(req.params.id);
    if (!item) {
      return res.status(404).render('pages/errors/404', { title: 'Item Not Found' });
    }
    const currentUserId = req.session.user.id || req.session.user._id;
    const isOwner = item.reportedBy && (item.reportedBy.id === currentUserId || item.reportedBy._id === currentUserId);
    const isAdmin = req.session.user.role === 'admin';
    if (!isAdmin && (!isOwner || item.status !== 'open')) {
      req.flash('error_msg', 'You can only delete your own open reports.');
      return res.redirect(`/items/${req.params.id}`);
    }
    await dbService.deleteItem(req.params.id);
    req.flash('success_msg', 'Report deleted successfully.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error deleting report:', err);
    req.flash('error_msg', err.message || 'Failed to delete report.');
    res.redirect(`/items/${req.params.id}`);
  }
};

/**
 * Live Similar Items Search API
 */
exports.getSimilarItems = async (req, res) => {
  try {
    const { title = '', category = '', location = '' } = req.query;
    if (!title || title.trim().length < 3) {
      return res.json({ matches: [] });
    }

    const allItems = (await dbService.getItems({ limit: 50 })).items;
    const titleWords = title.trim().toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const matches = allItems.filter(item => {
      const itemTitle = (item.title || '').toLowerCase();
      const wordOverlap = titleWords.some(w => itemTitle.includes(w));
      const catMatch = category && item.category === category;
      return wordOverlap || catMatch;
    }).slice(0, 3).map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      category: item.category,
      location: item.location
    }));

    res.json({ matches });
  } catch (err) {
    res.json({ matches: [] });
  }
};
