# Troubleshooting Session Creation Error

If you're getting "Failed to create session" error, follow these steps:

## Step 1: Check the Actual Error Message

I've updated the code to show the actual error message. When you try to create a session now, check:
1. The toast notification - it should show the actual error message
2. Browser console (F12 → Console tab) - look for "Session creation error"

Common error messages and solutions:

### "new row violates row-level security policy"
**Solution:** Your admin role might not be set correctly. Verify:
1. Go to Supabase Dashboard → Authentication → Users
2. Find your user and note the User ID
3. Go to SQL Editor and run:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';
   ```
4. If no admin role exists, add it:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('YOUR_USER_ID', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

### "column 'name' does not exist"
**Solution:** The migration wasn't applied. Run:
```bash
supabase db push
```

Or manually apply the migration:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20251130120000_add_session_features.sql`
3. Paste and run

### "relation 'quiz_sessions' does not exist"
**Solution:** The base migration wasn't applied. Check your migration history in Supabase Dashboard.

## Step 2: Verify Migration Was Applied

1. Go to Supabase Dashboard → Table Editor
2. Check if:
   - `quiz_sessions` table has a `name` column
   - `session_users` table exists
   - `session_questions` table exists

## Step 3: Check RLS Policies

1. Go to Supabase Dashboard → Authentication → Policies
2. Find `quiz_sessions` table
3. Verify there's a policy: "Admins can manage sessions"
4. The policy should use: `has_role(auth.uid(), 'admin')`

## Step 4: Verify Admin Role

Run this in SQL Editor:
```sql
-- Check if you have admin role
SELECT ur.*, p.full_name, p.status
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin';
```

If you don't see your user, add the admin role (see Step 1).

## Step 5: Test Direct Insert

Try inserting directly via SQL Editor to isolate the issue:
```sql
INSERT INTO quiz_sessions (name, status, current_round, time_limit_seconds)
VALUES ('Test Session', 'not_started', 1, 60);
```

If this works, the issue is with RLS policies or the client connection.
If this fails, check the error message for clues.

## Quick Fix: Re-run Migration

If nothing else works, try re-running the migration:

```bash
# Check migration status
supabase migration list

# If migration shows as not applied, push again
supabase db push
```

Or manually run the SQL in Supabase Dashboard → SQL Editor.

