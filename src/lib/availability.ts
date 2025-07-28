/**
 * Availability Service for Date/Time Picker Components
 * 
 * This module provides optimized functions for checking availability
 * that work seamlessly with DatePicker and TimeSlotPicker components.
 * 
 * Features:
 * - Efficient date range queries for 14-day view
 * - Real-time time slot availability
 * - Caching strategies for better performance
 * - Type-safe interfaces matching the database schema
 */

import { supabase } from './supabase-client'
import { 
  DateAvailability, 
  TimeSlotOption, 
  AvailabilityQuery, 
  BookingConflict,
  AvailabilityResponse,
  PerformanceMetric 
} from '../types'

// =====================================================
// CACHE CONFIGURATION
// =====================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class AvailabilityCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  set<T>(key: string, data: T, ttl = this.TTL): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const cache = new AvailabilityCache()

// =====================================================
// DATE AVAILABILITY FUNCTIONS
// =====================================================

/**
 * Get availability summary for DatePicker component
 * Optimized for 14-day view with caching
 */
export async function getDateAvailability(
  startDate?: string,
  days: number = 14
): Promise<DateAvailability[]> {
  const start = startDate || new Date().toISOString().split('T')[0]
  const cacheKey = `date-availability-${start}-${days}`
  
  // Check cache first
  const cached = cache.get<DateAvailability[]>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const { data, error } = await supabase.rpc('get_date_availability_summary', {
      p_start_date: start,
      p_days: days
    })

    if (error) {
      console.error('Error fetching date availability:', error)
      throw new Error(`Failed to fetch date availability: ${error.message}`)
    }

    const availability: DateAvailability[] = data.map((row: any) => ({
      date: row.date_value,
      totalSlots: row.total_slots,
      bookedSlots: row.booked_slots,
      availableSlots: row.available_slots,
      hasAvailability: row.has_availability
    }))

    // Cache the result
    cache.set(cacheKey, availability)
    
    return availability
  } catch (error) {
    console.error('Error in getDateAvailability:', error)
    throw error
  }
}

/**
 * Get detailed time slot availability for TimeSlotPicker component
 */
export async function getTimeSlotAvailability(
  query: AvailabilityQuery
): Promise<TimeSlotOption[]> {
  const cacheKey = `time-slots-${JSON.stringify(query)}`
  
  // Check cache first
  const cached = cache.get<TimeSlotOption[]>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const { data, error } = await supabase.rpc('get_available_time_slots', {
      p_date: query.date,
      p_service_id: query.serviceId || null,
      p_staff_id: query.staffId || null,
      p_room_id: query.roomId || null
    })

    if (error) {
      console.error('Error fetching time slots:', error)
      throw new Error(`Failed to fetch time slots: ${error.message}`)
    }

    const timeSlots: TimeSlotOption[] = data.map((row: any, index: number) => ({
      id: `slot-${index}`,
      time: formatTimeForDisplay(row.time_slot),
      timeValue: row.time_slot,
      available: row.is_available,
      availableStaffCount: row.available_staff_count,
      availableRoomCount: row.available_room_count,
      suggestedStaffId: row.suggested_staff_id,
      suggestedRoomId: row.suggested_room_id
    }))

    // Cache with shorter TTL for time slots (2 minutes)
    cache.set(cacheKey, timeSlots, 2 * 60 * 1000)
    
    return timeSlots
  } catch (error) {
    console.error('Error in getTimeSlotAvailability:', error)
    throw error
  }
}

/**
 * Combined availability check for both DatePicker and TimeSlotPicker
 */
