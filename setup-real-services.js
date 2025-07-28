const { createClient } = require('@supabase/supabase-js')

// Load environment variables manually
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

const services = [
  // Facial Services
  { name: 'Basic Facial (For Men & Women)', description: 'Gentle cleansing and moisturizing facial suitable for all skin types', duration: 30, price: 65.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Deep Cleansing Facial (for Men & Women)', description: 'Intensive cleansing treatment for deep pore purification', duration: 60, price: 79.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Placenta | Collagen Facial', description: 'Rejuvenating facial with placenta and collagen treatment', duration: 60, price: 90.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Whitening Kojic Facial', description: 'Brightening facial treatment with kojic acid', duration: 60, price: 90.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Anti-Acne Facial (for Men & Women)', description: 'Specialized treatment for acne-prone skin', duration: 60, price: 90.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Microderm Facial', description: 'Microdermabrasion facial for skin resurfacing', duration: 60, price: 99.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Vitamin C Facial with Extreme Softness', description: 'Vitamin C infused facial for radiant, soft skin', duration: 60, price: 120.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Acne Vulgaris Facial', description: 'Medical-grade treatment for severe acne', duration: 60, price: 120.00, category: 'facial', requires_specialized_drainage: false, min_room_capacity: 1 },

  // Package Deals
  { name: 'Balinese Body Massage + Basic Facial', description: 'Relaxing massage and facial combination', duration: 90, price: 130.00, category: 'wellness', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Deep Tissue Body Massage + 3Face', description: 'Intensive massage with triple facial treatment', duration: 120, price: 180.00, category: 'wellness', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Hot Stone Body Massage + Microderm Facial', description: 'Hot stone therapy with skin resurfacing facial', duration: 150, price: 200.00, category: 'wellness', requires_specialized_drainage: false, min_room_capacity: 1 },

  // Massage Services
  { name: 'Balinese Body Massage', description: 'Traditional Balinese massage technique', duration: 60, price: 80.00, category: 'massage', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Maternity Massage', description: 'Gentle massage designed for expecting mothers', duration: 60, price: 85.00, category: 'massage', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Stretching Body Massage', description: 'Massage incorporating assisted stretching', duration: 60, price: 85.00, category: 'massage', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Deep Tissue Body Massage', description: 'Intensive massage targeting deep muscle layers', duration: 60, price: 90.00, category: 'massage', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Hot Stone Massage', description: 'Relaxing massage using heated stones', duration: 60, price: 90.00, category: 'massage', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Hot Stone Massage 90 Minutes', description: 'Extended hot stone therapy session', duration: 90, price: 120.00, category: 'massage', requires_specialized_drainage: false, min_room_capacity: 1 },

  // Body Treatments
  { name: 'Underarm Cleaning', description: 'Deep cleaning treatment for underarm area', duration: 30, price: 99.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Back Treatment', description: 'Cleansing and purifying treatment for back', duration: 30, price: 99.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Chemical Peel (Body) Per Area', description: 'Chemical exfoliation treatment per body area', duration: 30, price: 85.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Underarm or Inguinal Whitening', description: 'Skin lightening treatment for sensitive areas', duration: 30, price: 150.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Basic Vajacial Cleaning + Brazilian Wax', description: 'Intimate area treatment with waxing', duration: 30, price: 90.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Microdermabrasion (Body) Per Area', description: 'Body skin resurfacing treatment', duration: 30, price: 85.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Deep Moisturizing Body Treatment', description: 'Intensive hydration for dry skin', duration: 30, price: 65.00, category: 'body_treatment', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Dead Sea Salt Body Scrub + Deep Moisturizing', description: 'Exfoliating scrub with moisturizing treatment', duration: 30, price: 65.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Mud Mask Body Wrap + Deep Moisturizing Body Treatment', description: 'Detoxifying mud wrap with hydration', duration: 30, price: 65.00, category: 'body_treatment', requires_specialized_drainage: true, min_room_capacity: 1 },

  // Hair Removal Services
  { name: 'Eyebrow Waxing', description: 'Precise eyebrow shaping with wax', duration: 15, price: 20.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Lip Waxing', description: 'Upper lip hair removal', duration: 5, price: 10.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Half Arm Waxing', description: 'Hair removal for lower arms', duration: 15, price: 40.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Full Arm Waxing', description: 'Complete arm hair removal', duration: 30, price: 60.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Chin Waxing', description: 'Chin area hair removal', duration: 5, price: 12.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Neck Waxing', description: 'Neck area hair removal', duration: 15, price: 30.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Lower Leg Waxing', description: 'Hair removal below the knee', duration: 30, price: 40.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Full Leg Waxing', description: 'Complete leg hair removal', duration: 60, price: 80.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Full Face Waxing', description: 'Complete facial hair removal', duration: 30, price: 60.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Bikini Waxing', description: 'Bikini line hair removal', duration: 30, price: 35.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Underarm Waxing', description: 'Underarm hair removal', duration: 15, price: 20.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Brazilian Wax ( Women )', description: 'Complete intimate waxing for women', duration: 45, price: 60.00, category: 'hair_removal', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Brazilian Waxing ( Men)', description: 'Complete intimate waxing for men', duration: 45, price: 75.00, category: 'hair_removal', requires_specialized_drainage: true, min_room_capacity: 1 },
  { name: 'Chest Wax', description: 'Chest hair removal', duration: 30, price: 40.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Stomach Wax', description: 'Stomach area hair removal', duration: 30, price: 40.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Shoulders', description: 'Shoulder area hair removal', duration: 30, price: 30.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },
  { name: 'Feet', description: 'Foot hair removal', duration: 5, price: 30.00, category: 'hair_removal', requires_specialized_drainage: false, min_room_capacity: 1 },

  // Membership
  { name: 'Dermal VIP Card $50 / Year', description: 'Annual VIP membership with exclusive benefits', duration: 30, price: 50.00, category: 'wellness', requires_specialized_drainage: false, min_room_capacity: 1 }
]

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...')
    
    // Clear existing services
    console.log('1. Clearing existing services...')
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (deleteError) {
      console.error('Error clearing services:', deleteError)
      return
    }

    // Insert real services
    console.log('2. Inserting real spa services...')
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .insert(services.map(service => ({
        name: service.name,
        description: service.description,
        duration_minutes: service.duration,
        price: service.price,
        category: service.category,
        requires_specialized_drainage: service.requires_specialized_drainage,
        min_room_capacity: service.min_room_capacity,
        is_active: true
      })))
      .select()

    if (servicesError) {
      console.error('Error inserting services:', servicesError)
      return
    }

    console.log(`✅ Inserted ${servicesData.length} services`)

    // Check if rooms exist
    console.log('3. Checking rooms...')
    const { data: existingRooms } = await supabase
      .from('rooms')
      .select('*')

    if (!existingRooms || existingRooms.length === 0) {
      console.log('4. Creating sample rooms...')
      const rooms = [
        { name: 'Serenity Suite', number: 101, bed_capacity: 1, has_shower: true, has_specialized_drainage: false, equipment: { massage_table: true, sound_system: true }, is_active: true },
        { name: 'Harmony Room', number: 102, bed_capacity: 1, has_shower: true, has_specialized_drainage: false, equipment: { massage_table: true, aromatherapy: true }, is_active: true },
        { name: 'Tranquil Space', number: 103, bed_capacity: 2, has_shower: true, has_specialized_drainage: true, equipment: { massage_tables: 2, specialized_equipment: true }, is_active: true },
        { name: 'Wellness Chamber', number: 104, bed_capacity: 1, has_shower: true, has_specialized_drainage: true, equipment: { facial_bed: true, steamer: true }, is_active: true },
        { name: 'Spa Deluxe', number: 105, bed_capacity: 2, has_shower: true, has_specialized_drainage: true, equipment: { massage_tables: 2, hydrotherapy: true }, is_active: true }
      ]

      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .insert(rooms)
        .select()

      if (roomsError) {
        console.error('Error inserting rooms:', roomsError)
      } else {
        console.log(`✅ Created ${roomsData.length} rooms`)
      }
    } else {
      console.log(`✅ Found ${existingRooms.length} existing rooms`)
    }

    // Check if staff exist
    console.log('5. Checking staff...')
    const { data: existingStaff } = await supabase
      .from('staff_profiles')
      .select('*')

    if (!existingStaff || existingStaff.length === 0) {
      console.log('6. Creating sample staff...')
      
      // First create users
      const staffUsers = [
        { email: 'sarah.johnson@spa.com', first_name: 'Sarah', last_name: 'Johnson', phone: '555-0101', role: 'staff', is_active: true },
        { email: 'michael.chen@spa.com', first_name: 'Michael', last_name: 'Chen', phone: '555-0102', role: 'staff', is_active: true },
        { email: 'emma.williams@spa.com', first_name: 'Emma', last_name: 'Williams', phone: '555-0103', role: 'staff', is_active: true },
        { email: 'david.garcia@spa.com', first_name: 'David', last_name: 'Garcia', phone: '555-0104', role: 'staff', is_active: true },
        { email: 'lisa.anderson@spa.com', first_name: 'Lisa', last_name: 'Anderson', phone: '555-0105', role: 'staff', is_active: true }
      ]

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .insert(staffUsers)
        .select()

      if (usersError) {
        console.error('Error creating staff users:', usersError)
        return
      }

      // Then create staff profiles
      const staffProfiles = usersData.map((user, index) => ({
        user_id: user.id,
        employee_id: `EMP${String(index + 1).padStart(3, '0')}`,
        hire_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
        specializations: ['massage', 'facial', 'body_treatment'],
        is_active: true
      }))

      const { data: profilesData, error: profilesError } = await supabase
        .from('staff_profiles')
        .insert(staffProfiles)
        .select()

      if (profilesError) {
        console.error('Error creating staff profiles:', profilesError)
        return
      }

      console.log(`✅ Created ${profilesData.length} staff members`)

      // Create staff schedules for next 30 days (weekdays only)
      console.log('7. Creating staff schedules...')
      const schedules = []
      const startDate = new Date()
      
      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + i)
        
        // Skip weekends (Sunday = 0, Saturday = 6)
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue
        
        profilesData.forEach(staff => {
          schedules.push({
            staff_id: staff.id,
            date: currentDate.toISOString().split('T')[0],
            start_time: '09:00',
            end_time: '18:00',
            status: 'available'
          })
        })
      }

      const { error: schedulesError } = await supabase
        .from('staff_schedules')
        .insert(schedules)

      if (schedulesError) {
        console.error('Error creating staff schedules:', schedulesError)
      } else {
        console.log(`✅ Created ${schedules.length} staff schedule entries`)
      }
    } else {
      console.log(`✅ Found ${existingStaff.length} existing staff members`)
    }

    console.log('🎉 Database setup complete!')
    console.log('Your spa booking system is now ready with:')
    console.log(`- ${services.length} real spa services`)
    console.log('- 5 treatment rooms')
    console.log('- 5 staff members with schedules')
    
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

setupDatabase()