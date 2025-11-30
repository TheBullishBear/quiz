-- Verify RLS policies on questions table
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'questions';

-- List all policies on questions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'questions'
ORDER BY policyname;

-- Check if the policy allows approved users
-- This should show the policy definition
SELECT 
  policyname,
  pg_get_expr(pol.qual, pol.polrelid) as using_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'questions' AND pol.polname = 'Participants can view questions without answers';

