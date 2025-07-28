const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  const envPath = '.env.local';
  const envVars = {};
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  return envVars;
}

async function testHotStoneBooking() {
  console.log('🔥 TESTING HOT STONE MASSAGE BOOKING');
  console.log('=====================================');
  
  try {
    const env = loadEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // 1. Find Hot Stone service
    const { data: hotStoneServices, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .ilike('name', '%hot stone%')
      .eq('is_active', true);
    
    if (serviceError || !hotStoneServices?.length) {
      console.log('❌ Hot Stone services not found:', serviceError?.message);
      return;
    }
    
    console.log('✅ Found Hot Stone services:', hotStoneServices.length);
    hotStoneServices.forEach(s => console.log('   -', s.name, `(${s.duration_minutes}min, $${s.price})`));
    
    // 2. Check staff schedules
    const today = new Date().toISOString().split('T')[0];
    const { data: schedules, error: scheduleError } = await supabase
      .from('staff_schedules')
      .select('*')
      .eq('date', today)
      .eq('status', 'available');
    
    if (scheduleError) {
      console.log('❌ Staff schedule error:', scheduleError.message);
      return;
    }
    
    console.log(`✅ Staff schedules for ${today}: ${schedules?.length || 0} available`);
    
    // 3. Test availability function
    const { data: availability, error: availError } = await supabase
      .rpc('get_date_availability_summary', {
        p_start_date: today,
        p_days: 1
      });
    
    if (availError) {
      console.log('❌ Availability function error:', availError.message);
      console.log('⚠️  Database functions may need to be run in Supabase SQL Editor');
      console.log('📝 Run the SQL from: fix-database-functions.sql');
      return;
    }
    
    console.log('✅ Availability function working:', availability);
    
    // 4. Test time slots function
    console.log('\n🕐 Testing time slot generation...');
    const { data: timeSlots, error: timeError } = await supabase
      .rpc('get_available_time_slots', {
        p_date: today,
        p_service_id: hotStoneServices[0].id
      });
    
    if (timeError) {
      console.log('❌ Time slots function error:', timeError.message);
      console.log('⚠️  Database functions may need to be run in Supabase SQL Editor');
      return;
    }
    
    const availableSlots = timeSlots?.filter(slot => slot.is_available) || [];
    console.log(`✅ Time slots working: ${availableSlots.length} available slots today`);
    
    // 5. Success summary
    console.log('\n🎉 HOT STONE SERVICES ARE READY!');
    console.log('✅ Services: Found', hotStoneServices.length, 'Hot Stone variants');
    console.log(`✅ Staff: ${schedules?.length || 0} available on ${today}`);
    console.log(`✅ Time Slots: ${availableSlots.length} available today`);
    console.log('✅ Infrastructure: Complete and working');
    console.log('\n🚀 Ready to test in UI:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Visit: http://localhost:3000');
    console.log('   3. Try booking a Hot Stone Massage');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testHotStoneBooking();