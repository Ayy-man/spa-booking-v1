// Test script to verify Supabase database connection and schema
// Run with: node test-database-connection.js

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase Database Connection...\n');

  // Test 1: Basic connection
  try {
    const { data, error } = await supabase.from('users').select('count').limit(0);
    if (error) {
      console.log('❌ Connection Test: FAILED');
      console.log('Error:', error.message);
      return false;
    }
    console.log('✅ Connection Test: PASSED');
  } catch (err) {
    console.log('❌ Connection Test: FAILED');
    console.log('Error:', err.message);
    return false;
  }

  // Test 2: Check tables exist
  const tables = ['users', 'rooms', 'services', 'staff_profiles', 'staff_schedules', 'bookings', 'booking_history'];
  console.log('\n🔍 Checking database tables...');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(0);
      if (error) {
        console.log(`❌ Table '${table}': NOT FOUND`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': EXISTS`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}': ERROR - ${err.message}`);
    }
  }

  // Test 3: Check sample data
  console.log('\n🔍 Checking sample data...');
  
  try {
    const { data: rooms, error: roomsError } = await supabase.from('rooms').select('*');
    if (roomsError) {
      console.log('❌ Sample Rooms: NOT FOUND');
      console.log('   Error:', roomsError.message);
    } else {
      console.log(`✅ Sample Rooms: ${rooms.length} rooms found`);
      rooms.forEach(room => console.log(`   - Room ${room.number}: ${room.name}`));
    }
  } catch (err) {
    console.log('❌ Sample Rooms: ERROR -', err.message);
  }

  try {
    const { data: services, error: servicesError } = await supabase.from('services').select('*');
    if (servicesError) {
      console.log('❌ Sample Services: NOT FOUND');
      console.log('   Error:', servicesError.message);
    } else {
      console.log(`✅ Sample Services: ${services.length} services found`);
      services.slice(0, 3).forEach(service => console.log(`   - ${service.name} (${service.duration_minutes}min)`));
      if (services.length > 3) console.log(`   - ... and ${services.length - 3} more`);
    }
  } catch (err) {
    console.log('❌ Sample Services: ERROR -', err.message);
  }

  // Test 4: Check functions
  console.log('\n🔍 Checking database functions...');
  
  try {
    const { data, error } = await supabase.rpc('get_date_availability_summary', {
      p_start_date: new Date().toISOString().split('T')[0],
      p_days: 7
    });
    if (error) {
      console.log('❌ Function test: FAILED');
      console.log('   Error:', error.message);
    } else {
      console.log('✅ Function test: PASSED');
      console.log(`   Availability data for next 7 days: ${data.length} entries`);
    }
  } catch (err) {
    console.log('❌ Function test: ERROR -', err.message);
  }

  console.log('\n===============================================');
  console.log('Database Connection Test Complete');
  console.log('===============================================');
}

testDatabaseConnection().catch(console.error);