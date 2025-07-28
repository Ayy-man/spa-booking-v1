# 🗄️ Supabase Database Setup Guide

## 🚨 Current Issue

Your booking API is failing because the database schema hasn't been applied to your Supabase database yet. The error message indicates that PostgreSQL can't find the relationship between 'bookings' and 'service_id', which means the tables don't exist.

## ✅ What I've Fixed

1. **Fixed TypeScript types** in `/Users/aymanbaig/Desktop/medspav1/src/lib/supabase.ts` to match the actual schema
2. **Created setup scripts** for easy database initialization
3. **Updated helper functions** to use correct table names (`staff_profiles` instead of `staff`)

## 🛠️ Setup Instructions

### Option 1: Manual Setup (Recommended)

1. **Open your Supabase project dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the main database setup**
   - Copy the entire contents of `/Users/aymanbaig/Desktop/medspav1/setup-database.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

4. **Run the functions and optimizations**
   - Copy the entire contents of `/Users/aymanbaig/Desktop/medspav1/complete-database-functions.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

### Option 2: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the schema
supabase db push
```

## 🧪 Test Your Setup

After applying the database schema, test the connection:

```bash
# Install dotenv if not already installed
npm install dotenv

# Run the test script
node test-database-connection.js
```

## 📋 What Gets Created

### Tables
- ✅ `users` - Customer, staff, and admin users
- ✅ `rooms` - Treatment rooms (3 rooms with different capacities)
- ✅ `services` - Available spa services
- ✅ `staff_profiles` - Staff information and specializations
- ✅ `staff_schedules` - Staff availability schedules
- ✅ `bookings` - Customer bookings
- ✅ `booking_history` - Audit trail for booking changes

### Sample Data
- ✅ **3 Rooms**: Serenity Suite (1 bed), Harmony Haven (2 beds), Renewal Retreat (2 beds + drainage)
- ✅ **14 Services**: Massages, facials, body treatments, nail care, wellness
- ✅ **1 Admin User**: admin@medspa.com

### Business Rules Enforced
- ✅ Room 1: Single bed capacity (1 person treatments only)
- ✅ Rooms 2 & 3: Double bed capacity (couples or individual)
- ✅ Body scrubs: ONLY in Room 3 (specialized drainage required)
- ✅ Staff scheduling and availability tracking
- ✅ Booking conflict prevention

### Functions
- ✅ `check_room_availability()` - Verify room availability
- ✅ `check_staff_availability()` - Verify staff availability
- ✅ `validate_service_room_compatibility()` - Enforce room restrictions
- ✅ `get_date_availability_summary()` - DatePicker optimization
- ✅ `get_available_time_slots()` - TimeSlotPicker optimization

### Security
- ✅ Row Level Security (RLS) policies
- ✅ Anonymized staff views for customer data protection
- ✅ Role-based access control

## 🔧 Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚦 Next Steps

1. **Apply the database schema** using one of the methods above
2. **Test the connection** using the test script
3. **Restart your Next.js development server**:
   ```bash
   npm run dev
   ```
4. **Test the booking API** - it should now work without errors

## 🐛 Troubleshooting

### If you get "relation does not exist" errors:
- The schema hasn't been applied yet - run the setup scripts

### If you get "function does not exist" errors:
- Run the `complete-database-functions.sql` script

### If you get authentication errors:
- Check your environment variables
- Ensure RLS policies are properly configured

### If bookings fail with business rule errors:
- Verify sample data was inserted correctly
- Check that rooms and services exist

## 📞 Support

The database schema has been designed specifically for your spa booking system with all the business rules you mentioned. Once applied, your booking API should work perfectly.

**Key Files Created:**
- `/Users/aymanbaig/Desktop/medspav1/setup-database.sql` - Main database schema
- `/Users/aymanbaig/Desktop/medspav1/complete-database-functions.sql` - Functions and optimizations  
- `/Users/aymanbaig/Desktop/medspav1/test-database-connection.js` - Connection test script
- `/Users/aymanbaig/Desktop/medspav1/src/lib/supabase.ts` - Updated TypeScript types

Run the setup scripts in your Supabase SQL Editor and your booking system will be ready to go!