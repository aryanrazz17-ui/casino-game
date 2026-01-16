const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToAdmin(email) {
    console.log(`\n🚀 Promoting ${email} to admin...`);

    const { data, error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('email', email.toLowerCase())
        .select();

    if (error) {
        console.error('❌ Error updating user:', error.message);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log(`✅ Success! User ${data[0].username} (${email}) is now an admin.`);
    } else {
        console.log(`⚠️ User with email ${email} not found in the 'users' table.`);
    }
}

const emailToPromote = process.env.ADMIN_EMAIL || process.argv[2];

if (!emailToPromote) {
    console.log('Usage: node promote-admin.js <email>');
    process.exit(1);
}

promoteToAdmin(emailToPromote);
