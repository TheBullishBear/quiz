import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testQuestionView() {
  const questionId = '474f9a18-aaa7-4098-9537-aceb08fd1cdd';
  
  console.log('🔍 Testing question access...\n');
  console.log(`Question ID: ${questionId}\n`);

  // 1. Check if question exists in questions table
  console.log('1️⃣  Checking questions table (admin access)...');
  const { data: questionFromTable, error: tableError } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (tableError) {
    console.log(`   ❌ Error: ${tableError.message}`);
  } else if (questionFromTable) {
    console.log(`   ✅ Question exists in table: ${questionFromTable.question_text?.substring(0, 50)}...`);
  } else {
    console.log('   ❌ Question not found in table');
  }
  console.log('');

  // 2. Check if question exists in questions_without_answers view
  console.log('2️⃣  Checking questions_without_answers view (admin access)...');
  const { data: questionFromView, error: viewError } = await supabaseAdmin
    .from('questions_without_answers')
    .select('*')
    .eq('id', questionId)
    .single();

  if (viewError) {
    console.log(`   ❌ Error: ${viewError.message}`);
    console.log(`   Error code: ${viewError.code}`);
  } else if (questionFromView) {
    console.log(`   ✅ Question exists in view: ${questionFromView.question_text?.substring(0, 50)}...`);
    console.log(`   View columns: ${Object.keys(questionFromView).join(', ')}`);
  } else {
    console.log('   ❌ Question not found in view');
  }
  console.log('');

  // 3. Get a student user to test with
  console.log('3️⃣  Testing with student user credentials...');
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, status')
    .eq('status', 'approved')
    .limit(1)
    .single();

  if (!profiles) {
    console.log('   ⚠️  No approved users found');
    return;
  }

  console.log(`   Using user: ${profiles.full_name} (${profiles.id})`);
  
  // Get the user's auth token (we can't easily do this, but we can check the RLS policy)
  console.log('   Note: Cannot test actual RLS without user session token');
  console.log('   But we can verify the question exists in the view\n');

  // 4. Check view definition
  console.log('4️⃣  Checking view structure...');
  const { data: viewInfo, error: viewInfoError } = await supabaseAdmin.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questions_without_answers'
      ORDER BY ordinal_position;
    `
  }).catch(() => ({ data: null, error: { message: 'Cannot query view structure directly' } }));

  if (!viewInfoError && viewInfo) {
    console.log('   View columns:', viewInfo);
  } else {
    // Try a different approach - just select from view to see structure
    const { data: sample } = await supabaseAdmin
      .from('questions_without_answers')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      console.log(`   ✅ View is accessible, sample columns: ${Object.keys(sample[0]).join(', ')}`);
    }
  }
  console.log('');

  // 5. Summary
  console.log('='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Question in table: ${questionFromTable ? '✅' : '❌'}`);
  console.log(`   Question in view: ${questionFromView ? '✅' : '❌'}`);
  
  if (!questionFromView && questionFromTable) {
    console.log('\n⚠️  ISSUE FOUND: Question exists in table but NOT in view!');
    console.log('   This could mean:');
    console.log('   - The view has a filter that excludes this question');
    console.log('   - The view definition is incorrect');
    console.log('   - There\'s a data issue');
  }
  console.log('='.repeat(60));
}

testQuestionView().catch(console.error);

