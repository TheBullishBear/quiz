import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserPermissions() {
  console.log('🔍 Checking user permissions for question access...\n');

  try {
    // Get the question ID from the session
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, name, current_question_id')
      .not('current_question_id', 'is', null)
      .limit(1);

    if (sessionsError || !sessions || sessions.length === 0) {
      console.log('⚠️  No active sessions with questions found.');
      return;
    }

    const session = sessions[0];
    const questionId = session.current_question_id;
    console.log(`📋 Session: ${session.name || session.id}`);
    console.log(`❓ Question ID: ${questionId}\n`);

    // Check if question exists
    const { data: question, error: questionError } = await supabaseAdmin
      .from('questions')
      .select('id, question_text')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      console.log(`❌ Question not found in database: ${questionId}`);
      return;
    }

    console.log(`✅ Question exists: ${question.question_text?.substring(0, 50)}...\n`);

    // Get all users assigned to this session
    const { data: sessionUsers, error: suError } = await supabaseAdmin
      .from('session_users')
      .select('user_id')
      .eq('session_id', session.id);

    if (suError || !sessionUsers || sessionUsers.length === 0) {
      console.log('⚠️  No users assigned to this session.');
      return;
    }

    console.log(`👥 Found ${sessionUsers.length} user(s) assigned to session\n`);

    // Check each user's profile status
    const userIds = sessionUsers.map(su => su.user_id);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, status')
      .in('id', userIds);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError.message);
      return;
    }

    console.log('📊 User Profile Status:\n');
    profiles?.forEach(profile => {
      const statusIcon = profile.status === 'approved' ? '✅' : '❌';
      console.log(`   ${statusIcon} ${profile.full_name || profile.id}`);
      console.log(`      Status: ${profile.status}`);
      console.log(`      User ID: ${profile.id}`);
      console.log('');
    });

    // Check RLS policies
    console.log('🔐 RLS Policy Check:\n');
    console.log('   The "Participants can view questions without answers" policy requires:');
    console.log('   - User must be in the profiles table');
    console.log('   - User status must be "approved"\n');

    const unapprovedUsers = profiles?.filter(p => p.status !== 'approved') || [];
    if (unapprovedUsers.length > 0) {
      console.log('⚠️  Users who cannot access questions:');
      unapprovedUsers.forEach(user => {
        console.log(`   - ${user.full_name || user.id} (status: ${user.status})`);
      });
      console.log('');
    }

    // Test if a user can access the question (simulate RLS)
    if (profiles && profiles.length > 0) {
      const testUser = profiles[0];
      console.log(`🧪 Testing access for: ${testUser.full_name || testUser.id}\n`);

      // We can't actually test RLS with service role, but we can check the conditions
      if (testUser.status === 'approved') {
        console.log('✅ User should be able to access questions (status is approved)');
      } else {
        console.log('❌ User CANNOT access questions (status is not approved)');
        console.log(`   Current status: ${testUser.status}`);
        console.log('   Solution: Update user status to "approved" in the admin dashboard');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkUserPermissions().catch(console.error);

