# User Creation Guide

## Why Users Don't Appear After Running SQL

The SQL script (`seed_data.sql`) **only creates questions**, not users. Users must be created through **Supabase Auth** because:

1. Users need to exist in `auth.users` table (Supabase Auth system)
2. A database trigger automatically creates a profile in `profiles` table when a user signs up
3. The admin dashboard reads from the `profiles` table

**You do NOT need to log in with each user** - they just need to be created in the system.

## Solution: Use the Sample Users Script

The easiest way is to use the Node.js script that uses Supabase Admin API:

### Step 1: Set Environment Variables

Make sure your `.env` file has:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 2: Run the Script

```bash
npm run seed-users
```

Or:
```bash
node scripts/create-sample-users.js
```

This will:
- ✅ Create 10 users in Supabase Auth
- ✅ Automatically create profiles (via trigger)
- ✅ Set all profiles to "approved" status
- ✅ Make them visible in Admin Dashboard

### Step 3: Verify

1. Go to Admin Dashboard → "All Users" tab
2. You should see 10 users listed
3. All should have status "approved"

## Alternative: Create Users Manually

If you prefer to create users manually:

### Option A: Via App Signup

1. Go to the app's signup page
2. Create users one by one
3. Go to Admin Dashboard → "Approvals" tab
4. Approve each user

### Option B: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. The profile will be created automatically
5. Go to SQL Editor and approve the profile:
   ```sql
   UPDATE profiles 
   SET status = 'approved' 
   WHERE id = 'USER_ID_HERE';
   ```

## Check Current Users

To see what users exist in your database:

```sql
-- Check all profiles
SELECT id, full_name, email, status, grade, school
FROM profiles
ORDER BY created_at DESC;

-- Check auth users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;
```

## Troubleshooting

### Users created but not showing in Admin Dashboard

1. **Check if profiles exist:**
   ```sql
   SELECT COUNT(*) FROM profiles;
   ```

2. **Check RLS policies:**
   - Make sure you're logged in as admin
   - Admin should see all profiles regardless of status

3. **Check profile status:**
   ```sql
   SELECT status, COUNT(*) 
   FROM profiles 
   GROUP BY status;
   ```

### Script fails with "Missing environment variables"

- Make sure `.env` file exists in project root
- Contains `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Service role key is the **secret** key, not the anon key

### Users created but profiles missing

This shouldn't happen (trigger should create them), but if it does:

```sql
-- Manually create missing profiles
INSERT INTO profiles (id, full_name, grade, school, status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'User'),
  COALESCE((raw_user_meta_data->>'grade')::INTEGER, 8),
  COALESCE(raw_user_meta_data->>'school', 'Unknown'),
  'approved'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

## Sample User Credentials (After Running Script)

All users have password: `Test123!`

- student1@quiz.test - Alice Johnson (Grade 8)
- student2@quiz.test - Bob Smith (Grade 9)
- student3@quiz.test - Charlie Brown (Grade 10)
- student4@quiz.test - Diana Prince (Grade 11)
- student5@quiz.test - Ethan Hunt (Grade 12)
- student6@quiz.test - Fiona Chen (Grade 8)
- student7@quiz.test - George Wilson (Grade 9)
- student8@quiz.test - Hannah Davis (Grade 10)
- student9@quiz.test - Isaac Newton (Grade 11)
- student10@quiz.test - Julia Roberts (Grade 12)

