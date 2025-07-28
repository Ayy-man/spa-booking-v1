/**
 * Simplified Availability Service - Direct Database Queries
 * 
 * This replaces RPC functions with direct SQL queries until we can set up
 * the database functions properly.
 */

import { supabase } from './supabase-client'
import { 
  DateAvailability, 
  TimeSlotOption, 
  AvailabilityQuery 
} from '../types'

// =====================================================
// SIMPLIFIED DATE AVAILABILITY
// =====================================================

export async function getDateAvailability(
  startDate?: string,
  days: number = 14
): Promise<DateAvailability[]> {
  const start = startDate || new Date().toISOString().split('T')[0]
  
  try {
    // Get available staff count (assume all staff work weekdays)
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('is_active', true)

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      throw new Error(`Failed to fetch staff: ${staffError.message}`)
    }

    const staffCount = staff?.length || 4 // Default to 4 staff members

    // Get existing bookings for the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_date')
      .gte('booking_date', start)
      .lte('booking_date', new Date(new Date(start).getTime() + (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('status', 'in', '(cancelled,no_show)')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    // Calculate availability for each date
    const availability: DateAvailability[] = []
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(new Date(start).getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Skip weekends for availability
      const dayOfWeek = currentDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      if (isWeekend) {
        availability.push({
          date: dateStr,
          totalSlots: 0,
          bookedSlots: 0,
          availableSlots: 0,
          hasAvailability: false
        })
        continue
      }
      
      // Assume 12 slots per staff per day (9 AM - 7 PM, 30-min intervals)
      const totalSlots = staffCount * 20 // 20 slots per day per staff member
      
      // Count bookings on this date
      const bookedSlots = bookings?.filter(b => b.booking_date === dateStr).length || 0
      
      const availableSlots = Math.max(0, totalSlots - bookedSlots)
      
      availability.push({
        date: dateStr,
        totalSlots,
        bookedSlots,
        availableSlots,
        hasAvailability: availableSlots > 0
      })
    }
    
    return availability
    
  } catch (error) {
    console.error('Error in getDateAvailability:', error)
    throw error
  }
}

// =====================================================
// SIMPLIFIED TIME SLOT AVAILABILITY
// =====================================================

export async function getTimeSlotAvailability(
  query: AvailabilityQuery
): Promise<TimeSlotOption[]> {
  if (!query.date) {
    throw new Error('Date is required for time slot availability')
  }

  try {
    // Check if it's a weekend
    const queryDate = new Date(query.date)
    const dayOfWeek = queryDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Get active staff count
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('is_active', true)

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      throw new Error(`Failed to fetch staff: ${staffError.message}`)
    }

    // Get active rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('is_active', true)

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      throw new Error(`Failed to fetch rooms: ${roomsError.message}`)
    }

    // Get existing bookings for the date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('start_time, end_time, staff_id, room_id')
      .eq('booking_date', query.date)
      .not('status', 'in', '(cancelled,no_show)')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
    }

    // Generate time slots from 9 AM to 7 PM (30-minute intervals)
    const timeSlots: TimeSlotOption[] = []
    const startHour = 9
    const endHour = 19
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const time12Hour = convertTo12Hour(timeValue)
        
        // On weekends, no availability
        if (isWeekend) {
          timeSlots.push({
            time: time12Hour,
            timeValue: timeValue,
            available: false,
            id: `${query.date}-${timeValue}`,
            availableStaffCount: 0,
            availableRoomCount: 0,
            suggestedStaffId: undefined,
            suggestedRoomId: undefined
          })
          continue
        }

        // Check if this time slot has bookings
        const timeSlotBookings = bookings?.filter(booking => {
          const bookingStart = booking.start_time.substring(0, 5) // Remove seconds
          const bookingEnd = booking.end_time.substring(0, 5) // Remove seconds
          return timeValue >= bookingStart && timeValue < bookingEnd
        }) || []

        // Calculate available staff (total staff minus those booked at this time)
        const bookedStaffIds = new Set(timeSlotBookings.map(b => b.staff_id))
        const availableStaffCount = Math.max(0, (staff?.length || 4) - bookedStaffIds.size)

        // Calculate available rooms (total rooms minus those booked at this time)
        const bookedRoomIds = new Set(timeSlotBookings.map(b => b.room_id))
        const availableRoomCount = Math.max(0, (rooms?.length || 5) - bookedRoomIds.size)

        const isAvailable = availableStaffCount > 0 && availableRoomCount > 0

        // Get first available staff and room
        const availableStaff = staff?.find(s => !bookedStaffIds.has(s.id))
        const availableRoom = rooms?.find(r => !bookedRoomIds.has(r.id))

        timeSlots.push({
          time: time12Hour,
          timeValue: timeValue,
          available: isAvailable,
          id: `${query.date}-${timeValue}`,
          availableStaffCount,
          availableRoomCount,
          suggestedStaffId: availableStaff?.id || undefined,
          suggestedRoomId: availableRoom?.id || undefined
        })
      }
    }
    
    return timeSlots
    
  } catch (error) {
    console.error('Error in getTimeSlotAvailability:', error)
    throw error
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

// =====================================================
// EXPORTS FOR COMPATIBILITY
// =====================================================

export async function getFullAvailability(
  query: AvailabilityQuery,
  includeTimeSlots: boolean = false
) {
  try {
    const dateAvailability = await getDateAvailability()
    
    let timeSlots: TimeSlotOption[] | undefined
    if (includeTimeSlots && query.date) {
      timeSlots = await getTimeSlotAvailability(query)
    }

    return {
      success: true,
      data: {
        dateAvailability,
        timeSlots
      }
    }
  } catch (error) {
    console.error('Error in getFullAvailability:', error)
    return {
      success: false,
      data: {
        dateAvailability: []
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function preloadAvailability(dates?: string[]) {
  // Simple preload - just fetch some data
  try {
    if (!dates) {
      await getDateAvailability()
    } else {
      const promises = dates.map(date => 
        getTimeSlotAvailability({ date })
      )
      await Promise.all(promises)
    }
  } catch (error) {
    console.error('Error preloading availability:', error)
  }
}