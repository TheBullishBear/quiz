# Vercel Deployment Guide

This guide will help you troubleshoot common issues when deploying the quiz application to Vercel.

## Environment Variables Setup

### Required Environment Variables

The application requires the following environment variables to be set in Vercel:

1. **VITE_SUPABASE_URL**
   - Your Supabase project URL
   - Format: `https://your-project-id.supabase.co`
   - Found in: Supabase Dashboard > Settings > API > Project URL

2. **VITE_SUPABASE_PUBLISHABLE_KEY**
   - Your Supabase anon/public key (NOT the service_role key)
   - Found in: Supabase Dashboard > Settings > API > Project API keys > `anon` `public`
   - This is the publishable key that's safe to expose in client-side code

### ⚠️ Important: VITE_ Prefix

**CRITICAL**: In Vite applications, environment variables that need to be exposed to the client-side code **MUST** be prefixed with `VITE_`.

- ✅ **Correct**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- ❌ **Incorrect**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY` (without VITE_)

### Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variables:

   ```
   Name: VITE_SUPABASE_URL
   Value: https://your-project-id.supabase.co
   
   Name: VITE_SUPABASE_PUBLISHABLE_KEY
   Value: your-anon-public-key-here
   ```

4. **Important**: Make sure to set these for all environments (Production, Preview, Development)
5. After adding/updating variables, **redeploy your application** for changes to take effect

## Common Issues and Solutions

### Issue 1: Cannot Login / Authentication Fails

**Symptoms:**
- Login form submits but nothing happens
- Error messages about network errors
- "Invalid email or password" even with correct credentials

**Possible Causes:**

1. **Missing or Incorrect Environment Variables**
   - Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in Vercel
   - Verify the variable names have the `VITE_` prefix
   - Ensure values match your Supabase project

2. **Admin User Doesn't Exist in Production**
   - The admin user must be created in your production Supabase instance
   - Local admin users won't work on the deployed app
   - See "Creating Admin User in Production" below

3. **Wrong Supabase Project**
   - Ensure you're using the correct Supabase project URL and keys
   - Production should use production Supabase, not local/staging

**Solution:**
1. Verify environment variables in Vercel dashboard
2. Check browser console for errors (F12 > Console)
3. Verify Supabase project URL and keys are correct
4. Create admin user in production Supabase instance
5. Redeploy after making changes

### Issue 2: "Missing required environment variables" Error

**Cause:** Environment variables are not set or not prefixed with `VITE_`

**Solution:**
1. Go to Vercel > Settings > Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Ensure they're set for Production environment
4. Redeploy the application

### Issue 3: Admin Login Works Locally But Not on Vercel

**Cause:** Admin user exists only in local Supabase, not in production

**Solution:** Create the admin user in your production Supabase instance (see below)

## Creating Admin User in Production

The admin user must be created in your **production Supabase instance**, not just locally.

### Method 1: Using the Script (Recommended)

1. **Get your production Supabase credentials:**
   - Service Role Key: Supabase Dashboard > Settings > API > `service_role` key (secret)
   - Project URL: Supabase Dashboard > Settings > API > Project URL

2. **Set environment variables locally:**
   ```bash
   export VITE_SUPABASE_URL="https://your-production-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. **Run the admin creation script:**
   ```bash
   node scripts/create-admin.js admin@example.com your-password "Admin Name"
   ```

4. **Verify in Supabase Dashboard:**
   - Go to Authentication > Users
   - Confirm the admin user exists
   - Check that the user has an entry in the `user_roles` table with `role='admin'`

### Method 2: Using Supabase Dashboard + SQL

1. **Create user in Supabase Dashboard:**
   - Go to Authentication > Users > Add User
   - Enter email and password
   - Note the User UUID

2. **Run SQL in Supabase SQL Editor:**
   ```sql
   -- Replace YOUR_USER_UUID with the actual UUID from step 1
   UPDATE public.profiles
   SET status = 'approved', full_name = 'Admin User'
   WHERE id = 'YOUR_USER_UUID';

   INSERT INTO public.user_roles (user_id, role)
   VALUES ('YOUR_USER_UUID', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

3. **Test login** with the credentials you created

## Verifying Configuration

### Check Environment Variables

1. After deployment, check the browser console (F12)
2. Look for any errors about missing environment variables
3. The app will throw an error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are missing

### Test Supabase Connection

1. Open browser console on your deployed app
2. Try logging in
3. Check for network errors in the Network tab
4. Verify requests are going to the correct Supabase URL

## Deployment Checklist

Before deploying to Vercel, ensure:

- [ ] `VITE_SUPABASE_URL` is set in Vercel environment variables
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` is set in Vercel environment variables
- [ ] Both variables have the `VITE_` prefix
- [ ] Variables are set for Production environment
- [ ] Admin user exists in production Supabase instance
- [ ] Admin user has `admin` role in `user_roles` table
- [ ] Admin user's profile status is `approved`
- [ ] After setting variables, you've redeployed the application

## Troubleshooting Steps

1. **Check Vercel Environment Variables:**
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` exist
   - Check they're enabled for Production

2. **Check Browser Console:**
   - Open deployed app
   - Press F12 to open DevTools
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Verify Supabase Configuration:**
   - Confirm Supabase project URL is correct
   - Verify the anon/public key is correct (not service_role key)
   - Check Supabase project is active and accessible

4. **Verify Admin User:**
   - Check Supabase Dashboard > Authentication > Users
   - Verify admin user exists
   - Check `user_roles` table has entry with `role='admin'`

5. **Redeploy:**
   - After making any changes, trigger a new deployment
   - Environment variable changes require a redeploy

## Getting Help

If you're still experiencing issues:

1. Check the browser console for specific error messages
2. Verify all environment variables are correctly set
3. Ensure admin user exists in production Supabase
4. Check Vercel deployment logs for build errors
5. Verify Supabase project is accessible and not paused

## Security Notes

⚠️ **Important Security Reminders:**

- Never commit `.env` files to version control
- The `VITE_SUPABASE_PUBLISHABLE_KEY` is safe to expose (it's the anon key)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Use environment variables, never hardcode credentials

