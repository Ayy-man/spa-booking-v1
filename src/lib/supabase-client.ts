import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing public Supabase environment variables')
}

// Client-side Supabase client for browser usage
// This can be safely used in client components
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Re-export types from the main supabase file
export type {
  Database,
  Tables,
  User,
  Service,
  Room,
  StaffProfile,
  Booking,
  UserInsert,
  ServiceInsert,
  RoomInsert,
  StaffProfileInsert,
  BookingInsert,
  UserUpdate,
  ServiceUpdate,
  RoomUpdate,
  StaffProfileUpdate,
  BookingUpdate,
  BookingWithDetails,
  StaffBookingView,
} from './supabase'