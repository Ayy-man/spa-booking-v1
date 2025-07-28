// This file is for server-side usage only
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Database types will be defined below - you can generate these with `supabase gen types typescript --project-id YOUR_PROJECT_ID`

// Environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side Supabase client for API routes and server components
export const createServerSideClient = () => {
  const cookieStore = cookies()
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Admin client with service role key for privileged operations
export const createAdminClient = () => {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin operations')
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Note: For client-side usage, import from './supabase-client' instead

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          role: 'customer' | 'staff' | 'admin'
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_conditions: string | null
          allergies: string | null
          preferences: Record<string, any>
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          role?: 'customer' | 'staff' | 'admin'
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          allergies?: string | null
          preferences?: Record<string, any>
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          role?: 'customer' | 'staff' | 'admin'
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          allergies?: string | null
          preferences?: Record<string, any>
          is_active?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          duration_minutes: number
          price: number
          category: 'massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness'
          requires_specialized_drainage: boolean
          min_room_capacity: number
          allowed_room_ids: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration_minutes: number
          price: number
          category: 'massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness'
          requires_specialized_drainage?: boolean
          min_room_capacity?: number
          allowed_room_ids?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price?: number
          category?: 'massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness'
          requires_specialized_drainage?: boolean
          min_room_capacity?: number
          allowed_room_ids?: string[] | null
          is_active?: boolean
          updated_at?: string
          deleted_at?: string | null
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          number: number
          bed_capacity: number
          has_shower: boolean
          has_specialized_drainage: boolean
          equipment: Record<string, any>
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          number: number
          bed_capacity: number
          has_shower?: boolean
          has_specialized_drainage?: boolean
          equipment?: Record<string, any>
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          number?: number
          bed_capacity?: number
          has_shower?: boolean
          has_specialized_drainage?: boolean
          equipment?: Record<string, any>
          is_active?: boolean
          updated_at?: string
        }
      }
      staff_profiles: {
        Row: {
          id: string
          user_id: string
          employee_id: string
          hire_date: string
          specializations: ('massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness')[]
          certification_details: Record<string, any>
          hourly_rate: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          employee_id: string
          hire_date: string
          specializations?: ('massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness')[]
          certification_details?: Record<string, any>
          hourly_rate?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          employee_id?: string
          hire_date?: string
          specializations?: ('massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness')[]
          certification_details?: Record<string, any>
          hourly_rate?: number | null
          is_active?: boolean
          updated_at?: string
        }
      }
      staff_schedules: {
        Row: {
          id: string
          staff_id: string
          date: string
          start_time: string
          end_time: string
          status: 'available' | 'booked' | 'break' | 'unavailable'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          date: string
          start_time: string
          end_time: string
          status?: 'available' | 'booked' | 'break' | 'unavailable'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          staff_id?: string
          date?: string
          start_time?: string
          end_time?: string
          status?: 'available' | 'booked' | 'break' | 'unavailable'
          notes?: string | null
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          customer_id: string
          service_id: string
          staff_id: string
          room_id: string
          booking_date: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          total_price: number
          special_requests: string | null
          internal_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          service_id: string
          staff_id: string
          room_id: string
          booking_date: string
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          total_price: number
          special_requests?: string | null
          internal_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          service_id?: string
          staff_id?: string
          room_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          total_price?: number
          special_requests?: string | null
          internal_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          updated_at?: string
        }
      }
      booking_history: {
        Row: {
          id: string
          booking_id: string
          changed_by: string
          old_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | null
          new_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | null
          change_reason: string | null
          change_details: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          changed_by: string
          old_status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | null
          new_status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | null
          change_reason?: string | null
          change_details?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          changed_by?: string
          old_status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | null
          new_status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | null
          change_reason?: string | null
          change_details?: Record<string, any>
          created_at?: string
        }
      }
    }
    Views: {
      staff_schedule_view: {
        Row: {
          booking_id: string
          booking_date: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
          special_requests: string | null
          internal_notes: string | null
          total_price: number
          customer_reference: string
          service_name: string
          service_category: 'massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness'
          duration_minutes: number
          service_price: number
          room_name: string
          room_number: number
          bed_capacity: number
          staff_employee_id: string
          staff_first_name: string
          staff_last_name: string
          booking_created_at: string
          booking_updated_at: string
        }
      }
    }
    Functions: {
      check_room_availability: {
        Args: {
          p_room_id: string
          p_booking_date: string
          p_start_time: string
          p_end_time: string
          p_exclude_booking_id?: string
        }
        Returns: boolean
      }
      check_staff_availability: {
        Args: {
          p_staff_id: string
          p_booking_date: string
          p_start_time: string
          p_end_time: string
          p_exclude_booking_id?: string
        }
        Returns: boolean
      }
      validate_service_room_compatibility: {
        Args: {
          p_service_id: string
          p_room_id: string
        }
        Returns: boolean
      }
      get_date_availability_summary: {
        Args: {
          p_start_date?: string
          p_days?: number
        }
        Returns: {
          date_value: string
          total_slots: number
          booked_slots: number
          available_slots: number
          has_availability: boolean
        }[]
      }
      get_available_time_slots: {
        Args: {
          p_date: string
          p_service_id?: string
          p_staff_id?: string
          p_room_id?: string
        }
        Returns: {
          time_slot: string
          available_staff_count: number
          available_room_count: number
          is_available: boolean
          suggested_staff_id: string | null
          suggested_room_id: string | null
        }[]
      }
    }
  }
}

