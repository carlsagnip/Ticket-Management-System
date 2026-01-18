# 🐛 Debugging: "Failed to submit ticket" Error

## Problem Identified

The error **"Failed to submit ticket. Please try again."** is occurring because the Supabase anon key in your `.env.local` file appears to be invalid or incomplete.

---

## Current Configuration Issue

Your `.env.local` currently has:

```env
VITE_SUPABASE_ANON_KEY=sb_publishable_nKiHOxWyZXIeBPuV6i3JsA_OqkH7bLo
```

**This is incorrect!** The Supabase anon key should be:

- Much longer (200+ characters)
- Start with `eyJ...`
- Look something like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzYWZrYnl...` (continues for 200+ chars)

---

## How to Fix This

### Step 1: Get the Correct Anon Key

1. Go to your Supabase project dashboard: https://app.supabase.com/project/ssafkbybzbfwvsvxdxll
2. Click **Settings** (gear icon, bottom left sidebar)

3. Click **API** in the settings menu

4. Scroll down to **"Project API keys"** section

5. Find the key labeled **"anon" / "public"**
   - ⚠️ **NOT** the "service_role" key!
   - ⚠️ **NOT** the "publishable" key!
6. Copy the **entire** anon key (it's very long - make sure you got all of it)

### Step 2: Update Your .env.local File

Replace line 6 in your `.env.local` with the correct key:

```env
VITE_SUPABASE_URL=https://ssafkbybzbfwvsvxdxll.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.... (paste the full key here)
```

### Step 3: Restart the Dev Server

**IMPORTANT!** Vite only loads environment variables on startup.

1. In your terminal, press `Ctrl+C` to stop the dev server
2. Run `npm run dev` again
3. The new credentials will now be loaded

---

## How to Verify It's Fixed

After restarting:

1. Open http://localhost:5173 in your browser
2. Fill out the ticket form
3. Click Submit
4. You should see the success modal with a Ticket ID (like `TCKT-0001`)

---

## Still Having Issues?

If you still get errors after fixing the key, check the browser console:

### Open Browser Console:

- Press `F12` or `Ctrl+Shift+I`
- Click the **Console** tab
- Submit the form again
- Look for red error messages

### Common Additional Issues:

**1. RLS Policy Error**
If you see: `"new row violates row-level security policy"`

- This means the SQL schema wasn't run correctly
- Re-run the entire `supabase-schema.sql` in Supabase SQL Editor

**2. Column Error**
If you see: `"column does not exist"`

- Check that all tables were created
- Go to Supabase → Table Editor → verify `tickets`, `offices`, `categories` tables exist

**3. Network Error / CORS**  
If you see: `"Failed to fetch"` or CORS errors

- Verify your Supabase URL is correct
- Make sure your project is not paused/deleted

---

## Quick Test: Verify Supabase Connection

Open browser console (F12) and paste this code:

```javascript
// Test if anon key is valid
console.log("Testing Supabase connection...");
fetch("https://ssafkbybzbfwvsvxdxll.supabase.co/rest/v1/", {
  headers: {
    apikey: "YOUR_ANON_KEY_HERE",
    Authorization: "Bearer YOUR_ANON_KEY_HERE",
  },
})
  .then((r) => r.json())
  .then((d) => console.log("✅ Connection working!", d))
  .catch((e) => console.error("❌ Connection failed:", e));
```

Replace `YOUR_ANON_KEY_HERE` with your actual anon key and run it.

- ✅ If successful: You'll see connection data
- ❌ If failed: The key or URL is wrong

---

## Summary

**The fix:**

1. Get the correct `anon` key from Supabase dashboard (it's very long!)
2. Update `.env.local` with the full key
3. Restart dev server with `npm run dev`
4. Test the form again

The anon key you have now (`sb_publishable_...`) is definitely not the right one, which is why inserts are failing even though reads (dropdowns) might be working.
