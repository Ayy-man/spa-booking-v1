/**
 * Availability Validation API Route
 * 
 * Provides real-time validation for booking conflicts and availability checking.
 * Used for form validation and conflict detection before booking creation.
 * 
 * POST /api/availability/validate - Validate booking availability
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  validateAvailability, 
  checkBookingConflicts,
  parseTimeToDatabase 
} from '@/lib/availability'

interface ValidationRequest {
  roomId: string
  staffId: string
  date: string
  startTime: string
  endTime?: string
  duration?: number // in minutes
  excludeBookingId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json()
    
    const { 
      roomId, 
      staffId, 
      date, 
      startTime, 
      endTime, 
      duration = 60, 
      excludeBookingId 
    } = body

    // Validate required fields
    if (!roomId || !staffId || !date || !startTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: roomId, staffId, date, startTime'
        },
        { status: 400 }
      )
    }

    // Calculate end time if not provided
    let calculatedEndTime = endTime
    if (!calculatedEndTime && duration) {
      const startTimeObj = new Date(`1970-01-01T${parseTimeToDatabase(startTime)}:00`)
      const endTimeObj = new Date(startTimeObj.getTime() + duration * 60000)
      calculatedEndTime = endTimeObj.toTimeString().slice(0, 5)
    }

    if (!calculatedEndTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either endTime or duration must be provided'
        },
        { status: 400 }
      )
    }

    // Convert display times to database format if needed
    const dbStartTime = startTime.includes('AM') || startTime.includes('PM') 
      ? parseTimeToDatabase(startTime) 
      : startTime
    
    const dbEndTime = calculatedEndTime.includes('AM') || calculatedEndTime.includes('PM')
      ? parseTimeToDatabase(calculatedEndTime)
      : calculatedEndTime

    // Perform validation checks in parallel
    const [availabilityResult, conflicts] = await Promise.all([
      validateAvailability(
        roomId, 
        staffId, 
        date, 
        dbStartTime, 
        dbEndTime, 
        excludeBookingId
      ),
      checkBookingConflicts(
        date, 
        dbStartTime, 
        dbEndTime, 
        roomId, 
        staffId
      )
    ])

    const isValid = availabilityResult.roomAvailable && 
                   availabilityResult.staffAvailable && 
                   conflicts.length === 0

    return NextResponse.json({
      success: true,
      data: {
        isValid,
        roomAvailable: availabilityResult.roomAvailable,
        staffAvailable: availabilityResult.staffAvailable,
        conflicts,
        validation: {
          roomId,
          staffId,
          date,
          startTime: dbStartTime,
          endTime: dbEndTime,
          excludeBookingId
        }
      }
    })

  } catch (error) {
    console.error('Validation API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}