export async function getFullAvailability(
  query: AvailabilityQuery,
  includeTimeSlots: boolean = false
): Promise<AvailabilityResponse> {
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

// =====================================================
// VALIDATION AND CONFLICT CHECKING
// =====================================================

/**
 * Check for booking conflicts before creating a booking
 */
export async function checkBookingConflicts(
  date: string,
  startTime: string,
  endTime: string,
  roomId?: string,
  staffId?: string
): Promise<BookingConflict[]> {
  try {
    const { data, error } = await supabase.rpc('get_booking_conflicts', {
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime,
      p_room_id: roomId || null,
      p_staff_id: staffId || null
    })

    if (error) {
      console.error('Error checking conflicts:', error)
      throw new Error(`Failed to check conflicts: ${error.message}`)
    }

    return data.map((row: any) => ({
      bookingId: row.booking_id,
      conflictType: row.conflict_type,
      resourceName: row.resource_name,
      existingStartTime: row.existing_start_time,
      existingEndTime: row.existing_end_time,
      customerReference: row.customer_reference
    }))
  } catch (error) {
    console.error('Error in checkBookingConflicts:', error)
    throw error
  }
}

/**
 * Validate room and staff availability for a specific time slot
 */
export async function validateAvailability(
  roomId: string,
  staffId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ roomAvailable: boolean; staffAvailable: boolean }> {
  try {
    const [roomResult, staffResult] = await Promise.all([
      supabase.rpc('check_room_availability_optimized', {
        p_room_id: roomId,
        p_booking_date: date,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_booking_id: excludeBookingId || null
      }),
      supabase.rpc('check_staff_availability_optimized', {
        p_staff_id: staffId,
        p_booking_date: date,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_booking_id: excludeBookingId || null
      })
    ])

    if (roomResult.error) {
      console.error('Room availability check error:', roomResult.error)
      throw new Error(`Room availability check failed: ${roomResult.error.message}`)
    }

    if (staffResult.error) {
      console.error('Staff availability check error:', staffResult.error)
      throw new Error(`Staff availability check failed: ${staffResult.error.message}`)
    }

    return {
      roomAvailable: roomResult.data,
      staffAvailable: staffResult.data
    }
  } catch (error) {
    console.error('Error in validateAvailability:', error)
    throw error
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format time from 24-hour to 12-hour format for display
 */
function formatTimeForDisplay(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Convert 12-hour format time to 24-hour format
 */
export function parseTimeToDatabase(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) {
    throw new Error(`Invalid time format: ${time12}`)
  }

  let [, hours, minutes, period] = match
  let hour24 = parseInt(hours)

  if (period.toUpperCase() === 'PM' && hour24 !== 12) {
    hour24 += 12
  } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
    hour24 = 0
  }

  return `${hour24.toString().padStart(2, '0')}:${minutes}`
}

/**
 * Generate default time slots for the TimeSlotPicker
 */
export function generateDefaultTimeSlots(): TimeSlotOption[] {
  const slots: TimeSlotOption[] = []
  const times = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM'
  ]

  times.forEach((time, index) => {
    slots.push({
      id: `default-slot-${index}`,
      time,
      timeValue: parseTimeToDatabase(time),
      available: false, // Will be updated by availability check
      availableStaffCount: 0,
      availableRoomCount: 0
    })
  })

  return slots
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

/**
 * Invalidate availability cache when bookings change
 */
export function invalidateAvailabilityCache(date?: string): void {
  if (date) {
    cache.invalidatePattern(date)
  } else {
    cache.clear()
  }
}

/**
 * Preload availability data for better performance
 */
export async function preloadAvailability(
  dates: string[] = []
): Promise<void> {
  try {
    if (dates.length === 0) {
      // Preload next 14 days
      await getDateAvailability()
    } else {
      // Preload specific dates
      const promises = dates.map(date => 
        getTimeSlotAvailability({ date })
      )
      await Promise.all(promises)
    }
  } catch (error) {
    console.error('Error preloading availability:', error)
    // Don't throw - preloading is optional
  }
}

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

/**
 * Get performance metrics for monitoring
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetric[]> {
  try {
    const { data, error } = await supabase.rpc('analyze_booking_performance')

    if (error) {
      console.error('Error fetching performance metrics:', error)
      throw new Error(`Failed to fetch performance metrics: ${error.message}`)
    }

    return data.map((row: any) => ({
      metricName: row.metric_name,
      metricValue: row.metric_value,
      description: row.description
    }))
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error)
    throw error
  }
}

/**
 * Monitor cache hit rate
 */
export function getCacheStats(): {
  hitRate: number
  totalQueries: number
  cacheSize: number
} {
  // Simple implementation - in production, you'd want more sophisticated metrics
  return {
    hitRate: 0.85, // Placeholder - implement actual tracking
    totalQueries: 1000, // Placeholder
    cacheSize: cache['cache'].size
  }
}

/**
 * Validate service-room compatibility based on business rules
 */
export async function validateServiceRoomCompatibility(
  serviceId: string,
  roomId: string
): Promise<boolean> {
  try {
    const [serviceResult, roomResult] = await Promise.all([
      supabase
        .from('services')
        .select('requires_specialized_drainage, min_room_capacity, allowed_room_ids')
        .eq('id', serviceId)
        .eq('is_active', true)
        .single(),
      supabase
        .from('rooms')
        .select('bed_capacity, has_specialized_drainage')
        .eq('id', roomId)
        .eq('is_active', true)
        .single()
    ])

    if (serviceResult.error || roomResult.error || !serviceResult.data || !roomResult.data) {
      return false
    }

    const service = serviceResult.data
    const room = roomResult.data

    // Check specialized drainage requirement
    if (service.requires_specialized_drainage && !room.has_specialized_drainage) {
      return false
    }

    // Check minimum capacity requirement
    if (service.min_room_capacity > room.bed_capacity) {
      return false
    }

    // Check allowed rooms restriction
    if (service.allowed_room_ids && service.allowed_room_ids.length > 0) {
      return service.allowed_room_ids.includes(roomId)
    }

    return true
  } catch (error) {
    console.error('Error validating service-room compatibility:', error)
    return false
  }
}