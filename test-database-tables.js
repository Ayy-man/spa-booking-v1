const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local')
  const envVars = {}
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })
  }
  
  return envVars
}

const env = loadEnv()

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTables() {
  console.log('🔍 Checking database tables...')
  
  // Check what tables exist
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name')

  if (error) {
    console.error('Error checking tables:', error)
    return
  }

  console.log('📋 Available tables:')
  tables.forEach(table => {
    console.log(`  - ${table.table_name}`)
  })

  // Check services specifically
  console.log('\n🎯 Testing services table:')
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, category')
    .limit(3)

  if (servicesError) {
    console.error('Services error:', servicesError)
  } else {
    console.log(`✅ Found ${services.length} services:`)
    services.forEach(service => {
      console.log(`  - ${service.name} (${service.category})`)
    })
  }

  // Check rooms
  console.log('\n🏠 Testing rooms table:')
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, name, number')
    .limit(3)

  if (roomsError) {
    console.error('Rooms error:', roomsError)
  } else {
    console.log(`✅ Found ${rooms.length} rooms:`)
    rooms.forEach(room => {
      console.log(`  - ${room.name} (Room ${room.number})`)
    })
  }

  // Check staff_profiles
  console.log('\n👥 Testing staff_profiles table:')
  const { data: staff, error: staffError } = await supabase
    .from('staff_profiles')
    .select('id, employee_id')
    .limit(3)

  if (staffError) {
    console.error('Staff profiles error:', staffError)
  } else {
    console.log(`✅ Found ${staff.length} staff members:`)
    staff.forEach(s => {
      console.log(`  - ${s.employee_id}`)
    })
  }

  // Check staff_schedules  
  console.log('\n📅 Testing staff_schedules table:')
  const { data: schedules, error: schedulesError } = await supabase
    .from('staff_schedules')
    .select('staff_id, date, status')
    .limit(3)

  if (schedulesError) {
    console.error('Staff schedules error:', schedulesError)
  } else {
    console.log(`✅ Found ${schedules.length} schedule entries`)
  }
}

checkTables()