/**
 * Availability API Route
 * 
 * Provides optimized endpoints for DatePicker and TimeSlotPicker components.
 * Supports both date availability summaries and detailed time slot queries.
 * 
 * GET /api/availability - Get date availability summary
 * GET /api/availability?date=YYYY-MM-DD - Get time slots for specific date
 * GET /api/availability?date=YYYY-MM-DD&service=uuid - Get filtered availability
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getDateAvailability, 
  getTimeSlotAvailability, 
  getFullAvailability,
  preloadAvailability 
} from '@/lib/availability'
import { AvailabilityQuery } from '@/types'

// =====================================================
// VALIDATION UTILITIES
// =====================================================

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Check if date is in the past (before today)
 */
function isPastDate(dateString: string): boolean {
  const inputDate = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day
  
  return inputDate < today
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const date = searchParams.get('date')
    const serviceId = searchParams.get('service')
    const staffId = searchParams.get('staff')
    const roomId = searchParams.get('room')
    const days = searchParams.get('days')
    const includeTimeSlots = searchParams.get('includeTimeSlots') === 'true'
    const preload = searchParams.get('preload') === 'true'

    // Validate date parameter if provided
    if (date && !isValidDate(date)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Please use YYYY-MM-DD format.',
          data: { dateAvailability: [] }
        },
        { status: 400 }
      )
    }

    // Validate that date is not in the past (unless today)
    if (date && isPastDate(date)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot request availability for past dates.',
          data: { dateAvailability: [] }
        },
        { status: 400 }
      )
    }

    // Handle preload request
    if (preload) {
      await preloadAvailability()
      return NextResponse.json({ 
        success: true, 
        message: 'Availability data preloaded' 
      })
    }

    // Build availability query
    const query: AvailabilityQuery = {
      date: date || '',
      serviceId: serviceId || undefined,
      staffId: staffId || undefined,
      roomId: roomId || undefined
    }

    // If no specific date requested, return date availability summary for DatePicker
    if (!date) {
      const daysToFetch = days ? parseInt(days) : 14
      const dateAvailability = await getDateAvailability(undefined, daysToFetch)
      
      return NextResponse.json({
        success: true,
        data: {
          dateAvailability,
          query: { days: daysToFetch }
        },
        cached: true // Indicate this data is likely cached
      })
    }

    // If date is specified, get detailed time slots for TimeSlotPicker
    const timeSlots = await getTimeSlotAvailability(query)
    
    // Return only available time slots as requested
    const availableTimeSlots = timeSlots.filter(slot => slot.available)
    
    return NextResponse.json({
      success: true,
      data: {
        date: query.date,
        timeSlots: availableTimeSlots,
        totalSlots: timeSlots.length,
        availableSlots: availableTimeSlots.length,
        hasAvailability: availableTimeSlots.length > 0
      },
      query,
      cached: true
    })

  } catch (error) {
    console.error('Availability API error:', error)
    
    // Log error details for debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      url: request.url
    }
    console.error('Detailed error info:', errorDetails)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        data: {
          dateAvailability: []
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dates } = body

    if (!Array.isArray(dates)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: dates must be an array'
        },
        { status: 400 }
      )
    }

    // Batch availability check for multiple dates
    const promises = dates.map(async (date: string) => {
      const timeSlots = await getTimeSlotAvailability({ date })
      return {
        date,
        timeSlots
      }
    })

    const results = await Promise.all(promises)

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Batch availability API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}