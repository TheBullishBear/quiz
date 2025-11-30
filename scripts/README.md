# Admin User Creation Guide

This guide will help you create an admin user for the quiz application.

## Method 1: Using the Node.js Script (Recommended)

This script uses the Supabase Admin API to create an admin user automatically.

### Prerequisites

1. You need your Supabase **Service Role Key** (NOT the anon key)
   - Go to your Supabase Dashboard
   - Navigate to: **Settings > API**
   - Copy the `service_role` key (this is a secret key, keep it safe!)

2. Your Supabase URL
   - Found in: **Settings > API > Project URL**

### Steps

1. **Set environment variables:**

   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

   Or if you have a `.env` file, add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. **Run the script:**

   ```bash
   # Interactive mode (will prompt for email, password, name)
   node scripts/create-admin.js

   # Or with arguments
   node scripts/create-admin.js admin@example.com mypassword "Admin Name"
   ```

3. **Login with the credentials:**
   - Use the email and password you provided
   - You should now have admin access!

---

## Method 2: Using SQL (Alternative)

If you prefer to use SQL directly or don't have the service role key:

### Steps

1. **Create a user account:**
   - Go to your Supabase Dashboard
   - Navigate to: **Authentication > Users**
   - Click **"Add User"** or use an existing user
   - Note the **User UUID**

2. **Run SQL in Supabase SQL Editor:**
   - Go to: **SQL Editor > New Query**
   - Run the following SQL (replace `YOUR_USER_UUID` with the actual UUID):

   ```sql
   -- Update profile to approved
   UPDATE public.profiles
   SET status = 'approved', full_name = 'Admin User'
   WHERE id = 'YOUR_USER_UUID';

   -- Assign admin role
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('YOUR_USER_UUID', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

3. **Login with the user credentials:**
   - Use the email/password you created
   - You should now have admin access!

---

## Method 3: Create User via App, Then Promote to Admin

If you've already created a user account through the app:

1. **Login to the app** with your user account
2. **Get your User UUID:**
   - Check the browser console after logging in
   - Or go to Supabase Dashboard > Authentication > Users and find your email
3. **Run the SQL from Method 2** to promote yourself to admin

---

## Troubleshooting

### "Missing required environment variables"
- Make sure you've set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- The service role key is different from the anon/public key

### "User already exists"
- The script will automatically use the existing user and assign the admin role

### "Permission denied" or RLS errors
- Make sure you're using the **service_role** key (not anon key) for the script
- Or use the SQL method through the Supabase Dashboard (which has admin privileges)

### Can't access admin panel after creating admin
- Clear your browser cache and cookies
- Log out and log back in
- Check that the `user_roles` table has your user with role='admin'

---

## Security Notes

⚠️ **Important:**
- The service role key has full database access - keep it secret!
- Never commit the service role key to version control
- Use environment variables or a `.env` file (and add `.env` to `.gitignore`)

