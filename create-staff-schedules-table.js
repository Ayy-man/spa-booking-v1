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

async function createStaffSchedulesTable() {
  console.log('🔧 Creating staff_schedules table and data...')
  
  try {
    // First, let's create the table using a direct insert approach
    // Since we can't execute DDL via RPC, we'll use a workaround
    
    // Check if table exists by trying to query it
    const { data, error } = await supabase
      .from('staff_schedules')
      .select('*')
      .limit(1)

    if (!error) {
      console.log('✅ staff_schedules table already exists')
      return
    }

    if (error && error.code === '42P01') {
      console.log('❌ staff_schedules table does not exist')
      console.log('⚠️  Need to create table via Supabase dashboard or direct SQL')
      console.log('')
      console.log('🔨 SQL to run in Supabase SQL Editor:')
      console.log(`
CREATE TABLE public.staff_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  staff_id uuid NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  status character varying DEFAULT 'available'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT staff_schedules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  CONSTRAINT staff_schedules_status_check CHECK (status IN ('available', 'booked', 'break', 'unavailable'))
);

-- Create indexes for performance
CREATE INDEX idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
CREATE INDEX idx_staff_schedules_date_time ON staff_schedules(date, start_time, end_time);
CREATE INDEX idx_staff_schedules_status ON staff_schedules(status);
      `)
      
      return false
    }

    console.log('✅ Table creation check complete')
    return true
    
  } catch (error) {
    console.error('Error checking staff_schedules table:', error)
    return false
  }
}

async function populateStaffSchedules() {
  console.log('📅 Populating staff schedules...')
  
  try {
    // Get existing staff
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id')

    if (staffError || !staff) {
      console.error('Error fetching staff:', staffError)
      return
    }

    console.log(`Found ${staff.length} staff members`)

    // Clear existing schedules
    const { error: clearError } = await supabase
      .from('staff_schedules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (clearError) {
      console.error('Error clearing schedules:', clearError)
      return
    }

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

    // Insert in batches of 100
    const batchSize = 100
    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('staff_schedules')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${i}-${i + batchSize}:`, insertError)
        return
      }
    }

    console.log(`✅ Created ${schedules.length} staff schedule entries`)
    return true

  } catch (error) {
    console.error('Error populating staff schedules:', error)
    return false
  }
}

async function main() {
  const tableExists = await createStaffSchedulesTable()
  
  if (tableExists !== false) {
    await populateStaffSchedules()
  }
}

main()