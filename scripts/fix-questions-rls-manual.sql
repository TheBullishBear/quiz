-- Manual SQL script to fix questions RLS policy
-- Run this in Supabase SQL Editor if you prefer not to use migrations

-- Drop the existing participant policy
DROP POLICY IF EXISTS "Participants can view questions without answers" ON public.questions;

-- Create a SECURITY DEFINER function to check if user is approved
-- This bypasses RLS on profiles table, allowing the check to work correctly
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND status = 'approved'
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Participants can view questions without answers"
ON public.questions
FOR SELECT
USING (
  public.is_user_approved(auth.uid())
);

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_approved(UUID) TO authenticated;

-- Verify the policy was created
SELECT 
  pol.polname as policyname,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'questions' 
  AND pol.polname = 'Participants can view questions without answers';

