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

async function createMissingTables() {
  console.log('🔧 Creating missing staff_schedules table...')
  
  try {
    // Create staff_schedules table
    const { error } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS staff_schedules (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'break', 'unavailable')),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
        CREATE INDEX IF NOT EXISTS idx_staff_schedules_date_time ON staff_schedules(date, start_time, end_time);
        CREATE INDEX IF NOT EXISTS idx_staff_schedules_status ON staff_schedules(status);
      `
    })

    if (error) {
      console.error('Error creating table:', error)
      return
    }

    console.log('✅ staff_schedules table created')

    // Add sample schedules for existing staff
    console.log('📅 Creating staff schedules...')
    
    // Get existing staff
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id')

    if (staffError || !staff) {
      console.error('Error fetching staff:', staffError)
      return
    }

    console.log(`Found ${staff.length} staff members`)

    // Create schedules for next 30 days (weekdays only)
    const schedules = []
    const startDate = new Date()
    
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      
      // Skip weekends (Sunday = 0, Saturday = 6)
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue
      
      staff.forEach(staffMember => {
        schedules.push({
          staff_id: staffMember.id,
          date: currentDate.toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '18:00',
          status: 'available'
        })
      })
    }

    console.log(`Creating ${schedules.length} schedule entries...`)

    const { error: schedulesError } = await supabase
      .from('staff_schedules')
      .insert(schedules)

    if (schedulesError) {
      console.error('Error creating staff schedules:', schedulesError)
    } else {
      console.log(`✅ Created ${schedules.length} staff schedule entries`)
    }

    console.log('🎉 Database setup complete!')

  } catch (error) {
    console.error('Setup failed:', error)
  }
}

createMissingTables()