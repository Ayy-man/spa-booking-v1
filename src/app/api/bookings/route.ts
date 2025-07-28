/**
 * Simplified Booking API Route
 * 
 * Handles basic booking creation without complex business rules
 * until we set up the full database functions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { BookingFormData } from '@/types'
import { z } from 'zod'

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const BookingCreateSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  staffId: z.string().uuid('Invalid staff ID format').optional(),
  roomId: z.string().uuid('Invalid room ID format').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string(), // Accept any time format for now
  specialRequests: z.string().optional(),
  // Customer information
  customerFirstName: z.string().min(1, 'First name is required'),
  customerLastName: z.string().min(1, 'Last name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 characters')
})

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function parseTimeToDatabase(displayTime: string): string {
  // Handle both "2:00 PM" and "14:00" formats
  if (displayTime.includes('AM') || displayTime.includes('PM')) {
    const [time, period] = displayTime.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    let hour24 = hours
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hour24 += 12
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  
  return displayTime // Already in 24-hour format
}

async function calculateBookingEndTime(serviceId: string, startTime: string): Promise<string> {
  const supabase = createServerSideClient()
  
  // Get service duration
  const { data: service, error } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .single()

  if (error || !service) {
    throw new Error('Service not found')
  }

  // Calculate end time
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const endMinutes = startMinutes + service.duration_minutes
  
  const endHours = Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
}

// =====================================================
// API HANDLERS
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

    const { 
      serviceId, 
      staffId, 
      roomId, 
      date, 
      time, 
      specialRequests, 
      customerFirstName, 
      customerLastName, 
      customerEmail, 
      customerPhone 
    } = validationResult.data

    // Find or create customer based on email
    let customerId: string
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('id')
      .eq('email', customerEmail)
      .eq('role', 'customer')
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('users')
        .insert({
          email: customerEmail,
          first_name: customerFirstName,
          last_name: customerLastName,
          phone: customerPhone,
          role: 'customer',
          is_active: true
        })
        .select('id')
        .single()

      if (customerError || !newCustomer) {
        console.error('Customer creation error:', customerError)
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create customer account'
          },
          { status: 500 }
        )
      }

      customerId = newCustomer.id
    }

    // Convert time to database format
    const startTime = parseTimeToDatabase(time)
    const endTime = await calculateBookingEndTime(serviceId, startTime)

    // Get service price
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('price')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service not found'
        },
        { status: 400 }
      )
    }

    // Auto-assign staff and room if not provided
    let finalStaffId = staffId
    let finalRoomId = roomId

    if (!finalStaffId) {
      // Get any available staff
      const { data: staff, error: staffError } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (staffError || !staff) {
        return NextResponse.json(
          {
            success: false,
            error: 'No staff available'
          },
          { status: 400 }
        )
      }

      finalStaffId = staff.id
    }

    if (!finalRoomId) {
      // Get any available room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (roomError || !room) {
        return NextResponse.json(
          {
            success: false,
            error: 'No rooms available'
          },
          { status: 400 }
        )
      }

      finalRoomId = room.id
    }

    // Create the booking
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
        status: 'confirmed',
        total_price: service.price,
        special_requests: specialRequests || null
      })
      .select(`
        *,
        services (name, category, duration_minutes, price),
        rooms (name, number),
        staff_profiles (
          employee_id,
          users (first_name, last_name)
        ),
        users!customer_id (first_name, last_name, email, phone)
      `)
      .single()

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create booking'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
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
    
    const date = searchParams.get('date')
    const customerId = searchParams.get('customer')
    const staffId = searchParams.get('staff')
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        services (name, category, duration_minutes, price),
        rooms (name, number),
        staff_profiles (
          employee_id,
          users (first_name, last_name)
        ),
        users!customer_id (first_name, last_name, email, phone)
      `)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (date) {
      query = query.eq('booking_date', date)
    }
    
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }
    
    if (staffId) {
      query = query.eq('staff_id', staffId)
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
      data: bookings
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