/**
 * Script to create sample users for testing
 * 
 * Usage:
 *   node scripts/create-sample-users.js
 * 
 * This will create 10 sample students with approved profiles
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

const sampleUsers = [
  { email: 'student1@quiz.test', name: 'Alice Johnson', grade: 8, school: 'Lincoln High School' },
  { email: 'student2@quiz.test', name: 'Bob Smith', grade: 9, school: 'Washington Middle School' },
  { email: 'student3@quiz.test', name: 'Charlie Brown', grade: 10, school: 'Roosevelt High School' },
  { email: 'student4@quiz.test', name: 'Diana Prince', grade: 11, school: 'Kennedy Academy' },
  { email: 'student5@quiz.test', name: 'Ethan Hunt', grade: 12, school: 'Madison High School' },
  { email: 'student6@quiz.test', name: 'Fiona Chen', grade: 8, school: 'Lincoln High School' },
  { email: 'student7@quiz.test', name: 'George Wilson', grade: 9, school: 'Washington Middle School' },
  { email: 'student8@quiz.test', name: 'Hannah Davis', grade: 10, school: 'Roosevelt High School' },
  { email: 'student9@quiz.test', name: 'Isaac Newton', grade: 11, school: 'Kennedy Academy' },
  { email: 'student10@quiz.test', name: 'Julia Roberts', grade: 12, school: 'Madison High School' },
];

async function createSampleUsers() {
  console.log('📝 Creating sample users...\n');

  const createdUsers = [];
  const failedUsers = [];

  for (const user of sampleUsers) {
    try {
      let userId;
      
      // Try to create user (will fail if already exists)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'Test123!', // Default password for all test users
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          grade: user.grade,
          school: user.school,
        }
      });

      if (authError) {
        // If user already exists, try to get them by listing users
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          console.log(`⚠️  User ${user.email} already exists, fetching user...`);
          
          // List users and find by email
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) {
            throw new Error(`Failed to list users: ${listError.message}`);
          }
          
          const existingUser = users.find(u => u.email === user.email);
          if (existingUser) {
            userId = existingUser.id;
            console.log(`✅ Found existing user: ${user.email}`);
          } else {
            throw new Error(`User ${user.email} exists but could not be found`);
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
        console.log(`✅ Created user: ${user.email}`);
      }

      // Update profile to approved status
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          status: 'approved',
          full_name: user.name,
          grade: user.grade,
          school: user.school,
        })
        .eq('id', userId);

      if (profileError) {
        console.warn(`⚠️  Could not update profile for ${user.email}:`, profileError.message);
      }

      createdUsers.push({ ...user, userId, password: 'Test123!' });

    } catch (error) {
      console.error(`❌ Failed to create ${user.email}:`, error.message);
      failedUsers.push({ ...user, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully created/updated: ${createdUsers.length} users`);
  console.log(`❌ Failed: ${failedUsers.length} users\n`);

  if (createdUsers.length > 0) {
    console.log('📋 Created Users:');
    console.log('-'.repeat(60));
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Grade: ${user.grade} | School: ${user.school}`);
      console.log('');
    });
  }

  if (failedUsers.length > 0) {
    console.log('❌ Failed Users:');
    failedUsers.forEach((user) => {
      console.log(`   - ${user.email}: ${user.error}`);
    });
  }

  console.log('\n💡 All users have the password: Test123!');
  console.log('💡 All users are approved and ready to participate in quizzes.');
}

createSampleUsers().catch(console.error);

