/**
 * Staff Schedule API Route
 * 
 * Provides anonymized staff schedule data using the optimized staff_schedule_view.
 * Supports filtering by date ranges, staff members, and status.
 * 
 * GET /api/staff/schedule - Get staff schedule with anonymized customer data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { StaffScheduleView } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const staffId = searchParams.get('staffId')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Build query for staff_schedule_view
    let query = supabase
      .from('staff_schedule_view')
      .select('*')

    // Apply filters
    if (date) {
      query = query.eq('booking_date', date)
    } else if (startDate && endDate) {
      query = query.gte('booking_date', startDate).lte('booking_date', endDate)
    } else if (startDate) {
      query = query.gte('booking_date', startDate)
    } else if (endDate) {
      query = query.lte('booking_date', endDate)
    }

    if (staffId) {
      // Filter by staff - this requires joining with staff_profiles
      // Since the view already includes staff info, we can filter by employee_id
      const { data: staffProfile } = await supabase
        .from('staff_profiles')
        .select('employee_id')
        .eq('id', staffId)
        .single()

      if (staffProfile) {
        query = query.eq('staff_employee_id', staffProfile.employee_id)
      }
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    if (limit) {
      const limitNum = parseInt(limit)
      const offsetNum = offset ? parseInt(offset) : 0
      query = query.range(offsetNum, offsetNum + limitNum - 1)
    }

    // Order by date and time
    query = query.order('booking_date', { ascending: true })
                 .order('start_time', { ascending: true })

    const { data, error, count } = await query

    if (error) {
      console.error('Staff schedule query error:', error)
      throw new Error(`Failed to fetch staff schedule: ${error.message}`)
    }

    // Transform data to match interface
    const scheduleData: StaffScheduleView[] = data?.map(row => ({
      bookingId: row.booking_id,
      bookingDate: row.booking_date,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      specialRequests: row.special_requests,
      internalNotes: row.internal_notes,
      totalPrice: row.total_price,
      customerReference: row.customer_reference,
      serviceName: row.service_name,
      serviceCategory: row.service_category,
      durationMinutes: row.duration_minutes,
      servicePrice: row.service_price,
      roomName: row.room_name,
      roomNumber: row.room_number,
      bedCapacity: row.bed_capacity,
      staffEmployeeId: row.staff_employee_id,
      staffFirstName: row.staff_first_name,
      staffLastName: row.staff_last_name,
      bookingCreatedAt: row.booking_created_at,
      bookingUpdatedAt: row.booking_updated_at
    })) || []

    return NextResponse.json({
      success: true,
      data: scheduleData,
      pagination: {
        total: count,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : 0
      },
      filters: {
        date,
        startDate,
        endDate,
        staffId,
        status
      }
    })

  } catch (error) {
    console.error('Staff schedule API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSideClient()
    const body = await request.json()
    const { staffIds, dateRange } = body

    if (!Array.isArray(staffIds) || !dateRange?.start || !dateRange?.end) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: staffIds array and dateRange.start/end are required'
        },
        { status: 400 }
      )
    }

    // Get employee IDs for the staff IDs
    const { data: staffProfiles } = await supabase
      .from('staff_profiles')
      .select('id, employee_id')
      .in('id', staffIds)

    if (!staffProfiles?.length) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const employeeIds = staffProfiles.map(p => p.employee_id)

    // Fetch schedule data for multiple staff members
    const { data, error } = await supabase
      .from('staff_schedule_view')
      .select('*')
      .in('staff_employee_id', employeeIds)
      .gte('booking_date', dateRange.start)
      .lte('booking_date', dateRange.end)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Batch staff schedule query error:', error)
      throw new Error(`Failed to fetch staff schedules: ${error.message}`)
    }

    // Group data by staff member
    const groupedData = data?.reduce((acc, row) => {
      const staffKey = row.staff_employee_id
      if (!acc[staffKey]) {
        acc[staffKey] = []
      }
      acc[staffKey].push({
        bookingId: row.booking_id,
        bookingDate: row.booking_date,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        specialRequests: row.special_requests,
        internalNotes: row.internal_notes,
        totalPrice: row.total_price,
        customerReference: row.customer_reference,
        serviceName: row.service_name,
        serviceCategory: row.service_category,
        durationMinutes: row.duration_minutes,
        servicePrice: row.service_price,
        roomName: row.room_name,
        roomNumber: row.room_number,
        bedCapacity: row.bed_capacity,
        staffEmployeeId: row.staff_employee_id,
        staffFirstName: row.staff_first_name,
        staffLastName: row.staff_last_name,
        bookingCreatedAt: row.booking_created_at,
        bookingUpdatedAt: row.booking_updated_at
      })
      return acc
    }, {} as Record<string, StaffScheduleView[]>) || {}

    return NextResponse.json({
      success: true,
      data: groupedData,
      meta: {
        staffCount: Object.keys(groupedData).length,
        totalBookings: data?.length || 0,
        dateRange
      }
    })

  } catch (error) {
    console.error('Batch staff schedule API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}