/**
 * Database Service Layer - Supabase PostgreSQL Implementation
 * Uses `profiles` for user data and `auth_credentials` for password security.
 */

const { supabase, isSupabaseConfigured } = require('../config/supabase');
const { sampleUsers, sampleItems, sampleClaims, sampleNotifications } = require('../config/sampleData');

let idCounter = 1000;
const generateId = (prefix) => `${prefix}_${Date.now()}_${(++idCounter).toString(36)}`;

// ==========================================
// Shared Data Mappers
// ==========================================

function mapProfile(p) {
  if (!p) return null;
  return {
    id: p.id || p._id,
    name: p.name,
    email: p.email,
    role: p.role,
    createdAt: p.created_at || p.createdAt
  };
}

function mapItem(item) {
  if (!item) return null;
  return {
    id: item.id || item._id,
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category,
    location: item.location,
    dateLostOrFound: item.date_lost_or_found || item.dateLostOrFound,
    imageUrl: item.image_url !== undefined ? item.image_url : item.imageUrl,
    status: item.status,
    reportedBy: item.profiles ? mapProfile(item.profiles) : (item.reportedBy ? mapProfile(item.reportedBy) : null),
    createdAt: item.created_at || item.createdAt
  };
}

function mapClaim(c) {
  if (!c) return null;
  return {
    id: c.id || c._id,
    itemId: c.item_id || c.itemId,
    item: c.items ? mapItem(c.items) : (c.item ? mapItem(c.item) : null),
    claimedBy: c.profiles ? mapProfile(c.profiles) : (c.claimedBy ? mapProfile(c.claimedBy) : null),
    proofDescription: c.proof_description !== undefined ? c.proof_description : c.proofDescription,
    message: c.message || '',
    status: c.status,
    createdAt: c.created_at || c.createdAt
  };
}

function mapNotification(n) {
  if (!n) return null;
  return {
    id: n.id || n._id,
    userId: n.user_id || n.userId,
    type: n.type,
    message: n.message,
    isRead: n.is_read !== undefined ? n.is_read : n.isRead,
    createdAt: n.created_at || n.createdAt
  };
}

// In-Memory state for local fallback mode
let memoryProfiles = sampleUsers.map(u => mapProfile(u));
let memoryAuth = sampleUsers.map(u => ({
  user_id: u.id || u._id,
  email: u.email,
  password_hash: u.passwordHash
}));
let memoryItems = sampleItems.map(item => mapItem(item));
let memoryClaims = sampleClaims.map(claim => mapClaim(claim));
let memoryNotifications = sampleNotifications.map(n => mapNotification(n));

