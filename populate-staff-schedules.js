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

async function populateStaffSchedules() {
  console.log('📅 Populating staff schedules after table creation...')
  
  try {
    // Get existing staff
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, employee_id')

    if (staffError || !staff) {
      console.error('Error fetching staff:', staffError)
      return
    }

    console.log(`Found ${staff.length} staff members:`)
    staff.forEach(s => console.log(`  - ${s.employee_id}`))

    // Clear existing schedules first
    console.log('🧹 Clearing existing schedules...')
    const { error: clearError } = await supabase
      .from('staff_schedules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (clearError) {
      console.error('Error clearing schedules:', clearError)
    }

    // Create schedules for next 30 days (weekdays only)
    const schedules = []
    const startDate = new Date()
    
    console.log('📋 Creating schedule entries...')
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

    console.log(`📝 Inserting ${schedules.length} schedule entries...`)

    // Insert in batches of 50 to avoid timeout
    const batchSize = 50
    let successCount = 0
    
    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize)
      
      const { error: insertError } = await supabase
        .from('staff_schedules')
        .insert(batch)

      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError)
        return
      }
      
      successCount += batch.length
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(schedules.length/batchSize)} (${successCount}/${schedules.length})`)
    }

    console.log(`🎉 Successfully created ${successCount} staff schedule entries`)
    
    // Verify the data
    const { data: verifySchedules, error: verifyError } = await supabase
      .from('staff_schedules')
      .select('date')
      .limit(5)

    if (verifyError) {
      console.error('❌ Error verifying schedules:', verifyError)
    } else {
      console.log(`✅ Verification: Found ${verifySchedules.length} schedule entries`)
      console.log('📅 Sample dates:', verifySchedules.map(s => s.date))
    }

    return true

  } catch (error) {
    console.error('💥 Error populating staff schedules:', error)
    return false
  }
}

async function testAvailabilityAfterFix() {
  console.log('\n🧪 Testing availability system...')
  
  try {
    // Test date availability
    const today = new Date().toISOString().split('T')[0]
    const response = await fetch(`http://localhost:3000/api/availability`)
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Date availability API working')
      console.log(`📊 Today (${today}): ${data.data.dateAvailability[0]?.availableSlots || 0} slots available`)
    } else {
      console.log('❌ Date availability API failed:', data.error)
    }
    
    // Test time slot availability
    const timeResponse = await fetch(`http://localhost:3000/api/availability?date=${today}`)
    const timeData = await timeResponse.json()
    
    if (timeData.success) {
      console.log('✅ Time slot availability API working')
      console.log(`⏰ Available time slots: ${timeData.data.availableSlots}`)
    } else {
      console.log('❌ Time slot availability API failed:', timeData.error)
    }
    
  } catch (error) {
    console.error('🔥 Error testing availability:', error.message)
  }
}

async function main() {
  const success = await populateStaffSchedules()
  
  if (success) {
    console.log('\n🎯 Staff schedules populated successfully!')
    console.log('🚀 Testing availability system...')
    await testAvailabilityAfterFix()
    console.log('\n✅ Infrastructure fix complete!')
  } else {
    console.log('\n❌ Failed to populate staff schedules')
  }
}

main()