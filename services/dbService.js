/**
 * Database Service Layer - Supabase PostgreSQL Implementation
 * Uses `profiles` for user data and `auth_credentials` for password security.
 */

const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { sampleUsers, sampleItems, sampleClaims, sampleNotifications } = require('../config/sampleData');

const toPublicUser = ({ passwordHash, ...user }) => user;

// In-Memory state for local fallback mode
let memoryProfiles = sampleUsers.map(toPublicUser);
let memoryAuth = sampleUsers.map(u => ({
  user_id: u._id,
  email: u.email,
  password_hash: u.passwordHash
}));
let memoryItems = sampleItems.map(item => ({
  ...item,
  reportedBy: item.reportedBy ? toPublicUser(item.reportedBy) : null
}));
let memoryClaims = sampleClaims.map(claim => ({
  ...claim,
  claimedBy: claim.claimedBy ? toPublicUser(claim.claimedBy) : null,
  item: claim.item ? {
    ...claim.item,
    reportedBy: claim.item.reportedBy ? toPublicUser(claim.item.reportedBy) : null
  } : null
}));
let memoryNotifications = [...sampleNotifications];

const dbService = {
  // ==========================================
  // Authentication & Profile Operations
  // ==========================================

  /**
   * Find profile with auth credentials by email (for login verification)
   */
  async findUserWithCredentials(email) {
    const normalized = (email || '').trim().toLowerCase();

    if (isSupabaseConfigured()) {
      try {
        // Query credentials joined with profile
        const { data: creds, error } = await supabase
          .from('auth_credentials')
          .select(`
            password_hash,
            profiles:user_id (id, name, email, role, created_at)
          `)
          .eq('email', normalized)
          .maybeSingle();

        if (error) {
          console.warn('[Supabase Auth Query Notice]', error.message);
        } else if (creds && creds.profiles) {
          return {
            id: creds.profiles.id,
            _id: creds.profiles.id,
            name: creds.profiles.name,
            email: creds.profiles.email,
            role: creds.profiles.role,
            passwordHash: creds.password_hash,
            createdAt: creds.profiles.created_at
          };
        }
      } catch (err) {
        console.warn('[Supabase Auth Query Error]', err.message);
      }
    }

    // In-Memory Fallback
    const user = memoryProfiles.find(u => u.email.toLowerCase() === normalized);
    const auth = memoryAuth.find(a => a.email.toLowerCase() === normalized);

    if (user) {
      return {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: auth ? auth.password_hash : null,
        createdAt: user.createdAt
      };
    }
    return null;
  },

  /**
   * Register a new user: creates profile and stores password hash in auth_credentials
   */
  async createUser({ name, email, passwordHash, role = 'student' }) {
    const normalized = email.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      try {
        // 1. Create Profile record (NO password in profiles table)
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .insert({
            name: name.trim(),
            email: normalized,
            role
          })
          .select()
          .single();

        if (profileErr) throw new Error(profileErr.message);

        // 2. Create Auth Credentials record linked by user_id
        const { error: authErr } = await supabase
          .from('auth_credentials')
          .insert({
            user_id: profile.id,
            email: normalized,
            password_hash: passwordHash
          });

        if (authErr) {
          // Rollback profile if auth creation fails
          await supabase.from('profiles').delete().eq('id', profile.id);
          throw new Error(authErr.message);
        }

        return {
          id: profile.id,
          _id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          createdAt: profile.created_at
        };
      } catch (err) {
        console.warn('[Supabase createUser fallback]', err.message);
      }
    }

    // Fallback mode
    const newId = 'usr_' + Date.now().toString().slice(-4);
    const newProfile = {
      id: newId,
      _id: newId,
      name: name.trim(),
      email: normalized,
      role,
      createdAt: new Date()
    };
    memoryProfiles.push(newProfile);
    memoryAuth.push({
      user_id: newId,
      email: normalized,
      password_hash: passwordHash
    });
    return newProfile;
  },

  /**
   * Get all registered profiles
   */
  async getAllProfiles() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(p => ({
          id: p.id,
          _id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          createdAt: p.created_at
        }));
      }
    }
    return memoryProfiles;
  },

  // ==========================================
  // Item Operations
  // ==========================================
  async getItems({ search, type, category, location, status, page = 1, limit = 6 } = {}) {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('items')
          .select(`
            id, title, description, type, category, location, date_lost_or_found, image_url, status, created_at,
            profiles:reported_by (id, name, email, role)
          `, { count: 'exact' });

        if (type) query = query.eq('type', type);
        if (category) query = query.eq('category', category);
        if (status) query = query.eq('status', status);
        if (location) query = query.ilike('location', `%${location}%`);
        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        if (!error && data) {
          const formattedItems = data.map(item => ({
            id: item.id,
            _id: item.id,
            title: item.title,
            description: item.description,
            type: item.type,
            category: item.category,
            location: item.location,
            dateLostOrFound: item.date_lost_or_found,
            imageUrl: item.image_url,
            status: item.status,
            reportedBy: item.profiles ? {
              id: item.profiles.id,
              _id: item.profiles.id,
              name: item.profiles.name,
              email: item.profiles.email,
              role: item.profiles.role
            } : null,
            createdAt: item.created_at
          }));

          return {
            items: formattedItems,
            totalItems: count || formattedItems.length,
            totalPages: Math.ceil((count || formattedItems.length) / limit) || 1,
            currentPage: page
          };
        }
      } catch (err) {
        console.warn('[Supabase getItems fallback]', err.message);
      }
    }

    // Fallback logic
    let filtered = [...memoryItems];
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
      );
    }
    if (type) filtered = filtered.filter(i => i.type === type);
    if (category) filtered = filtered.filter(i => i.category === category);
    if (status) filtered = filtered.filter(i => i.status === status);
    if (location) filtered = filtered.filter(i => i.location.toLowerCase().includes(location.toLowerCase()));

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      totalItems,
      totalPages,
      currentPage: page
    };
  },

  async getItemById(id) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select(`
            id, title, description, type, category, location, date_lost_or_found, image_url, status, created_at,
            profiles:reported_by (id, name, email, role)
          `)
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            _id: data.id,
            title: data.title,
            description: data.description,
            type: data.type,
            category: data.category,
            location: data.location,
            dateLostOrFound: data.date_lost_or_found,
            imageUrl: data.image_url,
            status: data.status,
            reportedBy: data.profiles ? {
              id: data.profiles.id,
              _id: data.profiles.id,
              name: data.profiles.name,
              email: data.profiles.email,
              role: data.profiles.role
            } : null,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('[Supabase getItemById fallback]', err.message);
      }
    }

    return memoryItems.find(i => i._id === id || i.id === id) || null;
  },

  async createItem(itemData) {
    if (isSupabaseConfigured()) {
      try {
        const reporterId = itemData.reportedBy ? (itemData.reportedBy.id || itemData.reportedBy._id) : null;

        const { data, error } = await supabase
          .from('items')
          .insert({
            title: itemData.title,
            description: itemData.description,
            type: itemData.type,
            category: itemData.category,
            location: itemData.location,
            date_lost_or_found: itemData.dateLostOrFound || new Date(),
            image_url: itemData.imageUrl || null,
            reported_by: reporterId,
            status: itemData.status || 'open'
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            _id: data.id,
            title: data.title,
            description: data.description,
            type: data.type,
            category: data.category,
            location: data.location,
            dateLostOrFound: data.date_lost_or_found,
            imageUrl: data.image_url,
            status: data.status,
            reportedBy: itemData.reportedBy,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('[Supabase createItem fallback]', err.message);
      }
    }

    const newItem = {
      id: 'item_' + Date.now().toString().slice(-4),
      _id: 'item_' + Date.now().toString().slice(-4),
      ...itemData,
      status: itemData.status || 'open',
      createdAt: new Date()
    };
    memoryItems.unshift(newItem);
    return newItem;
  },

  async updateItemStatus(id, newStatus) {
    if (isSupabaseConfigured()) {
      await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', id);
    }

    const item = memoryItems.find(i => i._id === id || i.id === id);
    if (item) item.status = newStatus;
    return item;
  },

  // ==========================================
  // Claim Operations
  // ==========================================
  async getClaims({ itemId, claimedBy, status } = {}) {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('claims')
          .select(`
            id, item_id, message, proof_description, status, created_at,
            items:item_id (id, title, type, category, location, status),
            profiles:claimed_by (id, name, email, role)
          `);

        if (itemId) query = query.eq('item_id', itemId);
        if (claimedBy) query = query.eq('claimed_by', claimedBy);
        if (status) query = query.eq('status', status);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(c => ({
            id: c.id,
            _id: c.id,
            itemId: c.item_id,
            item: c.items ? {
              id: c.items.id,
              _id: c.items.id,
              title: c.items.title,
              type: c.items.type,
              category: c.items.category,
              location: c.items.location,
              status: c.items.status
            } : null,
            claimedBy: c.profiles ? {
              id: c.profiles.id,
              _id: c.profiles.id,
              name: c.profiles.name,
              email: c.profiles.email,
              role: c.profiles.role
            } : null,
            message: c.message,
            proofDescription: c.proof_description,
            status: c.status,
            createdAt: c.created_at
          }));
        }
      } catch (err) {
        console.warn('[Supabase getClaims fallback]', err.message);
      }
    }

    let claims = [...memoryClaims];
    if (itemId) claims = claims.filter(c => c.itemId === itemId);
    if (claimedBy) claims = claims.filter(c => c.claimedBy && (c.claimedBy._id === claimedBy || c.claimedBy.id === claimedBy));
    if (status) claims = claims.filter(c => c.status === status);
    return claims;
  },

  async createClaim({ itemId, claimedBy, message, proofDescription }) {
    if (isSupabaseConfigured()) {
      try {
        const claimantId = claimedBy.id || claimedBy._id || claimedBy;
        const { data, error } = await supabase
          .from('claims')
          .insert({
            item_id: itemId,
            claimed_by: claimantId,
            message: message || '',
            proof_description: proofDescription,
            status: 'pending'
          })
          .select()
          .single();

        if (!error && data) {
          await supabase.from('items').update({ status: 'under_review' }).eq('id', itemId);

          return {
            id: data.id,
            _id: data.id,
            itemId: data.item_id,
            claimedBy,
            message: data.message,
            proofDescription: data.proof_description,
            status: data.status,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.warn('[Supabase createClaim fallback]', err.message);
      }
    }

    const targetItem = memoryItems.find(i => i._id === itemId || i.id === itemId);
    if (targetItem) targetItem.status = 'under_review';

    const newClaim = {
      id: 'clm_' + Date.now().toString().slice(-4),
      _id: 'clm_' + Date.now().toString().slice(-4),
      itemId,
      item: targetItem,
      claimedBy,
      message,
      proofDescription,
      status: 'pending',
      createdAt: new Date()
    };
    memoryClaims.unshift(newClaim);
    return newClaim;
  },

  async updateClaimStatus(claimId, newStatus) {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('claims')
          .update({ status: newStatus })
          .eq('id', claimId)
          .select()
          .single();

        if (data && newStatus === 'approved') {
          await supabase.from('items').update({ status: 'claimed' }).eq('id', data.item_id);
        }
      } catch (err) {
        console.warn('[Supabase updateClaimStatus fallback]', err.message);
      }
    }

    const claim = memoryClaims.find(c => c._id === claimId || c.id === claimId);
    if (claim) {
      claim.status = newStatus;
      if (newStatus === 'approved') {
        const item = memoryItems.find(i => i._id === claim.itemId || i.id === claim.itemId);
        if (item) item.status = 'claimed';
      }
    }
    return claim;
  },

  // ==========================================
  // Notification Operations
  // ==========================================
  async getNotifications(userId) {
    if (isSupabaseConfigured() && userId) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(n => ({
            id: n.id,
            _id: n.id,
            userId: n.user_id,
            message: n.message,
            type: n.type,
            isRead: n.is_read,
            createdAt: n.created_at
          }));
        }
      } catch (err) {
        console.warn('[Supabase getNotifications fallback]', err.message);
      }
    }

    return memoryNotifications;
  },

  async createNotification({ userId, message, type = 'system' }) {
    if (isSupabaseConfigured() && userId) {
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          message,
          type,
          is_read: false
        });
      } catch (err) {
        console.warn('[Supabase createNotification fallback]', err.message);
      }
    }

    const notif = {
      id: 'notif_' + Date.now().toString().slice(-4),
      _id: 'notif_' + Date.now().toString().slice(-4),
      userId,
      message,
      type,
      isRead: false,
      createdAt: new Date()
    };
    memoryNotifications.unshift(notif);
    return notif;
  },

  async markNotificationsRead(userId) {
    if (isSupabaseConfigured() && userId) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId);
      } catch (err) {
        console.warn('[Supabase markNotificationsRead fallback]', err.message);
      }
    }

    memoryNotifications.forEach(n => { n.isRead = true; });
  },

  // ==========================================
  // Statistics
  // ==========================================
  async getStats() {
    if (isSupabaseConfigured()) {
      try {
        const [itemsRes, claimsRes] = await Promise.all([
          supabase.from('items').select('id, type, status'),
          supabase.from('claims').select('id, status')
        ]);

        if (itemsRes.data && claimsRes.data) {
          const allItems = itemsRes.data;
          const allClaims = claimsRes.data;

          return {
            totalItems: allItems.length,
            returnedItems: allItems.filter(i => i.status === 'returned').length,
            activeClaims: allClaims.filter(c => c.status === 'pending').length,
            lostCount: allItems.filter(i => i.type === 'lost' && i.status !== 'returned').length,
            foundCount: allItems.filter(i => i.type === 'found' && i.status !== 'returned').length,
            openLost: allItems.filter(i => i.type === 'lost' && i.status === 'open').length,
            pendingClaims: allClaims.filter(c => c.status === 'pending').length
          };
        }
      } catch (err) {
        console.warn('[Supabase getStats fallback]', err.message);
      }
    }

    return {
      totalItems: memoryItems.length,
      returnedItems: memoryItems.filter(i => i.status === 'returned').length,
      activeClaims: memoryClaims.filter(c => c.status === 'pending').length,
      lostCount: memoryItems.filter(i => i.type === 'lost' && i.status !== 'returned').length,
      foundCount: memoryItems.filter(i => i.type === 'found' && i.status !== 'returned').length,
      openLost: memoryItems.filter(i => i.type === 'lost' && i.status === 'open').length,
      pendingClaims: memoryClaims.filter(c => c.status === 'pending').length
    };
  }
};

module.exports = dbService;