const dbService = {
  // Shared mappers exported for testing/reuse
  mapProfile,
  mapItem,
  mapClaim,
  mapNotification,

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
          const profile = mapProfile(creds.profiles);
          return {
            ...profile,
            passwordHash: creds.password_hash
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
        ...user,
        passwordHash: auth ? auth.password_hash : null
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

      if (profileErr) throw new Error(`Database error creating profile: ${profileErr.message}`);

      // 2. Create Auth Credentials record linked by user_id
      const { error: authErr } = await supabase
        .from('auth_credentials')
        .insert({
          user_id: profile.id,
          email: normalized,
          password_hash: passwordHash
        });

      if (authErr) {
        await supabase.from('profiles').delete().eq('id', profile.id);
        throw new Error(`Database error saving credentials: ${authErr.message}`);
      }

      return mapProfile(profile);
    }

    // Fallback mode
    const newId = generateId('usr');
    const newProfile = {
      id: newId,
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
        return data.map(mapProfile);
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
          const formattedItems = data.map(mapItem);

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
          return mapItem(data);
        }
      } catch (err) {
        console.warn('[Supabase getItemById fallback]', err.message);
      }
    }

    return memoryItems.find(i => i.id === id) || null;
  },

  async createItem(itemData) {
    if (isSupabaseConfigured()) {
      const reporterId = itemData.reportedBy ? (itemData.reportedBy.id || itemData.reportedBy) : null;

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
        .select(`
          id, title, description, type, category, location, date_lost_or_found, image_url, status, created_at,
          profiles:reported_by (id, name, email, role)
        `)
        .single();

      if (error) throw new Error(`Database error: ${error.message}`);
      return mapItem(data);
    }

    // Only reach memory fallback when Supabase is NOT configured
    const newItem = {
      id: generateId('item'),
      ...itemData,
      reportedBy: itemData.reportedBy ? mapProfile(itemData.reportedBy) : null,
      status: itemData.status || 'open',
      createdAt: new Date()
    };
    memoryItems.unshift(newItem);
    return newItem;
  },

  async updateItemStatus(id, newStatus) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw new Error(`Database error updating item status: ${error.message}`);
      return { id, status: newStatus };
    }

    const item = memoryItems.find(i => i.id === id);
    if (item) item.status = newStatus;
    return item;
  },

  async updateItem(id, updates) {
    if (isSupabaseConfigured()) {
      const updatePayload = {};
      if (updates.title) updatePayload.title = updates.title;
      if (updates.description) updatePayload.description = updates.description;
      if (updates.category) updatePayload.category = updates.category;
      if (updates.location) updatePayload.location = updates.location;
      if (updates.type) updatePayload.type = updates.type;
      if (updates.dateLostOrFound) updatePayload.date_lost_or_found = updates.dateLostOrFound;
      if (updates.imageUrl !== undefined) updatePayload.image_url = updates.imageUrl;

      const { data, error } = await supabase
        .from('items')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          id, title, description, type, category, location, date_lost_or_found, image_url, status, created_at,
          profiles:reported_by (id, name, email, role)
        `)
        .single();

      if (error) throw new Error(`Database error updating item: ${error.message}`);
      return mapItem(data);
    }

    const item = memoryItems.find(i => i.id === id);
    if (!item) throw new Error('Item not found.');
    if (updates.title) item.title = updates.title;
    if (updates.description) item.description = updates.description;
    if (updates.category) item.category = updates.category;
    if (updates.location) item.location = updates.location;
    if (updates.type) item.type = updates.type;
    if (updates.dateLostOrFound) item.dateLostOrFound = updates.dateLostOrFound;
    if (updates.imageUrl !== undefined) item.imageUrl = updates.imageUrl;
    return item;
  },

  async deleteItem(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Database error deleting item: ${error.message}`);
      return true;
    }

    const idx = memoryItems.findIndex(i => i.id === id);
    if (idx !== -1) {
      memoryItems.splice(idx, 1);
    }
    return true;
  },

  async updateUserRole(userId, newRole) {
    if (!['student', 'admin'].includes(newRole)) {
      throw new Error('Invalid user role.');
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw new Error(`Database error updating user role: ${error.message}`);
      return true;
    }

    const profile = memoryProfiles.find(u => u.id === userId);
    if (profile) {
      profile.role = newRole;
    }
    return true;
  },

  async createPasswordResetToken(email) {
    const crypto = require('crypto');
    const normalized = (email || '').trim().toLowerCase();
    const user = await this.findUserWithCredentials(normalized);
    if (!user) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (error) {
        console.warn('[Supabase password reset token error]', error.message);
      }
    }

    if (!global.memoryResetTokens) global.memoryResetTokens = [];
    global.memoryResetTokens.push({
      userId: user.id,
      token,
      expiresAt,
      used: false
    });

    return { token, user, expiresAt };
  },

  async verifyAndConsumePasswordResetToken(token, newPasswordHash) {
    if (!token) throw new Error('Reset token is required.');

    if (isSupabaseConfigured()) {
      const { data: record, error } = await supabase
        .from('password_reset_tokens')
        .select('id, user_id, expires_at, used')
        .eq('token', token)
        .maybeSingle();

      if (!error && record) {
        if (record.used) {
          throw new Error('This password reset link has already been used.');
        }
        if (new Date(record.expires_at) < new Date()) {
          throw new Error('This password reset link has expired. Please request a new one.');
        }

        const { error: updateErr } = await supabase
          .from('auth_credentials')
          .update({ password_hash: newPasswordHash, updated_at: new Date().toISOString() })
          .eq('user_id', record.user_id);

        if (updateErr) throw new Error(`Failed to update password: ${updateErr.message}`);

        await supabase
          .from('password_reset_tokens')
          .update({ used: true })
          .eq('id', record.id);

        return true;
      }
    }

    const tokens = global.memoryResetTokens || [];
    const memRecord = tokens.find(t => t.token === token);
    if (!memRecord) {
      throw new Error('Invalid or unrecognized reset token.');
    }
    if (memRecord.used) {
      throw new Error('This password reset link has already been used.');
    }
    if (new Date(memRecord.expiresAt) < new Date()) {
      throw new Error('This password reset link has expired.');
    }

    memRecord.used = true;
    const auth = memoryAuth.find(a => a.user_id === memRecord.userId);
    if (auth) {
      auth.password_hash = newPasswordHash;
    }
    return true;
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
          return data.map(mapClaim);
        }
      } catch (err) {
        console.warn('[Supabase getClaims fallback]', err.message);
      }
    }

    let claims = [...memoryClaims];
    if (itemId) claims = claims.filter(c => c.itemId === itemId);
    if (claimedBy) claims = claims.filter(c => c.claimedBy && c.claimedBy.id === claimedBy);
    if (status) claims = claims.filter(c => c.status === status);
    return claims;
  },

  async createClaim({ itemId, claimedBy, message, proofDescription }) {
    const claimantId = claimedBy.id || claimedBy;

    if (isSupabaseConfigured()) {
      // 1. Check item availability
      const { data: itemData, error: itemErr } = await supabase
        .from('items')
        .select('id, status, title')
        .eq('id', itemId)
        .maybeSingle();

      if (itemErr) throw new Error(`Database error fetching item: ${itemErr.message}`);
      if (!itemData) throw new Error('Item not found.');
      if (itemData.status === 'claimed' || itemData.status === 'returned') {
        throw new Error('This item is no longer available for claims.');
      }

      // 2. Check for duplicate claim by same user
      const { data: existingClaims, error: checkErr } = await supabase
        .from('claims')
        .select('id')
        .eq('item_id', itemId)
        .eq('claimed_by', claimantId);

      if (checkErr) throw new Error(`Database error checking duplicate claim: ${checkErr.message}`);
      if (existingClaims && existingClaims.length > 0) {
        throw new Error('You have already submitted a claim for this item.');
      }

      // 3. Insert claim
      const { data, error } = await supabase
        .from('claims')
        .insert({
          item_id: itemId,
          claimed_by: claimantId,
          message: message || '',
          proof_description: proofDescription,
          status: 'pending'
        })
        .select(`
          id, item_id, message, proof_description, status, created_at,
          items:item_id (id, title, type, category, location, status),
          profiles:claimed_by (id, name, email, role)
        `)
        .single();

      if (error) throw new Error(`Database error submitting claim: ${error.message}`);

      await supabase.from('items').update({ status: 'under_review' }).eq('id', itemId);
      return mapClaim(data);
    }

    // Memory fallback mode
    const targetItem = memoryItems.find(i => i.id === itemId);
    if (!targetItem) throw new Error('Item not found.');
    if (targetItem.status === 'claimed' || targetItem.status === 'returned') {
      throw new Error('This item is no longer available for claims.');
    }

    const existingClaim = memoryClaims.find(c =>
      c.itemId === itemId &&
      c.claimedBy && (c.claimedBy.id === claimantId || c.claimedBy === claimantId)
    );
    if (existingClaim) {
      throw new Error('You have already submitted a claim for this item.');
    }

    targetItem.status = 'under_review';

    const newClaim = {
      id: generateId('clm'),
      itemId,
      item: targetItem,
      claimedBy: mapProfile(claimedBy),
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
      const { data, error } = await supabase
        .from('claims')
        .update({ status: newStatus })
        .eq('id', claimId)
        .select(`
          id, item_id, message, proof_description, status, created_at,
          profiles:claimed_by (id, name, email, role),
          items:item_id (id, title)
        `)
        .single();

      if (error) throw new Error(`Database error updating claim status: ${error.message}`);

      if (data && newStatus === 'approved') {
        // Mark item as claimed
        await supabase.from('items').update({ status: 'claimed' }).eq('id', data.item_id);

        // Reject other pending claims on this item
        const { data: otherClaims } = await supabase
          .from('claims')
          .update({ status: 'rejected' })
          .eq('item_id', data.item_id)
          .eq('status', 'pending')
          .neq('id', claimId)
          .select('id, claimed_by');

        // Notify other claimants that their claim was rejected
        if (otherClaims && otherClaims.length > 0) {
          for (const oc of otherClaims) {
            await this.createNotification({
              userId: oc.claimed_by,
              type: 'claim_status',
              message: `Your ownership claim was not approved — another claimant's proof was verified.`
            });
          }
        }
      }

      return mapClaim(data);
    }

    // Memory fallback mode
    const claim = memoryClaims.find(c => c.id === claimId);
    if (!claim) throw new Error('Claim not found.');

    claim.status = newStatus;
    if (newStatus === 'approved') {
      const item = memoryItems.find(i => i.id === claim.itemId);
      if (item) item.status = 'claimed';

      // Reject all other pending claims on this item and notify users
      const otherClaims = memoryClaims.filter(c =>
        c.itemId === claim.itemId &&
        c.status === 'pending' &&
        c.id !== claimId
      );

      for (const oc of otherClaims) {
        oc.status = 'rejected';
        const otherClaimantId = oc.claimedBy ? (oc.claimedBy.id || oc.claimedBy) : null;
        if (otherClaimantId) {
          await this.createNotification({
            userId: otherClaimantId,
            type: 'claim_status',
            message: `Your ownership claim was not approved — another claimant's proof was verified.`
          });
        }
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
          return data.map(mapNotification);
        }
      } catch (err) {
        console.warn('[Supabase getNotifications fallback]', err.message);
      }
    }

    return memoryNotifications.filter(n => n.userId === userId);
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
      id: generateId('notif'),
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

    memoryNotifications.filter(n => n.userId === userId).forEach(n => { n.isRead = true; });
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
