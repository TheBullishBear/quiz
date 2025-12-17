# Seed Data Instructions

This guide will help you populate your database with sample data for testing the quiz application.

## Step 1: Add Sample Questions

1. **Go to Supabase Dashboard → SQL Editor**
2. **Open the file**: `supabase/seed_data.sql`
3. **Copy the questions section** (lines for INSERT INTO questions)
4. **Paste and run** in SQL Editor
5. **Verify**: You should see 40 questions created (10 per round)

Or run the entire seed_data.sql file which includes:
- 10 Round 1 questions (Easy)
- 10 Round 2 questions (Medium)
- 10 Round 3 questions (Hard - Semifinal)
- 10 Round 4 questions (Very Hard - Final)

## Step 2: Create Sample Users

### Option A: Using the Script (Recommended)

1. **Make sure you have environment variables set:**
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

2. **Run the script:**
   ```bash
   node scripts/create-sample-users.js
   ```

This will create 10 sample students:
- All with password: `Test123!`
- All approved and ready to participate
- Different grades (8-12) and schools

### Option B: Manual Creation

1. Use the app's signup page to create users
2. Or use the admin creation script
3. Then approve them in the Admin Dashboard

## Step 3: Create a Sample Quiz Session

### Option A: Using the Script (Recommended)

```bash
node scripts/setup-sample-session.js "Practice Quiz"
```

This will:
- Create a quiz session named "Practice Quiz"
- Add 20 questions (Round 1 & 2)
- Add all approved users to the session
- Set time limit to 60 seconds

### Option B: Manual Creation

1. Go to Admin Dashboard → Quiz Control
2. Create a new session with a name
3. Add questions to the session
4. Add users to the session

## Quick Setup (All at Once)

If you want to set everything up quickly:

```bash
# 1. Add questions (via SQL Editor - copy from seed_data.sql)

# 2. Create sample users
node scripts/create-sample-users.js

# 3. Create sample session
node scripts/setup-sample-session.js "Test Quiz"
```

## Sample User Credentials

After running `create-sample-users.js`, you can login with:

| Email | Password | Name | Grade |
|-------|---------|------|-------|
| student1@quiz.test | Test123! | Alice Johnson | 8 |
| student2@quiz.test | Test123! | Bob Smith | 9 |
| student3@quiz.test | Test123! | Charlie Brown | 10 |
| student4@quiz.test | Test123! | Diana Prince | 11 |
| student5@quiz.test | Test123! | Ethan Hunt | 12 |
| student6@quiz.test | Test123! | Fiona Chen | 8 |
| student7@quiz.test | Test123! | George Wilson | 9 |
| student8@quiz.test | Test123! | Hannah Davis | 10 |
| student9@quiz.test | Test123! | Isaac Newton | 11 |
| student10@quiz.test | Test123! | Julia Roberts | 12 |

## Verify Data

After seeding, verify everything is set up:

```sql
-- Check questions
SELECT round_number, COUNT(*) as count 
FROM questions 
GROUP BY round_number;

-- Check approved users
SELECT COUNT(*) as approved_users 
FROM profiles 
WHERE status = 'approved';

-- Check sessions
SELECT id, name, status 
FROM quiz_sessions;
```

## Testing the Quiz

1. **Login as a sample user** (e.g., student1@quiz.test / Test123!)
2. **Go to Dashboard** - you should see available quiz sessions
3. **Join a session** when it's started
4. **Answer questions** and see live results in Admin Dashboard

## Clean Up (Optional)

If you want to remove sample data:

```sql
-- Remove sample users (be careful!)
DELETE FROM auth.users 
WHERE email LIKE '%@quiz.test';

-- Remove sample questions
DELETE FROM questions 
WHERE question_text LIKE '%What is the capital%' 
   OR question_text LIKE '%What is 2 + 2%';

-- Remove sample sessions
DELETE FROM quiz_sessions 
WHERE name LIKE '%Sample%' OR name LIKE '%Practice%';
```

