import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSessionQuestions() {
  const sessionId = process.argv[2];
  
  if (!sessionId) {
    console.error('❌ Please provide a session ID');
    console.error('Usage: node scripts/check-session-questions.js <session-id>');
    process.exit(1);
  }

  console.log(`🔍 Checking questions for session: ${sessionId}\n`);

  try {
    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, name, status, current_question_id')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    console.log('📋 Session Info:');
    console.log(`   Name: ${session.name || 'N/A'}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Current Question ID: ${session.current_question_id || 'null'}`);
    console.log('');

    // Get all questions assigned to this session
    const { data: sessionQuestions, error: sqError } = await supabase
      .from('session_questions')
      .select('question_id')
      .eq('session_id', sessionId);

    if (sqError) {
      throw new Error(`Failed to fetch session questions: ${sqError.message}`);
    }

    if (!sessionQuestions || sessionQuestions.length === 0) {
      console.log('❌ No questions assigned to this session');
      return;
    }

    console.log(`✅ Found ${sessionQuestions.length} question(s) assigned to session\n`);

    // Get the actual question details
    const questionIds = sessionQuestions.map(sq => sq.question_id);
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, round_number, question_order, question_text')
      .in('id', questionIds)
      .order('round_number', { ascending: true })
      .order('question_order', { ascending: true });

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    console.log('📚 All Questions in Session:');
    questions.forEach((q, index) => {
      const isCurrent = q.id === session.current_question_id;
      const marker = isCurrent ? '👉' : '  ';
      console.log(`${marker} ${index + 1}. Round ${q.round_number}, Order ${q.question_order} (ID: ${q.id.slice(0, 8)}...)`);
      console.log(`      Text: ${q.question_text?.substring(0, 60) || 'Image Question'}...`);
      if (isCurrent) {
        console.log(`      ⚠️  THIS IS THE CURRENT QUESTION`);
      }
    });
    console.log('');

    // Group by round
    const round1Questions = questions.filter(q => q.round_number === 1);
    const round2Questions = questions.filter(q => q.round_number === 2);
    const round3Questions = questions.filter(q => q.round_number === 3);
    const finalsQuestions = questions.filter(q => q.round_number === 4);

    console.log('📊 Questions by Round:');
    console.log(`   Round 1: ${round1Questions.length} question(s)`);
    if (round1Questions.length > 0) {
      round1Questions.forEach(q => {
        console.log(`      - Order ${q.question_order} (ID: ${q.id.slice(0, 8)}...)`);
      });
    }
    console.log(`   Round 2: ${round2Questions.length} question(s)`);
    console.log(`   Round 3: ${round3Questions.length} question(s)`);
    console.log(`   Finals: ${finalsQuestions.length} question(s)`);
    console.log('');

    // Check if question 1 exists for round 1
    const question1 = round1Questions.find(q => q.question_order === 1);
    if (!question1) {
      console.log('⚠️  WARNING: No question with order 1 found in Round 1!');
      if (round1Questions.length > 0) {
        console.log(`   First question in Round 1 has order: ${round1Questions[0].question_order}`);
      } else {
        console.log('   No questions found in Round 1 at all!');
      }
    } else {
      console.log('✅ Question 1 found in Round 1:');
      console.log(`   ID: ${question1.id}`);
      console.log(`   Text: ${question1.question_text?.substring(0, 60) || 'Image Question'}...`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSessionQuestions();

