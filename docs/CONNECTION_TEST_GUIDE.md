# Connection Test Guide

This guide explains how to test if your Vercel deployment is successfully connected to Supabase.

## Quick Test

The easiest way to test your connection is to visit the connection test page:

**URL:** `https://your-vercel-app.vercel.app/test-connection`

Simply navigate to this URL in your browser and click "Run Tests" to verify all connections.

### Troubleshooting: Page Not Found (404)

If you get a 404 error when accessing `/test-connection` on Vercel:

1. **Check for `vercel.json` file:**
   - The project root should have a `vercel.json` file
   - This file is required for client-side routing to work on Vercel

2. **Verify `vercel.json` content:**
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

3. **Redeploy after adding `vercel.json`:**
   - Commit the `vercel.json` file to your repository
   - Vercel will automatically redeploy, or trigger a manual redeploy

4. **Check Vercel build logs:**
   - Ensure the build completes successfully
   - Check that `vercel.json` is included in the deployment

## What Gets Tested

The connection test page automatically checks:

1. **Environment Variables**
   - Verifies `VITE_SUPABASE_URL` is set
   - Verifies `VITE_SUPABASE_PUBLISHABLE_KEY` is set
   - Shows the configured values (key is partially masked for security)

2. **Supabase Client Initialization**
   - Confirms the Supabase client was created successfully
   - Checks that the client is not null or undefined

3. **Authentication Service**
   - Tests connection to Supabase Auth
   - Verifies authentication endpoints are reachable
   - Shows current session status

4. **Database Connection**
   - Tests basic database connectivity
   - Attempts a simple query to verify connection
   - Handles RLS (Row Level Security) appropriately

5. **Network Connectivity**
   - Measures latency to Supabase servers
   - Verifies network requests can reach Supabase
   - Tests HTTP connectivity

6. **Authenticated Query** (if logged in)
   - Tests database queries with authentication
   - Verifies RLS policies work correctly
   - Shows user profile information if available

## Understanding Test Results

### ✅ Success (Green)
- The test passed successfully
- That component is working correctly

### ❌ Error (Red)
- The test failed
- Check the error message and details
- See troubleshooting section below

### ⏳ Testing (Blue)
- Test is currently running
- Wait for it to complete

## Common Issues and Solutions

### "Missing environment variables"
**Solution:**
1. Go to Vercel Dashboard > Settings > Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Ensure they have the `VITE_` prefix
4. Redeploy your application

### "Failed to connect to authentication service"
**Possible causes:**
- Wrong Supabase URL
- Wrong API key
- Network/firewall blocking connection
- Supabase project is paused

**Solution:**
1. Verify Supabase URL in Vercel matches your Supabase project
2. Check that you're using the `anon`/`public` key (not service_role)
3. Verify Supabase project is active in Supabase Dashboard
4. Check browser console for detailed error messages

### "Failed to connect to database"
**Possible causes:**
- Database connection issue
- RLS policies blocking access (this is normal if not logged in)
- Wrong Supabase credentials

**Solution:**
1. If you see "RLS blocking query - expected", this is normal when not logged in
2. Try logging in first, then run the test again
3. Verify Supabase project is active
4. Check Supabase Dashboard for any service issues

### "Network connection failed"
**Possible causes:**
- Internet connectivity issue
- Firewall blocking Supabase
- Wrong Supabase URL

**Solution:**
1. Check your internet connection
2. Verify Supabase URL is correct
3. Try accessing Supabase Dashboard to confirm it's reachable
4. Check if corporate firewall is blocking connections

## Manual Testing Methods

If you prefer to test manually, here are alternative methods:

### Method 1: Browser Console

1. Open your deployed app
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for any Supabase-related errors
5. Check Network tab for failed requests to Supabase

### Method 2: Try Logging In

1. Navigate to your deployed app
2. Try to log in with test credentials
3. If login fails, check:
   - Browser console for errors
   - Network tab for failed requests
   - Error messages displayed in the UI

### Method 3: Check Environment Variables

1. Open browser console on deployed app
2. Type: `console.log(import.meta.env.VITE_SUPABASE_URL)`
3. Should show your Supabase URL (not undefined)
4. Type: `console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)`
5. Should show your API key (not undefined)

**Note:** If these show `undefined`, your environment variables are not set correctly in Vercel.

## Best Practices

1. **Test after every deployment** - Especially after changing environment variables
2. **Test in production** - Use the production Supabase instance for production tests
3. **Keep test page accessible** - Don't remove the `/test-connection` route in production
4. **Check regularly** - Run tests periodically to catch issues early

## Security Note

The connection test page is safe to use in production. It:
- Only reads environment variables (doesn't expose secrets)
- Only performs read operations
- Doesn't modify any data
- Shows masked API keys (only last 4 characters)

However, you may want to restrict access to this page in production if you prefer.

## Next Steps

After confirming your connection works:

1. ✅ Create admin user in production Supabase
2. ✅ Test admin login functionality
3. ✅ Verify database queries work correctly
4. ✅ Test full application workflow

For more information, see:
- `VERCEL_DEPLOYMENT.md` - Complete deployment guide
- `TROUBLESHOOTING.md` - General troubleshooting

