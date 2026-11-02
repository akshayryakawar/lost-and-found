const session = require('express-session');
const { supabase } = require('../config/supabase');

const SESSION_TABLE = 'user_sessions';

class SupabaseSessionStore extends session.Store {
  constructor(client = supabase) {
    super();
    if (!client) {
      throw new Error('Supabase must be configured to persist Vercel sessions.');
    }
    this.client = client;
  }

  getExpiration(sessionData) {
    const cookie = sessionData.cookie || {};
    if (cookie.expires) return new Date(cookie.expires).toISOString();
    const maxAge = Number.isFinite(cookie.maxAge) ? cookie.maxAge : 24 * 60 * 60 * 1000;
    return new Date(Date.now() + maxAge).toISOString();
  }

  async get(sid, callback) {
    let data;
    let error;
    try {
      ({ data, error } = await this.client
        .from(SESSION_TABLE)
        .select('session_data, expires_at')
        .eq('sid', sid)
        .maybeSingle());
    } catch (error) {
      return callback(error);
    }
    if (error) return callback(error);
    if (!data) return callback(null, null);

    if (new Date(data.expires_at).getTime() <= Date.now()) {
      try {
        const { error: deleteError } = await this.client
          .from(SESSION_TABLE)
          .delete()
          .eq('sid', sid);
        return callback(deleteError || null, null);
      } catch (deleteError) {
        return callback(deleteError);
      }
    }

    callback(null, data.session_data);
  }

  async set(sid, sessionData, callback) {
    let error;
    try {
      ({ error } = await this.client
        .from(SESSION_TABLE)
        .upsert({
          sid,
          session_data: sessionData,
          expires_at: this.getExpiration(sessionData)
        }, { onConflict: 'sid' }));
    } catch (error) {
      if (callback) return callback(error);
    }
    if (callback) callback(error || null);
  }

  async destroy(sid, callback) {
    let error;
    try {
      ({ error } = await this.client
        .from(SESSION_TABLE)
        .delete()
        .eq('sid', sid));
    } catch (error) {
      if (callback) return callback(error);
    }
    if (callback) callback(error || null);
  }

  async touch(sid, sessionData, callback) {
    let error;
    try {
      ({ error } = await this.client
        .from(SESSION_TABLE)
        .update({ expires_at: this.getExpiration(sessionData) })
        .eq('sid', sid));
    } catch (error) {
      if (callback) return callback(error);
    }
    if (callback) callback(error || null);
  }
}

module.exports = SupabaseSessionStore;
