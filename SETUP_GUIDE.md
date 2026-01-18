# 🚀 Ticketing Management System - Setup Guide

Welcome! Your Ticketing Management System is ready to configure. Follow these steps to get it running.

---

## 📋 Prerequisites

- Node.js installed (v14 or higher)
- A Supabase account ([sign up free](https://supabase.com))

---

## 🔧 Step 1: Set Up Supabase Database

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in your project details:
   - Name: `Ticketing System` (or any name you prefer)
   - Database Password: (choose a strong password)
   - Region: (select closest to you)
4. Click **"Create new project"** and wait for it to initialize

### 1.2 Run the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase-schema.sql` in your project folder
4. **Copy all contents** of that file
5. **Paste** into the Supabase SQL Editor
6. Click **"Run"** (or press `Ctrl+Enter`)
7. You should see success messages

### 1.3 Get Your Supabase Credentials

1. In your Supabase dashboard, click **"Settings"** (gear icon, bottom left)
2. Click **"API"** in the settings menu
3. You'll need two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## 🔐 Step 2: Configure Environment Variables

1. Open the file `.env.local` in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file

---

## 👤 Step 3: Create an Admin Account

You need an admin user to access the admin dashboard.

### Option A: Using Supabase Dashboard (Recommended)

1. In your Supabase dashboard, go to **"Authentication"** (left sidebar)
2. Click **"Users"** tab
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - Email: `admin@example.com` (or your email)
   - Password: (choose a secure password)
   - Check **"Auto Confirm User"**
5. Click **"Create user"**

### Option B: Sign up via the app (after running locally)

1. Start the development server (see Step 4)
2. Navigate to `/admin/login`
3. Use Supabase's sign-up feature (if enabled)

---

## 🚀 Step 4: Run the Application

1. Open your terminal in the project directory
2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to:
   - **http://localhost:5173** (or the port shown in terminal)

---

## ✅ Step 5: Verify Everything Works

### Test Guest Ticket Submission

1. Go to `http://localhost:5173`
2. Fill out the ticket form
3. Submit a ticket
4. You should see a success modal with a Ticket ID

### Test Admin Dashboard

1. Click the ⚙️ settings icon (bottom-right of the ticket form)
2. Log in with your admin credentials
3. You should see the admin dashboard with tabs:
   - **Tickets** - view all submitted tickets
   - **Manage Offices** - add/edit/disable offices
   - **Manage Categories** - add/edit/disable categories

### Test Dynamic Dropdowns

1. In the admin dashboard, go to "Manage Offices"
2. Add a new office (e.g., "Marketing Department")
3. Go back to the ticket form (logout or open in incognito)
4. The new office should appear in the Office dropdown ✅

---

## 🎨 Features Overview

### User Side (Guest)

- ✅ Submit tickets without account
- ✅ Required fields: Name, Office, Category, Subject, Description
- ✅ Optional: Email
- ✅ Priority selection (Low/Medium/High)
- ✅ Instant ticket ID generation
- ✅ Beautiful, modern UI

### Admin Dashboard

- ✅ Secure login with Supabase Auth
- ✅ View all tickets in searchable table
- ✅ Click ticket to view full details
- ✅ Update ticket status (Open → In Progress → Resolved → Closed)
- ✅ Manage Offices (add, edit, enable/disable, delete)
- ✅ Manage Categories (add, edit, enable/disable, delete)
- ✅ Only active offices/categories show in ticket form

---

## 🐛 Troubleshooting

### Dropdowns are empty in ticket form

- Make sure you ran the SQL schema (it includes sample data)
- Check that offices/categories are marked as "Active" in admin panel
- Verify your Supabase credentials in `.env.local`

### Can't log in as admin

- Make sure you created an admin user in Supabase Authentication
- Check that email/password are correct
- Verify `.env.local` has correct credentials

### Changes not reflecting

- Restart the dev server (`Ctrl+C` then `npm run dev` again)
- Hard refresh your browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)

### Database errors

- Check the browser console for detailed error messages
- Verify RLS policies are set up correctly (they're in the schema)
- Make sure all tables were created successfully

---

## 📦 Optional: File Attachments

The database has support for file attachments, but Supabase Storage needs to be configured:

1. In Supabase dashboard, go to **Storage**
2. Create a new bucket called `ticket-attachments`
3. Set appropriate permissions (public or private)
4. Update the ticket form to include file upload functionality

---

## 🎉 You're All Set!

Your Ticketing Management System is now fully functional. Enjoy managing tickets with style!

**Next Steps:**

- Customize the design/branding
- Add email notifications (using Supabase Edge Functions)
- Deploy to production (Vercel, Netlify, etc.)

---

## 📞 Need Help?

If you encounter any issues, check:

1. Browser console for JavaScript errors
2. Supabase dashboard → SQL Editor for database errors
3. Make sure all environment variables are set correctly
