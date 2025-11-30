/**
 * Script to create a sample quiz session with questions and users
 * 
 * Usage:
 *   node scripts/setup-sample-session.js [session-name]
 * 
 * Example:
 *   node scripts/setup-sample-session.js "Practice Quiz"
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
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sessionName = process.argv[2] || 'Sample Quiz Session';

async function setupSampleSession() {
  console.log(`🎯 Setting up sample quiz session: "${sessionName}"\n`);

  try {
    // 1. Create the session
    console.log('1️⃣  Creating quiz session...');
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .insert([{
        name: sessionName,
        status: 'not_started',
        current_round: 1,
        time_limit_seconds: 60
      }])
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    const sessionId = sessionData.id;
    console.log(`✅ Session created: ${sessionId}\n`);

    // 2. Get all questions (Round 1 and 2)
    console.log('2️⃣  Fetching questions...');
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id, round_number, question_order')
      .in('round_number', [1, 2])
      .order('round_number', { ascending: true })
      .order('question_order', { ascending: true })
      .limit(20);

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    if (questions.length === 0) {
      console.log('⚠️  No questions found. Please run the seed_data.sql first.');
      return;
    }

    console.log(`✅ Found ${questions.length} questions\n`);

    // 3. Add questions to session
    console.log('3️⃣  Adding questions to session...');
    const sessionQuestions = questions.map((q, index) => ({
      session_id: sessionId,
      question_id: q.id,
      question_order: index + 1
    }));

    const { error: addQuestionsError } = await supabaseAdmin
      .from('session_questions')
      .insert(sessionQuestions);

    if (addQuestionsError) {
      throw new Error(`Failed to add questions: ${addQuestionsError.message}`);
    }

    console.log(`✅ Added ${questions.length} questions to session\n`);

    // 4. Get all approved users
    console.log('4️⃣  Fetching approved users...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('status', 'approved')
      .limit(10);

    if (profilesError) {
      throw new Error(`Failed to fetch users: ${profilesError.message}`);
    }

    if (profiles.length === 0) {
      console.log('⚠️  No approved users found. Run create-sample-users.js first.');
      return;
    }

    console.log(`✅ Found ${profiles.length} approved users\n`);

    // 5. Add users to session
    console.log('5️⃣  Adding users to session...');
    const sessionUsers = profiles.map(profile => ({
      session_id: sessionId,
      user_id: profile.id
    }));

    const { error: addUsersError } = await supabaseAdmin
      .from('session_users')
      .insert(sessionUsers);

    if (addUsersError) {
      throw new Error(`Failed to add users: ${addUsersError.message}`);
    }

    console.log(`✅ Added ${profiles.length} users to session\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('🎉 Sample Session Setup Complete!');
    console.log('='.repeat(60));
    console.log(`Session Name: ${sessionName}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Questions: ${questions.length}`);
    console.log(`Users: ${profiles.length}`);
    console.log(`Time Limit: 60 seconds per question`);
    console.log('\n💡 You can now:');
    console.log('   1. Go to Admin Dashboard → Quiz Control');
    console.log('   2. Find your session and start it');
    console.log('   3. Users can participate in the quiz!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

setupSampleSession().catch(console.error);

