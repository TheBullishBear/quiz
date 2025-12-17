/**
 * Diagnostic script to check if migration was applied correctly
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkMigration() {
  console.log('🔍 Checking migration status...\n');

  // Check if name column exists
  try {
    const { data, error } = await supabaseAdmin
      .from('quiz_sessions')
      .select('name')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('name')) {
        console.log('❌ Column "name" does not exist in quiz_sessions table');
        console.log('   The migration may not have been applied correctly.\n');
      } else {
        console.log('⚠️  Error checking name column:', error.message);
      }
    } else {
      console.log('✅ Column "name" exists in quiz_sessions table');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Check if session_users table exists
  try {
    const { data, error } = await supabaseAdmin
      .from('session_users')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('❌ Table "session_users" does not exist');
        console.log('   The migration may not have been applied correctly.\n');
      } else {
        console.log('✅ Table "session_users" exists');
      }
    } else {
      console.log('✅ Table "session_users" exists');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Check if session_questions table exists
  try {
    const { data, error } = await supabaseAdmin
      .from('session_questions')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('❌ Table "session_questions" does not exist');
        console.log('   The migration may not have been applied correctly.\n');
      } else {
        console.log('✅ Table "session_questions" exists');
      }
    } else {
      console.log('✅ Table "session_questions" exists');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }

  // Check RLS policies
  console.log('\n📋 Checking RLS policies...');
  console.log('   (This requires direct database access - check Supabase Dashboard)');

  console.log('\n💡 If tables/columns are missing, try:');
  console.log('   1. Run: supabase db push');
  console.log('   2. Or manually run the migration SQL in Supabase Dashboard > SQL Editor');
}

checkMigration().catch(console.error);

