/**
 * Booking API Route
 * 
 * Handles booking creation, modification, and cancellation.
 * Integrates with the new DatePicker and TimeSlotPicker components.
 * Maintains existing business logic and validation rules.
 * 
 * POST /api/bookings - Create new booking
 * GET /api/bookings - Get bookings (with filters)
 * PUT /api/bookings/:id - Update booking
 * DELETE /api/bookings/:id - Cancel booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { 
  validateAvailability, 
  checkBookingConflicts, 
  parseTimeToDatabase,
  invalidateAvailabilityCache 
} from '@/lib/availability'
import { BookingFormData, BookingResponse, BookingConflict, Booking } from '@/types'
import { z } from 'zod'

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const BookingCreateSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  staffId: z.string().uuid('Invalid staff ID format').optional(),
  roomId: z.string().uuid('Invalid room ID format').optional(),
  customerId: z.string().uuid('Invalid customer ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^(1[0-2]|[1-9]):[0-5][0-9]\s*(AM|PM)$/i, 'Time must be in h:MM AM/PM format'),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional()
})

const BookingUpdateSchema = z.object({
  serviceId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^(1[0-2]|[1-9]):[0-5][0-9]\s*(AM|PM)$/i).optional(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  cancellationReason: z.string().optional()
})

// =====================================================
// BUSINESS LOGIC FUNCTIONS
// =====================================================

/**
 * Apply spa-specific business rules for room assignment
 * Implements Dermal Spa's complex room logic:
 * - Room 1: Single bed, preferred for single person bookings
 * - Room 2: Two beds, for 2 people or 1 person blocks entire room
 * - Room 3: Two beds + drainage, for body scrubs, preferred for couples
 */
async function applyBusinessRules(
  serviceId: string,
  numberOfPeople: number = 1,
  date: string,
  startTime: string,
  endTime: string,
  suggestedRoomId?: string
): Promise<{ roomId: string; error?: string }> {
  try {
    const supabase = createServerSideClient()
    
    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('name, requires_specialized_drainage, min_room_capacity, allowed_room_ids')
      .eq('id', serviceId)
      .eq('is_active', true)
      .single()

    if (serviceError || !service) {
      return { roomId: '', error: 'Service not found or inactive' }
    }

    // Get all rooms with their details
    const { data: allRooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, number, bed_capacity, has_specialized_drainage')
      .eq('is_active', true)
      .order('number', { ascending: true })

    if (roomsError || !allRooms) {
      return { roomId: '', error: 'Unable to fetch room information' }
    }

    const room1 = allRooms.find(r => r.number === 1)
    const room2 = allRooms.find(r => r.number === 2)
    const room3 = allRooms.find(r => r.number === 3)

    // BUSINESS RULE 1: Body scrubs MUST use Room 3 (only room with drainage)
    if (service.name.toLowerCase().includes('body scrub') || service.requires_specialized_drainage) {
      if (!room3) {
        return { roomId: '', error: 'Room 3 (specialized drainage) is required but not available' }
      }
      return { roomId: room3.id }
    }

    // BUSINESS RULE 2: Check room availability for the time slot
    const checkRoomAvailability = async (roomId: string): Promise<boolean> => {
      const { data: conflicts } = await supabase.rpc('check_room_availability', {
        p_room_id: roomId,
        p_booking_date: date,
        p_start_time: startTime,
        p_end_time: endTime
      })
      return conflicts === true
    }

    // Check availability for all rooms
    const availabilityChecks = await Promise.all([
      room1 ? checkRoomAvailability(room1.id).then(available => ({ room: room1, available })) : Promise.resolve({ room: null, available: false }),
      room2 ? checkRoomAvailability(room2.id).then(available => ({ room: room2, available })) : Promise.resolve({ room: null, available: false }),
      room3 ? checkRoomAvailability(room3.id).then(available => ({ room: room3, available })) : Promise.resolve({ room: null, available: false })
    ])

    const availableRooms = availabilityChecks.filter(check => check.room && check.available).map(check => check.room!)

    if (availableRooms.length === 0) {
      return { roomId: '', error: 'No rooms available for the selected time slot' }
    }

    // BUSINESS RULE 3: Handle couples bookings (2+ people)
    if (numberOfPeople >= 2 || service.min_room_capacity >= 2) {
      // Couples need rooms with 2+ bed capacity (Room 2 or Room 3)
      const suitableRooms = availableRooms.filter(room => room.bed_capacity >= 2)
      
      if (suitableRooms.length === 0) {
        return { roomId: '', error: 'No rooms with sufficient capacity available for couples booking' }
      }

      // Prefer Room 3 for couples (premium room with extra amenities)
      const room3Available = suitableRooms.find(room => room.number === 3)
      if (room3Available) {
        return { roomId: room3Available.id }
      }

      // Fall back to Room 2
      const room2Available = suitableRooms.find(room => room.number === 2)
      if (room2Available) {
        return { roomId: room2Available.id }
      }

      return { roomId: '', error: 'No suitable rooms available for couples booking' }
    }

    // BUSINESS RULE 4: Handle single person bookings
    // Priority order: Room 1 (preferred) -> Room 2 -> Room 3
    
    // First choice: Room 1 (single bed, perfect for 1 person)
    const room1Available = availableRooms.find(room => room.number === 1)
    if (room1Available) {
      return { roomId: room1Available.id }
    }

    // Second choice: Room 2 (2 beds, but single person blocks entire room)
    const room2Available = availableRooms.find(room => room.number === 2)
    if (room2Available) {
      // NOTE: When a single person books Room 2, the entire room is blocked
      // This is handled automatically by the booking system since we're creating
      // a booking for the full time slot
      return { roomId: room2Available.id }
    }

    // Third choice: Room 3 (2 beds + drainage, single person blocks entire room)
    const room3Available = availableRooms.find(room => room.number === 3)
    if (room3Available) {
      // NOTE: When a single person books Room 3, the entire room is blocked
      return { roomId: room3Available.id }
    }

    // BUSINESS RULE 5: Handle allowed rooms restriction (legacy support)
    if (service.allowed_room_ids && service.allowed_room_ids.length > 0) {
      const allowedAndAvailable = availableRooms.filter(room => 
        service.allowed_room_ids!.includes(room.id)
      )
      
      if (allowedAndAvailable.length === 0) {
        return { roomId: '', error: 'No allowed rooms available for this service' }
      }

      // Use the first allowed room
      return { roomId: allowedAndAvailable[0].id }
    }

    // Fallback: Should not reach here with the logic above, but safety net
    return { roomId: '', error: 'Unable to assign appropriate room' }

  } catch (error) {
    console.error('Error applying business rules:', error)
    return { roomId: '', error: 'Failed to determine appropriate room assignment' }
  }
}

/**
 * Calculate booking end time based on service duration
 */
async function calculateBookingEndTime(serviceId: string, startTime: string): Promise<string> {
  const supabase = createServerSideClient()
  const { data: service, error } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single()

  if (error || !service) {
    throw new Error('Service not found')
  }

  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)
  
  const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000)
  
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
}

