const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase configuration. Please check .env file.');
}

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = supabase;
