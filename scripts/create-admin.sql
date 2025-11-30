-- SQL Script to create an admin user
-- 
-- This script should be run in the Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
--
-- IMPORTANT: Replace the placeholders below:
--   - <USER_EMAIL>: The email for the admin user
--   - <USER_PASSWORD>: The password for the admin user
--   - <FULL_NAME>: The full name of the admin user
--
-- After running this script:
--   1. The user will be created in auth.users
--   2. A profile will be automatically created (via trigger)
--   3. The admin role will be assigned
--   4. The profile status will be set to 'approved'

-- Step 1: Create the user in auth.users
-- Note: You'll need to use Supabase's auth.admin.createUser() function
-- or create the user through the Auth UI first, then run the rest of this script

-- If you already have a user, you can skip Step 1 and just run Steps 2-4
-- with the user's UUID

-- Step 2: Get the user ID (replace <USER_EMAIL> with the actual email)
-- Run this to find the user ID:
-- SELECT id FROM auth.users WHERE email = '<USER_EMAIL>';

-- Step 3: Update profile to approved (replace <USER_ID> with the UUID from Step 2)
-- UPDATE public.profiles
-- SET status = 'approved', full_name = '<FULL_NAME>'
-- WHERE id = '<USER_ID>';

-- Step 4: Assign admin role (replace <USER_ID> with the UUID from Step 2)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<USER_ID>', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- COMPLETE EXAMPLE (for an existing user):
-- ============================================
-- 
-- 1. First, find your user ID:
--    SELECT id, email FROM auth.users WHERE email = 'admin@example.com';
--
-- 2. Then run these with the actual UUID:
--    UPDATE public.profiles
--    SET status = 'approved', full_name = 'Admin User'
--    WHERE id = 'YOUR_USER_UUID_HERE';
--
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('YOUR_USER_UUID_HERE', 'admin')
--    ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- ALTERNATIVE: Using Supabase Dashboard
-- ============================================
-- 
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add User" or use an existing user
-- 3. Note the User UUID
-- 4. Go to SQL Editor and run:
--
--    UPDATE public.profiles
--    SET status = 'approved', full_name = 'Admin User'
--    WHERE id = 'YOUR_USER_UUID';
--
--    INSERT INTO public.user_roles (user_id, role)
--    VALUES ('YOUR_USER_UUID', 'admin')
--    ON CONFLICT (user_id, role) DO NOTHING;

