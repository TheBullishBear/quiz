/**
 * Script to verify if migration was applied by checking database schema
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
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Need: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration() {
  console.log('🔍 Verifying migration status...\n');

  // Check if name column exists by trying to select it
  try {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('name')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('name')) {
        console.log('❌ Column "name" does NOT exist in quiz_sessions table');
        console.log('   → Migration needs to be applied\n');
        return false;
      } else {
        console.log('⚠️  Error checking name column:', error.message);
        return false;
      }
    } else {
      console.log('✅ Column "name" exists in quiz_sessions table');
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }

  // Check if session_users table exists
  try {
    const { data, error } = await supabase
      .from('session_users')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('❌ Table "session_users" does NOT exist');
        console.log('   → Migration needs to be applied\n');
        return false;
      } else {
        // Other errors (like RLS) mean table exists
        console.log('✅ Table "session_users" exists');
      }
    } else {
      console.log('✅ Table "session_users" exists');
    }
  } catch (err) {
    console.log('⚠️  Could not verify session_users:', err.message);
  }

  // Check if session_questions table exists
  try {
    const { data, error } = await supabase
      .from('session_questions')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('❌ Table "session_questions" does NOT exist');
        console.log('   → Migration needs to be applied\n');
        return false;
      } else {
        console.log('✅ Table "session_questions" exists');
      }
    } else {
      console.log('✅ Table "session_questions" exists');
    }
  } catch (err) {
    console.log('⚠️  Could not verify session_questions:', err.message);
  }

  console.log('\n✅ Migration appears to be applied!');
  console.log('\n💡 If session creation still fails, the issue is likely:');
  console.log('   1. Admin role not set correctly');
  console.log('   2. RLS policy issue');
  console.log('   3. Check the actual error message in browser console');
  return true;
}

verifyMigration().catch(console.error);