// Helper functions for common database operations
export const supabaseHelpers = {
  /**
   * Get current user session
   */
  // Note: getCurrentUser should be called from client components using supabase-client

  /**
   * Get user profile by auth user ID
   */
  async getUserProfile(userId: string) {
    const supabase = createServerSideClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    
    return data
  },

  /**
   * Get available rooms for a specific time slot
   */
  async getAvailableRooms(startTime: string, endTime: string) {
    const supabase = createServerSideClient()
    
    // Get all active rooms
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
    
    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return []
    }
    
    // Get bookings that conflict with the requested time slot
    const { data: conflictingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('room_id')
      .not('status', 'eq', 'cancelled')
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)
    
    if (bookingsError) {
      console.error('Error checking booking conflicts:', bookingsError)
      return allRooms || []
    }
    
    // Filter out rooms with conflicting bookings
    const bookedRoomIds = new Set(conflictingBookings?.map(b => b.room_id) || [])
    return allRooms?.filter(room => !bookedRoomIds.has(room.id)) || []
  },

  /**
   * Get available staff for a specific service and time slot
   */
  async getAvailableStaff(serviceId: string, startTime: string, endTime: string) {
    const supabase = createServerSideClient()
    
    // Get service details to check specialties required
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('category')
      .eq('id', serviceId)
      .single()
    
    if (serviceError) {
      console.error('Error fetching service:', serviceError)
      return []
    }
    
    // Get all active staff with required specialties
    const { data: allStaff, error: staffError } = await supabase
      .from('staff_profiles')
      .select(`
        *,
        users!inner(first_name, last_name, email)
      `)
      .eq('is_active', true)
      .contains('specializations', [service.category])
    
    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return []
    }
    
    // Get staff bookings that conflict with the requested time slot
    const { data: conflictingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('staff_id')
      .not('status', 'eq', 'cancelled')
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)
    
    if (bookingsError) {
      console.error('Error checking staff conflicts:', bookingsError)
      return allStaff || []
    }
    
    // Filter out staff with conflicting bookings
    const bookedStaffIds = new Set(conflictingBookings?.map(b => b.staff_id) || [])
    return allStaff?.filter(staff => !bookedStaffIds.has(staff.id)) || []
  },

  /**
   * Create a new booking with validation
   */
  async createBooking(bookingData: Database['public']['Tables']['bookings']['Insert']) {
    const supabase = createServerSideClient()
    
    // Validate room availability
    const availableRooms = await this.getAvailableRooms(
      bookingData.start_time,
      bookingData.end_time
    )
    
    const isRoomAvailable = availableRooms.some(room => room.id === bookingData.room_id)
    if (!isRoomAvailable) {
      throw new Error('Selected room is not available for the requested time slot')
    }
    
    // Validate staff availability
    const availableStaff = await this.getAvailableStaff(
      bookingData.service_id,
      bookingData.start_time,
      bookingData.end_time
    )
    
    const isStaffAvailable = availableStaff.some(staff => staff.id === bookingData.staff_id)
    if (!isStaffAvailable) {
      throw new Error('Selected staff member is not available for the requested time slot')
    }
    
    // Create the booking
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating booking:', error)
      throw new Error('Failed to create booking')
    }
    
    return data
  },

  /**
   * Get anonymized booking view for staff
   */
  async getStaffBookingView(startDate: string, endDate: string) {
    const supabase = createServerSideClient()
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        notes,
        services(name, duration, category),
        staff(id, users(first_name, last_name)),
        rooms(name, type)
      `)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .not('status', 'eq', 'cancelled')
      .order('start_time')
    
    if (error) {
      console.error('Error fetching staff booking view:', error)
      return []
    }
    
    // Return the data with a simple anonymization marker
    return data?.map(booking => ({
      ...booking,
      customer_initials: 'Customer'
    })) || []
  }
}

// Type exports for easy importing
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

// Specific type exports for common entities
export type User = Tables<'users'>
export type Service = Tables<'services'>
export type Room = Tables<'rooms'>
export type StaffProfile = Tables<'staff_profiles'>
export type StaffSchedule = Tables<'staff_schedules'>
export type Booking = Tables<'bookings'>
export type BookingHistory = Tables<'booking_history'>

// Insert types for form handling
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']
export type StaffProfileInsert = Database['public']['Tables']['staff_profiles']['Insert']
export type StaffScheduleInsert = Database['public']['Tables']['staff_schedules']['Insert']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingHistoryInsert = Database['public']['Tables']['booking_history']['Insert']

// Update types for partial updates
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type ServiceUpdate = Database['public']['Tables']['services']['Update']
export type RoomUpdate = Database['public']['Tables']['rooms']['Update']
export type StaffProfileUpdate = Database['public']['Tables']['staff_profiles']['Update']
export type StaffScheduleUpdate = Database['public']['Tables']['staff_schedules']['Update']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']
export type BookingHistoryUpdate = Database['public']['Tables']['booking_history']['Update']

// Utility type for booking with related data
export type BookingWithDetails = Booking & {
  service: Service
  staff_profile: StaffProfile & { users: User }
  room: Room
  customer: User
}

// Utility type for staff booking view (from the database view)
export type StaffBookingView = Database['public']['Views']['staff_schedule_view']['Row']