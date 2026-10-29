/**
 * Supabase Client Configuration
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    isConfigured = true;
    console.log('[Supabase] Initialized client with URL:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase Notice] Failed to initialize client:', err.message);
  }
} else {
  console.log('[Supabase Notice] SUPABASE_URL or SUPABASE_KEY not yet configured in .env');
  console.log('  -> The app will run in development fallback mode until keys are provided in .env');
}

/**
 * Check if valid Supabase connection credentials exist
 */
function isSupabaseConfigured() {
  return isConfigured && supabase !== null;
}

/**
 * Health check to verify live Supabase connectivity
 */
async function testSupabaseConnection() {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      console.warn('[Supabase Check]', error.message);
      return false;
    }
    console.log('[Supabase] Successfully verified connection to remote database tables!');
    return true;
  } catch (err) {
    console.warn('[Supabase Check Error]', err.message);
    return false;
  }
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  testSupabaseConnection
};