// =====================================================
// API ROUTE HANDLERS
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const body = await request.json()
    
    // Validate input
    const validationResult = BookingCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { serviceId, staffId, roomId, customerId, date, time, specialRequests, internalNotes } = validationResult.data

    // Convert display time to database format
    const startTime = parseTimeToDatabase(time)
    const endTime = await calculateBookingEndTime(serviceId, startTime)

    // Apply business rules for room assignment
    // Note: numberOfPeople defaults to 1, but should be extracted from booking form in future
    const numberOfPeople = 1 // TODO: Extract from booking form data
    const { roomId: finalRoomId, error: businessRuleError } = await applyBusinessRules(
      serviceId, 
      numberOfPeople, 
      date, 
      startTime, 
      endTime, 
      roomId
    )
    if (businessRuleError) {
      return NextResponse.json(
        {
          success: false,
          error: businessRuleError
        },
        { status: 400 }
      )
    }

    // Get staff assignment if not provided
    let finalStaffId = staffId
    if (!finalStaffId) {
      const { data: availableStaff, error: staffError } = await supabase.rpc('get_available_time_slots', {
        p_date: date,
        p_service_id: serviceId
      })

      if (staffError || !availableStaff || availableStaff.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'No staff available for the selected time'
          },
          { status: 400 }
        )
      }

      // Find staff for the requested time slot
      const timeSlot = availableStaff.find((slot: any) => slot.time_slot === startTime)
      if (!timeSlot || !timeSlot.suggested_staff_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'No staff available for the selected time slot'
          },
          { status: 400 }
        )
      }

      finalStaffId = timeSlot.suggested_staff_id
    }

    // Validate availability
    const availability = await validateAvailability(
      finalRoomId,
      finalStaffId!,
      date,
      startTime,
      endTime
    )

    if (!availability.roomAvailable || !availability.staffAvailable) {
      // Check for conflicts to provide detailed feedback
      const conflicts = await checkBookingConflicts(date, startTime, endTime, finalRoomId, finalStaffId)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Time slot is no longer available',
          conflicts
        },
        { status: 409 }
      )
    }

    // Get service price
    const { data: service, error: servicePriceError } = await supabase
      .from('services')
      .select('price')
      .eq('id', serviceId)
      .single()

    if (servicePriceError || !service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service pricing information not found'
        },
        { status: 400 }
      )
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        service_id: serviceId,
        staff_id: finalStaffId,
        room_id: finalRoomId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        total_price: service.price,
        special_requests: specialRequests
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create booking',
          details: bookingError.message
        },
        { status: 500 }
      )
    }

    // Invalidate availability cache for the booking date
    invalidateAvailabilityCache(date)

    // Get room details for response
    const { data: roomDetails, error: roomDetailsError } = await supabase
      .from('rooms')
      .select('name, number')
      .eq('id', finalRoomId)
      .single()

    // Transform booking data to match interface
    const responseBooking: Booking = {
      id: booking.id,
      customerId: booking.customer_id,
      serviceId: booking.service_id,
      staffId: booking.staff_id,
      roomId: booking.room_id,
      bookingDate: booking.booking_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      status: booking.status,
      totalPrice: booking.total_price,
      specialRequests: booking.special_requests,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at || booking.created_at
    }

    return NextResponse.json({
      success: true,
      data: responseBooking,
      message: 'Booking created successfully',
      roomAssignment: roomDetails ? {
        roomName: roomDetails.name,
        roomNumber: roomDetails.number
      } : null
    })

  } catch (error) {
    console.error('Booking API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const customerId = searchParams.get('customerId')
    const staffId = searchParams.get('staffId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    let query = supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        service_id,
        staff_id,
        room_id,
        booking_date,
        start_time,
        end_time,
        status,
        total_price,
        special_requests,
        created_at,
        services:service_id(name, duration_minutes),
        rooms:room_id(name, number),
        staff_profiles:staff_id(employee_id, users:user_id(first_name, last_name))
      `)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply filters
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }
    
    if (staffId) {
      query = query.eq('staff_id', staffId)
    }
    
    if (date) {
      query = query.eq('booking_date', date)
    }
    
    if (status) {
      query = query.eq('status', status)
    } else {
      // By default, exclude cancelled bookings
      query = query.neq('status', 'cancelled')
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch bookings'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: bookings || [],
      count: bookings?.length || 0
    })

  } catch (error) {
    console.error('Get bookings API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking ID is required'
        },
        { status: 400 }
      )
    }

    // Validate input
    const validationResult = BookingUpdateSchema.safeParse(updateData)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Convert time format if provided
    let dbUpdateData: any = { ...validatedData }
    if (validatedData.time) {
      dbUpdateData.start_time = parseTimeToDatabase(validatedData.time)
      delete dbUpdateData.time
      
      // Recalculate end time if service or time changed
      if (validatedData.serviceId || validatedData.time) {
        const serviceId = validatedData.serviceId || (await supabase
          .from('bookings')
          .select('service_id')
          .eq('id', id)
          .single()).data?.service_id

        if (serviceId) {
          dbUpdateData.end_time = await calculateBookingEndTime(serviceId, dbUpdateData.start_time)
        }
      }
    }

    // Convert camelCase to snake_case for database
    const snakeCaseData: any = {}
    Object.keys(dbUpdateData).forEach(key => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      snakeCaseData[snakeKey] = dbUpdateData[key]
    })

    // Add updated timestamp
    snakeCaseData.updated_at = new Date().toISOString()

    // Update booking
    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update(snakeCaseData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Booking update error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update booking',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Invalidate availability cache for the affected date(s)
    invalidateAvailabilityCache(updatedBooking.booking_date)
    if (validatedData.date && validatedData.date !== updatedBooking.booking_date) {
      invalidateAvailabilityCache(validatedData.date)
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Booking updated successfully'
    })

  } catch (error) {
    console.error('Update booking API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const reason = searchParams.get('reason') || 'Cancelled by customer'

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking ID is required'
        },
        { status: 400 }
      )
    }

    // Update booking status to cancelled instead of deleting
    const { data: cancelledBooking, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('booking_date')
      .single()

    if (error) {
      console.error('Booking cancellation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to cancel booking',
          details: error.message
        },
        { status: 500 }
      )
    }

    // Invalidate availability cache for the booking date
    if (cancelledBooking?.booking_date) {
      invalidateAvailabilityCache(cancelledBooking.booking_date)
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel booking API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}