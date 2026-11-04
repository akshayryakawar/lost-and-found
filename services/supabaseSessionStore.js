const session = require('express-session');
const { supabase } = require('../config/supabase');

const SESSION_TABLE = 'user_sessions';

class SupabaseSessionStore extends session.Store {
  constructor(client = supabase) {
    super();
    this.client = client;
    this.memoryCache = new Map();
  }

  getExpiration(sessionData) {
    const cookie = sessionData.cookie || {};
    if (cookie.expires) return new Date(cookie.expires).toISOString();
    const maxAge = Number.isFinite(cookie.maxAge) ? cookie.maxAge : 24 * 60 * 60 * 1000;
    return new Date(Date.now() + maxAge).toISOString();
  }

  async get(sid, callback) {
    const cached = this.memoryCache.get(sid);

    if (!this.client) {
      if (cached && cached.expires_at > Date.now()) {
        return callback(null, cached.session_data);
      }
      return callback(null, null);
    }

    try {
      const { data, error } = await this.client
        .from(SESSION_TABLE)
        .select('session_data, expires_at')
        .eq('sid', sid)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Session Query Notice]', error.message);
        if (cached && cached.expires_at > Date.now()) {
          return callback(null, cached.session_data);
        }
        return callback(null, null);
      }

      if (!data) {
        if (cached && cached.expires_at > Date.now()) {
          return callback(null, cached.session_data);
        }
        return callback(null, null);
      }

      if (new Date(data.expires_at).getTime() <= Date.now()) {
        this.memoryCache.delete(sid);
        await this.client.from(SESSION_TABLE).delete().eq('sid', sid).catch(() => {});
        return callback(null, null);
      }

      this.memoryCache.set(sid, {
        session_data: data.session_data,
        expires_at: new Date(data.expires_at).getTime()
      });

      return callback(null, data.session_data);
    } catch (err) {
      console.warn('[Supabase Session Store Error]', err.message);
      if (cached && cached.expires_at > Date.now()) {
        return callback(null, cached.session_data);
      }
      return callback(null, null);
    }
  }

  async set(sid, sessionData, callback) {
    const maxAge = Number.isFinite(sessionData.cookie?.maxAge) ? sessionData.cookie.maxAge : 24 * 60 * 60 * 1000;
    const expiresAtMs = Date.now() + maxAge;

    // Cache locally immediately so session is accessible across subsequent requests in this container
    this.memoryCache.set(sid, {
      session_data: sessionData,
      expires_at: expiresAtMs
    });

    if (!this.client) {
      if (callback) callback(null);
      return;
    }

    try {
      const { error } = await this.client
        .from(SESSION_TABLE)
        .upsert({
          sid,
          session_data: sessionData,
          expires_at: this.getExpiration(sessionData)
        }, { onConflict: 'sid' });

      if (error) {
        console.warn('[Supabase Session Upsert Notice]', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Session Upsert Error]', err.message);
    }

    if (callback) callback(null);
  }

  async destroy(sid, callback) {
    this.memoryCache.delete(sid);

    if (!this.client) {
      if (callback) callback(null);
      return;
    }

    try {
      const { error } = await this.client
        .from(SESSION_TABLE)
        .delete()
        .eq('sid', sid);

      if (error) {
        console.warn('[Supabase Session Destroy Notice]', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Session Destroy Error]', err.message);
    }

    if (callback) callback(null);
  }

  async touch(sid, sessionData, callback) {
    const expiresAtIso = this.getExpiration(sessionData);
    const cached = this.memoryCache.get(sid);
    if (cached) {
      cached.expires_at = new Date(expiresAtIso).getTime();
    }

    if (!this.client) {
      if (callback) callback(null);
      return;
    }

    try {
      const { error } = await this.client
        .from(SESSION_TABLE)
        .update({ expires_at: expiresAtIso })
        .eq('sid', sid);

      if (error) {
        console.warn('[Supabase Session Touch Notice]', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Session Touch Error]', err.message);
    }

    if (callback) callback(null);
  }
}

module.exports = SupabaseSessionStore;
