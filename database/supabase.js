require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_KEY.');
    console.error('Please set these in your environment variables.');
    supabase = null;
} else {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error.message);
        supabase = null;
    }
}

module.exports = supabase;
