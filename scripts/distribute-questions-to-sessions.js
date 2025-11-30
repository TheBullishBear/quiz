/**
 * Script to distribute all questions across existing quiz sessions
 * 
 * Usage:
 *   node scripts/distribute-questions-to-sessions.js
 * 
 * This will evenly distribute questions across all existing sessions
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

async function distributeQuestionsToSessions() {
  console.log('📊 Distributing questions across sessions...\n');

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

    // 2. Get all questions
    console.log('2️⃣  Fetching all questions...');
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id, round_number, question_order, question_text')
      .order('round_number', { ascending: true })
      .order('question_order', { ascending: true });

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    if (!questions || questions.length === 0) {
      console.log('❌ No questions found. Please add questions first.');
      return;
    }

    console.log(`✅ Found ${questions.length} question(s)\n`);

    // 3. Check existing session_questions to avoid duplicates
    console.log('3️⃣  Checking existing question assignments...');
    const { data: existingAssignments, error: assignmentsError } = await supabaseAdmin
      .from('session_questions')
      .select('session_id, question_id');

    if (assignmentsError) {
      throw new Error(`Failed to fetch existing assignments: ${assignmentsError.message}`);
    }

    // Create a Set of existing assignments for quick lookup
    const existingSet = new Set(
      (existingAssignments || []).map(a => `${a.session_id}-${a.question_id}`)
    );

    // 4. Distribute questions evenly across sessions
    console.log('4️⃣  Distributing questions across sessions...\n');
    
    const assignments = [];
    const sessionCount = sessions.length;
    
    questions.forEach((question, index) => {
      // Round-robin distribution: assign question to session based on their index
      const sessionIndex = index % sessionCount;
      const session = sessions[sessionIndex];
      const assignmentKey = `${session.id}-${question.id}`;
      
      // Skip if already assigned
      if (!existingSet.has(assignmentKey)) {
        // Get current max order for this session
        const sessionQuestions = (existingAssignments || [])
          .filter(a => a.session_id === session.id);
        const maxOrder = sessionQuestions.length > 0 
          ? Math.max(...sessionQuestions.map(() => 0)) + 1
          : 0;
        
        assignments.push({
          session_id: session.id,
          question_id: question.id,
          question_order: assignments.filter(a => a.session_id === session.id).length + 1,
          session_name: session.name || `Session ${session.id.slice(0, 8)}...`,
          question_preview: question.question_text?.substring(0, 50) || 'Image Question'
        });
      }
    });

    if (assignments.length === 0) {
      console.log('✅ All questions are already assigned to sessions.\n');
    } else {
      // Calculate question order per session
      const sessionOrderCounts = {};
      assignments.forEach(a => {
        if (!sessionOrderCounts[a.session_id]) {
          sessionOrderCounts[a.session_id] = 0;
        }
        a.question_order = sessionOrderCounts[a.session_id] + 1;
        sessionOrderCounts[a.session_id]++;
      });

      // 5. Insert assignments
      console.log(`📝 Adding ${assignments.length} question(s) to sessions...\n`);
      
      const sessionQuestions = assignments.map(a => ({
        session_id: a.session_id,
        question_id: a.question_id,
        question_order: a.question_order
      }));

      // Insert in batches to handle large datasets
      const batchSize = 50;
      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < sessionQuestions.length; i += batchSize) {
        const batch = sessionQuestions.slice(i, i + batchSize);
        
        const { error: insertError } = await supabaseAdmin
          .from('session_questions')
          .insert(batch);

        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            // Try inserting one by one
            for (const assignment of batch) {
              const { error: singleError } = await supabaseAdmin
                .from('session_questions')
                .insert(assignment);
              
              if (singleError) {
                if (singleError.code === '23505') {
                  skipped++;
                } else {
                  console.error(`❌ Error: ${singleError.message}`);
                }
              } else {
                inserted++;
              }
            }
          } else {
            throw insertError;
          }
        } else {
          inserted += batch.length;
        }
      }

      console.log(`✅ Successfully assigned: ${inserted} question(s)`);
      if (skipped > 0) {
        console.log(`⏭️  Skipped (already assigned): ${skipped} question(s)`);
      }
      console.log('');
    }

    // 6. Show distribution summary
    console.log('='.repeat(60));
    console.log('📊 DISTRIBUTION SUMMARY');
    console.log('='.repeat(60));
    
    // Get final counts per session
    for (const session of sessions) {
      const { data: sessionQuestions, error: countError } = await supabaseAdmin
        .from('session_questions')
        .select('question_id', { count: 'exact' })
        .eq('session_id', session.id);

      const questionCount = sessionQuestions?.length || 0;
      console.log(`${session.name || `Session ${session.id.slice(0, 8)}...`}: ${questionCount} question(s)`);
    }

    console.log('\n💡 Questions have been distributed across all sessions!');
    console.log('💡 You can now start quiz sessions with questions assigned.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

distributeQuestionsToSessions().catch(console.error);

