/**
 * Script to distribute all approved users across existing quiz sessions
 * 
 * Usage:
 *   node scripts/distribute-users-to-sessions.js
 * 
 * This will evenly distribute all approved users across all existing sessions
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
  console.error('❌ Missing required environment variables');
  console.error('Please set:');
  console.error('  - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function distributeUsersToSessions() {
  console.log('📊 Distributing users across sessions...\n');

  try {
    // 1. Get all existing sessions
    console.log('1️⃣  Fetching existing sessions...');
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, name, status')
      .order('created_at', { ascending: true });

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      console.log('❌ No sessions found. Please create sessions first.');
      return;
    }

    console.log(`✅ Found ${sessions.length} session(s):`);
    sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.name || `Session ${session.id.slice(0, 8)}...`} (${session.status})`);
    });
    console.log('');

    // 2. Get all approved users
    console.log('2️⃣  Fetching approved users...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'approved')
      .order('full_name', { ascending: true });

    if (profilesError) {
      throw new Error(`Failed to fetch users: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No approved users found. Please create users first.');
      return;
    }

    console.log(`✅ Found ${profiles.length} approved user(s)\n`);

    // 3. Check existing session_users (will be cleared to ensure one session per user)
    console.log('3️⃣  Checking existing session assignments...');
    const { data: existingAssignments, error: assignmentsError } = await supabaseAdmin
      .from('session_users')
      .select('session_id, user_id');

    if (assignmentsError) {
      throw new Error(`Failed to fetch existing assignments: ${assignmentsError.message}`);
    }

    const existingCount = existingAssignments?.length || 0;
    if (existingCount > 0) {
      console.log(`   Found ${existingCount} existing assignment(s) - will be redistributed\n`);
    } else {
      console.log('   No existing assignments found\n');
    }

    // 4. Distribute users evenly across sessions (one session per user)
    console.log('4️⃣  Distributing users across sessions (one session per user)...\n');
    
    // First, remove all existing assignments to ensure clean distribution
    if (existingAssignments && existingAssignments.length > 0) {
      console.log('   Removing existing assignments to ensure one session per user...');
      // Delete all existing assignments
      const { error: deleteError } = await supabaseAdmin
        .from('session_users')
        .delete()
        .neq('session_id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that's always true)
      
      if (deleteError) {
        console.warn('   ⚠️  Could not clear existing assignments:', deleteError.message);
        console.warn('   Continuing with distribution (may result in duplicates)...\n');
      } else {
        console.log('   ✅ Cleared existing assignments\n');
      }
    }
    
    const assignments = [];
    const sessionCount = sessions.length;
    
    // Track which users are already assigned to avoid duplicates
    const assignedUserIds = new Set();
    
    profiles.forEach((profile, index) => {
      // Skip if user is already assigned
      if (assignedUserIds.has(profile.id)) {
        return;
      }
      
      // Round-robin distribution: assign user to session based on their index
      const sessionIndex = index % sessionCount;
      const session = sessions[sessionIndex];
      
      assignments.push({
        session_id: session.id,
        user_id: profile.id,
        session_name: session.name || `Session ${session.id.slice(0, 8)}...`,
        user_name: profile.full_name
      });
      
      assignedUserIds.add(profile.id);
    });

    if (assignments.length === 0) {
      console.log('✅ All users are already assigned to sessions.\n');
      return;
    }

    // 5. Insert assignments
    console.log(`📝 Adding ${assignments.length} user(s) to sessions...\n`);
    
    const sessionAssignments = assignments.map(a => ({
      session_id: a.session_id,
      user_id: a.user_id
    }));

    const { error: insertError } = await supabaseAdmin
      .from('session_users')
      .insert(sessionAssignments);

    if (insertError) {
      // Handle partial failures (some users might already be assigned)
      if (insertError.code === '23505') { // Unique constraint violation
        console.log('⚠️  Some users were already assigned. Continuing with remaining assignments...\n');
        // Try inserting one by one to handle duplicates gracefully
        let successCount = 0;
        let skipCount = 0;
        
        for (const assignment of sessionAssignments) {
          const { error: singleError } = await supabaseAdmin
            .from('session_users')
            .insert(assignment);
          
          if (singleError) {
            if (singleError.code === '23505') {
              skipCount++;
            } else {
              console.error(`❌ Error assigning user: ${singleError.message}`);
            }
          } else {
            successCount++;
          }
        }
        
        console.log(`✅ Successfully assigned: ${successCount} user(s)`);
        if (skipCount > 0) {
          console.log(`⏭️  Skipped (already assigned): ${skipCount} user(s)`);
        }
      } else {
        throw insertError;
      }
    } else {
      console.log(`✅ Successfully assigned ${assignments.length} user(s) to sessions\n`);
    }

    // 6. Show distribution summary
    console.log('='.repeat(60));
    console.log('📊 DISTRIBUTION SUMMARY');
    console.log('='.repeat(60));
    
    // Get final counts per session
    for (const session of sessions) {
      const { data: sessionUsers, error: countError } = await supabaseAdmin
        .from('session_users')
        .select('user_id', { count: 'exact' })
        .eq('session_id', session.id);

      const userCount = sessionUsers?.length || 0;
      console.log(`${session.name || `Session ${session.id.slice(0, 8)}...`}: ${userCount} user(s)`);
    }

    console.log('\n💡 Users have been distributed across all sessions!');
    console.log('💡 You can now start quiz sessions and users can participate.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

distributeUsersToSessions().catch(console.error);

