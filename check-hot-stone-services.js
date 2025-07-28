// Check Hot Stone services in the database
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHotStoneServices() {
  console.log('🔍 Checking Hot Stone Services...\n');

  try {
    // Search for hot stone services
    const { data: hotStoneServices, error } = await supabase
      .from('services')
      .select('*')
      .ilike('name', '%hot stone%')
      .eq('is_active', true)
      .order('name');
      
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log(`✅ Found ${hotStoneServices.length} Hot Stone services:\n`);
    
    hotStoneServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   - ID: ${service.id}`);
      console.log(`   - Category: ${service.category}`);
      console.log(`   - Duration: ${service.duration_minutes} minutes`);
      console.log(`   - Price: $${service.price}`);
      console.log(`   - Active: ${service.is_active}`);
      console.log(`   - Description: ${service.description || 'N/A'}`);
      console.log('');
    });

    // Check all massage services for broader context
    const { data: massageServices, error: massageError } = await supabase
      .from('services')
      .select('name, id, is_active')
      .eq('category', 'massage')
      .eq('is_active', true)
      .order('name');
      
    if (massageError) {
      console.error('❌ Error checking massage services:', massageError);
    } else {
      console.log(`📋 All Massage Services (${massageServices.length} total):`);
      massageServices.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name} (${service.id})`);
      });
    }

    // Also check wellness category which might contain hot stone services
    const { data: wellnessServices, error: wellnessError } = await supabase
      .from('services')
      .select('name, id, is_active')
      .eq('category', 'wellness')
      .eq('is_active', true)
      .order('name');
      
    if (wellnessError) {
      console.error('❌ Error checking wellness services:', wellnessError);
    } else {
      console.log(`\n🌿 All Wellness Services (${wellnessServices.length} total):`);
      wellnessServices.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name} (${service.id})`);
      });
    }

  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

checkHotStoneServices();