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
  
  const tablesToCheck = ['services', 'rooms', 'users', 'staff_profiles', 'staff_schedules', 'bookings']
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`)
      } else {
        console.log(`✅ ${tableName}: Table exists${data.length > 0 ? ' with data' : ' (empty)'}`)
      }
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message}`)
    }
  }

  // Test services specifically
  console.log('\n🎯 Testing services:')
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('name, category')
    .limit(5)

  if (servicesError) {
    console.error('Services error:', servicesError)
  } else {
    console.log(`Found ${services.length} services:`)
    services.forEach(service => {
      console.log(`  - ${service.name}`)
    })
  }
}

checkTables()