# Manual Migration Instructions

Since there's a migration sync issue, here's how to apply the migration manually:

## Option 1: Via Supabase Dashboard (Recommended - No Password Needed)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/twhcsqolrjbprxqiswxu

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration SQL**
   - Open the file: `supabase/migrations/20251130120000_add_session_features_SAFE.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Run the Migration**
   - Click the "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for it to complete

5. **Verify Success**
   - You should see "Success. No rows returned"
   - Go to "Table Editor" and verify:
     - `quiz_sessions` table has a `name` column
     - `session_users` table exists
     - `session_questions` table exists

## Option 2: Fix Migration Sync and Use CLI

If you want to use the CLI:

1. **Pull remote migrations first:**
   ```bash
   supabase db pull
   ```
   (Enter your database password when prompted)

2. **Then push your new migration:**
   ```bash
   supabase db push
   ```

## Verify Migration Applied

After running the migration, verify it worked:

1. **Check Tables:**
   - Go to Table Editor
   - Check that `session_users` and `session_questions` tables exist

2. **Check Column:**
   - Open `quiz_sessions` table
   - Verify there's a `name` column (can be NULL)

3. **Test Session Creation:**
   - Try creating a session in the admin dashboard
   - It should work now!

## If You Still Get Errors

If session creation still fails after applying the migration:

1. **Check the error message** (now it will show the actual error)
2. **Verify your admin role:**
   ```sql
   SELECT * FROM user_roles WHERE role = 'admin';
   ```
3. **Check RLS policies:**
   - Go to Authentication → Policies
   - Verify "Admins can manage sessions" policy exists for `quiz_sessions`

## Quick SQL to Check Everything

Run this in SQL Editor to verify everything is set up:

```sql
-- Check if name column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz_sessions' AND column_name = 'name';

-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('session_users', 'session_questions');

-- Check your admin role
SELECT ur.*, p.full_name 
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

