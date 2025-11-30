/**
 * Script to verify session user and question assignments
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

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

async function verifyAssignments() {
  console.log('🔍 Verifying session assignments...\n');

  // Get all sessions
  const { data: sessions } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, name')
    .order('created_at', { ascending: true });

  if (!sessions || sessions.length === 0) {
    console.log('❌ No sessions found');
    return;
  }

  console.log(`Found ${sessions.length} session(s):\n`);

  for (const session of sessions) {
    console.log(`📋 ${session.name || session.id.slice(0, 8)}...`);
    
    // Check users
    const { data: sessionUsers, error: usersError } = await supabaseAdmin
      .from('session_users')
      .select(`
        id,
        user_id
      `)
      .eq('session_id', session.id);

    // Fetch profile data separately
    let usersWithProfiles = [];
    if (sessionUsers && sessionUsers.length > 0) {
      const userIds = sessionUsers.map(su => su.user_id);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, grade, school')
        .in('id', userIds);

      usersWithProfiles = sessionUsers.map(su => ({
        ...su,
        profiles: profiles?.find(p => p.id === su.user_id)
      }));
    }

    if (usersError) {
      console.log(`  ❌ Error fetching users: ${usersError.message}`);
    } else {
      console.log(`  👥 Users: ${usersWithProfiles.length || 0}`);
      if (usersWithProfiles.length > 0) {
        usersWithProfiles.forEach((su) => {
          console.log(`     - ${su.profiles?.full_name || 'Unknown'} (${su.user_id.slice(0, 8)}...)`);
        });
      }
    }

    // Check questions
    const { data: sessionQuestions, error: questionsError } = await supabaseAdmin
      .from('session_questions')
      .select('id, question_id')
      .eq('session_id', session.id);

    if (questionsError) {
      console.log(`  ❌ Error fetching questions: ${questionsError.message}`);
    } else {
      console.log(`  ❓ Questions: ${sessionQuestions?.length || 0}`);
    }

    console.log('');
  }
}

verifyAssignments().catch(console.error);

