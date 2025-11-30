# Running Migrations on Supabase Cloud

This guide will help you run the migration script against your Supabase cloud project.

## Step 1: Link Your Project to Supabase Cloud

You need to link your local project to your Supabase cloud project. You have two options:

### Option A: Link using project reference ID

If you know your project reference ID (from your Supabase dashboard URL or the projects list):

```bash
supabase link --project-ref YOUR_PROJECT_REF_ID
```

### Option B: Link interactively

Run the link command and select your project:

```bash
supabase link
```

This will:
1. Ask you to log in (if not already logged in)
2. Show you a list of your projects
3. Let you select which project to link

**From the projects list shown, your "Quiz" project appears to be: `twhcsqolrjbprxqiswxu`**

So you can run:
```bash
supabase link --project-ref twhcsqolrjbprxqiswxu
```

## Step 2: Verify the Link

After linking, verify it worked:

```bash
supabase projects list
```

You should see your project marked as "LINKED".

## Step 3: Run the Migration

Once linked, you can push your migrations to the cloud:

```bash
# Push all pending migrations
supabase db push

# OR push a specific migration
supabase migration up
```

## Alternative: Run Migration Directly via SQL Editor

If you prefer not to use the CLI, you can also:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20251130120000_add_session_features.sql`
5. Click **Run**

## Troubleshooting

### "Not logged in" error
```bash
supabase login
```

### "Project not found" error
- Make sure you're using the correct project reference ID
- Check that you have access to the project in your Supabase dashboard

### "Migration already applied" error
- Check your migration history in Supabase Dashboard → Database → Migrations
- The migration might already be applied

## Verify Migration Success

After running the migration, verify it worked:

1. Go to Supabase Dashboard → Table Editor
2. Check that:
   - `quiz_sessions` table has a `name` column
   - `session_users` table exists
   - `session_questions` table exists

Or run:
```bash
supabase db remote list
```

