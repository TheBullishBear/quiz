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

async function checkInvalidQuestions() {
  console.log('🔍 Checking for invalid question references in sessions...\n');

  try {
    // 1. Get all sessions with current_question_id
    console.log('1️⃣  Fetching sessions with current_question_id...');
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, name, status, current_question_id')
      .not('current_question_id', 'is', null);

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      console.log('✅ No sessions with current_question_id found.\n');
      return;
    }

    console.log(`✅ Found ${sessions.length} session(s) with current_question_id\n`);

    // 2. Check which question IDs are invalid
    const questionIds = [...new Set(sessions.map(s => s.current_question_id))];
    console.log(`2️⃣  Checking ${questionIds.length} unique question ID(s)...`);

    const { data: validQuestions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id')
      .in('id', questionIds);

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    const validQuestionIds = new Set(validQuestions?.map(q => q.id) || []);
    const invalidQuestionIds = questionIds.filter(id => !validQuestionIds.has(id));

    if (invalidQuestionIds.length === 0) {
      console.log('✅ All question IDs are valid!\n');
      return;
    }

    console.log(`⚠️  Found ${invalidQuestionIds.length} invalid question ID(s):\n`);
    invalidQuestionIds.forEach(id => {
      console.log(`   - ${id}`);
    });
    console.log('');

    // 3. Find sessions with invalid question IDs
    const sessionsWithInvalidQuestions = sessions.filter(s => 
      invalidQuestionIds.includes(s.current_question_id)
    );

    console.log(`3️⃣  Found ${sessionsWithInvalidQuestions.length} session(s) with invalid questions:\n`);
    sessionsWithInvalidQuestions.forEach(session => {
      console.log(`   Session: ${session.name || session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Invalid Question ID: ${session.current_question_id}`);
      console.log('');
    });

    // 4. Check session_questions for these sessions
    console.log('4️⃣  Checking session_questions for valid questions...\n');
    
    for (const session of sessionsWithInvalidQuestions) {
      const { data: sessionQuestions, error: sqError } = await supabaseAdmin
        .from('session_questions')
        .select('question_id, question_order')
        .eq('session_id', session.id)
        .order('question_order', { ascending: true });

      if (sqError) {
        console.error(`   Error fetching session_questions for ${session.id}: ${sqError.message}`);
        continue;
      }

      if (!sessionQuestions || sessionQuestions.length === 0) {
        console.log(`   ⚠️  Session "${session.name || session.id}" has no questions assigned.`);
        continue;
      }

      // Check which questions are valid
      const sqQuestionIds = sessionQuestions.map(sq => sq.question_id);
      const { data: validSqQuestions } = await supabaseAdmin
        .from('questions')
        .select('id')
        .in('id', sqQuestionIds);

      const validSqQuestionIds = new Set(validSqQuestions?.map(q => q.id) || []);
      const firstValidQuestion = sessionQuestions.find(sq => validSqQuestionIds.has(sq.question_id));

      if (firstValidQuestion) {
        console.log(`   ✅ Found valid question for session "${session.name || session.id}": ${firstValidQuestion.question_id}`);
        console.log(`   💡 You can update the session's current_question_id to: ${firstValidQuestion.question_id}\n`);
      } else {
        console.log(`   ❌ No valid questions found in session_questions for "${session.name || session.id}"`);
        console.log(`   💡 Please add valid questions to this session.\n`);
      }
    }

    // 5. Offer to fix
    console.log('='.repeat(60));
    console.log('💡 To fix this issue:');
    console.log('   1. Go to Admin Dashboard → Quiz Control');
    console.log('   2. For each affected session:');
    console.log('      - Click "Reset Quiz" to clear the invalid question ID');
    console.log('      - Or use "Manage Questions" to ensure valid questions are assigned');
    console.log('      - Then start the session again');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkInvalidQuestions().catch(console.error);

