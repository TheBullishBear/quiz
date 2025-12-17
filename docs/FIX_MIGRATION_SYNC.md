# Fix Migration History Sync Issue

The CLI is detecting a mismatch between local and remote migration history. Here's how to fix it:

## Understanding the Issue

The error suggests:
- Migration `20251201000000` exists in remote but not locally (needs to be marked as reverted)
- Migration `20251130120000` might already be applied remotely (needs to be marked as applied)

## Solution: Repair Migration History

You have two options:-

### Option 1: Repair via CLI (Recommended)

Run these commands in order (enter your database password when prompted):

```bash
# Mark the remote-only migration as reverted
supabase migration repair --status reverted 20251201000000

# Mark your session features migration as applied (if it was already applied manually)
supabase migration repair --status applied 20251130120000
```

After repairing, try:
```bash
supabase db pull
```

### Option 2: Repair via SQL Editor (If CLI Fails)

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL to check current migration status:

```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 10;
```

3. If `20251130120000` is NOT in the list but the tables exist, add it:

```sql
-- Mark migration as applied (if tables already exist)
INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20251130120000',
  ARRAY[]::text[],
  'add_session_features'
)
ON CONFLICT (version) DO NOTHING;
```

4. If `20251201000000` exists but shouldn't, mark it as reverted:

```sql
-- Remove or mark as reverted (if needed)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20251201000000';
```

## Verify Migration is Applied

After repairing, verify the migration was applied:

1. **Check Tables:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('session_users', 'session_questions');
   ```

2. **Check Column:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'quiz_sessions' 
   AND column_name = 'name';
   ```

3. **If tables/column don't exist**, run the migration manually:
   - Copy contents of `supabase/migrations/20251130120000_add_session_features_SAFE.sql`
   - Run in SQL Editor

## After Repair

Once migration history is synced:

1. Try creating a session in the admin dashboard
2. Check the error message (it will now show the actual error)
3. If it still fails, share the exact error message

## Alternative: Skip Migration History

If you just want to get things working and don't care about migration history:

1. Apply the migration manually via SQL Editor (use the `_SAFE.sql` file)
2. Test session creation
3. Fix migration history later if needed

The important thing is that the database schema is correct, not necessarily that the migration history matches perfectly.

