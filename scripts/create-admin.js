/**
 * Script to create an admin user
 * 
 * This script requires:
 * 1. Supabase Admin API key (service_role key) - NOT the anon key
 * 2. Supabase URL
 * 
 * Usage:
 * 1. Set environment variables:
 *    export SUPABASE_URL="your-supabase-url"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 * 
 * 2. Run the script:
 *    node scripts/create-admin.js <email> <password> <fullName>
 * 
 * Example:
 *    node scripts/create-admin.js admin@example.com admin123 "Admin User"
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  // Try loading from current directory as fallback
  config();
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('\nPlease set in your .env file or as environment variables:');
  if (!SUPABASE_URL) {
    console.error('  ❌ VITE_SUPABASE_URL or SUPABASE_URL (not found)');
  } else {
    console.error('  ✅ SUPABASE_URL (found)');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('  ❌ SUPABASE_SERVICE_ROLE_KEY (not found)');
  } else {
    console.error('  ✅ SUPABASE_SERVICE_ROLE_KEY (found)');
  }
  console.error('\n📝 Add to your .env file:');
  console.error('   VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
  console.error('\nYou can find the service role key in your Supabase dashboard:');
  console.error('  Settings > API > service_role key (secret)');
  console.error('\n💡 Note: The service role key is different from the anon/public key!');
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser(email, password, fullName = 'Admin User') {
  try {
    console.log(`\n🔐 Creating admin user: ${email}...\n`);

    // Step 1: Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        grade: 8, // Required by schema, but not used for admin
        school: 'Admin'
      }
    });

    if (authError) {
      // If user already exists, try to get the existing user
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists. Fetching existing user...');
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
        if (existingUser?.user) {
          await assignAdminRole(existingUser.user.id, fullName);
          return;
        }
      }
      throw authError;
    }

    if (!authData?.user) {
      throw new Error('Failed to create user: No user data returned');
    }

    const userId = authData.user.id;
    console.log(`✅ User created successfully! User ID: ${userId}`);

    // Step 2: Update profile status to approved (optional, but helpful)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        status: 'approved',
        full_name: fullName 
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('⚠️  Warning: Could not update profile:', profileError.message);
    } else {
      console.log('✅ Profile updated successfully');
    }

    // Step 3: Assign admin role
    await assignAdminRole(userId, fullName);

    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please save these credentials securely!');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

async function assignAdminRole(userId, fullName) {
  // Check if admin role already exists
  const { data: existingRole } = await supabaseAdmin
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (existingRole) {
    console.log('✅ Admin role already assigned');
    return;
  }

  // Insert admin role
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'admin'
    });

  if (roleError) {
    throw new Error(`Failed to assign admin role: ${roleError.message}`);
  }

  console.log('✅ Admin role assigned successfully');
}

// Get command line arguments or prompt for input
const args = process.argv.slice(2);

if (args.length >= 2) {
  const [email, password, fullName] = args;
  createAdminUser(email, password, fullName || 'Admin User');
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📝 Admin User Creation Script\n');
  
  rl.question('Email: ', (email) => {
    rl.question('Password: ', (password) => {
      rl.question('Full Name (optional, default: "Admin User"): ', (fullName) => {
        rl.close();
        createAdminUser(email, password, fullName || 'Admin User');
      });
    });
  });
}

