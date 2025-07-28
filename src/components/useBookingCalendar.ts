'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { addDays, format, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns'
import { Service, TimeSlot, BookingFormData, Staff, Room } from '@/types'

interface UseBookingCalendarOptions {
  services?: Service[]
  defaultServiceId?: string
  preSelectedService?: Service | null
  minDate?: Date
  maxDate?: Date
  businessHours?: {
    start: string
    end: string
    daysOfWeek: number[] // 0 = Sunday, 1 = Monday, etc.
  }
  timeSlotDuration?: number // in minutes
  bufferTime?: number // buffer between appointments in minutes
}

interface BookingCalendarState {
  selectedService: Service | null
  selectedDate: Date | null
  availableTimeSlots: TimeSlot[]
  isLoading: boolean
  error: string | null
  staff: Staff[]
  rooms: Room[]
}

interface UseBookingCalendarReturn extends BookingCalendarState {
  // Actions
  setSelectedService: (service: Service | null) => void
  setSelectedDate: (date: Date | null) => void
  refreshAvailability: () => Promise<void>
  submitBooking: (data: BookingFormData) => Promise<any>
  
  // Computed values
  filteredServices: Service[]
  servicesByCategory: Record<string, Service[]>
  isDateAvailable: (date: Date) => boolean
  getTimeSlotsForDate: (date: Date) => TimeSlot[]
  
  // Helpers
  formatTimeSlot: (slot: TimeSlot) => string
  getServiceDuration: (serviceId: string) => number
  calculateEndTime: (startTime: string, duration: number) => string
}

export const useBookingCalendar = (options: UseBookingCalendarOptions = {}): UseBookingCalendarReturn => {
  const {
    services = [],
    defaultServiceId,
    preSelectedService,
    minDate = new Date(),
    maxDate = addDays(new Date(), 90),
    businessHours = {
      start: '09:00',
      end: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday
    },
    timeSlotDuration = 30,
    bufferTime = 15
  } = options

  const [state, setState] = useState<BookingCalendarState>({
    selectedService: null,
    selectedDate: null,
    availableTimeSlots: [],
    isLoading: false,
    error: null,
    staff: [],
    rooms: []
  })

  // Initialize default service
  useEffect(() => {
    if (defaultServiceId && services.length > 0) {
      const defaultService = services.find(s => s.id === defaultServiceId)
      if (defaultService) {
        setState(prev => ({ ...prev, selectedService: defaultService }))
      }
    }
  }, [defaultServiceId, services])

  // Initialize pre-selected service (takes priority over defaultServiceId)
  useEffect(() => {
    if (preSelectedService) {
      setState(prev => ({ ...prev, selectedService: preSelectedService }))
    }
  }, [preSelectedService])

  // Filter active services
  const filteredServices = useMemo(() => {
    return services.filter(service => service.isActive)
  }, [services])

  // Group services by category
  const servicesByCategory = useMemo(() => {
    return filteredServices.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = []
      }
      acc[service.category].push(service)
      return acc
    }, {} as Record<string, Service[]>)
  }, [filteredServices])

  // Generate time slots for a given date
  const generateTimeSlots = useCallback((date: Date, service: Service): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const dayOfWeek = date.getDay()
    
    // Check if the day is in business hours
    if (!businessHours.daysOfWeek.includes(dayOfWeek)) {
      return slots
    }

    const [startHour, startMinute] = businessHours.start.split(':').map(Number)
    const [endHour, endMinute] = businessHours.end.split(':').map(Number)
    
    const startTime = new Date(date)
    startTime.setHours(startHour, startMinute, 0, 0)
    
    const endTime = new Date(date)
    endTime.setHours(endHour, endMinute, 0, 0)
    
    // Generate slots
    let currentTime = new Date(startTime)
    const serviceDuration = service.duration
    
    while (currentTime.getTime() + (serviceDuration + bufferTime) * 60000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000)
      
      // Check if slot is in the future (for today)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      const isPast = isToday && currentTime <= now
      
      if (!isPast) {
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          available: true, // This will be updated based on existing bookings
          staffId: undefined,
          roomId: undefined
        })
      }
      
      // Move to next slot
      currentTime = new Date(currentTime.getTime() + timeSlotDuration * 60000)
    }
    
    return slots
  }, [businessHours, timeSlotDuration, bufferTime])

  // Check if a date is available for booking
  const isDateAvailable = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay()
    const isInBusinessDays = businessHours.daysOfWeek.includes(dayOfWeek)
    const isInDateRange = isWithinInterval(date, { start: startOfDay(minDate), end: endOfDay(maxDate) })
    const isFuture = date >= startOfDay(new Date())
    
    return isInBusinessDays && isInDateRange && isFuture
  }, [businessHours.daysOfWeek, minDate, maxDate])

  // Get time slots for a specific date
  const getTimeSlotsForDate = useCallback((date: Date): TimeSlot[] => {
    if (!state.selectedService || !isDateAvailable(date)) {
      return []
    }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    return state.availableTimeSlots.filter(slot => 
      slot.start.startsWith(dateStr) && slot.available
    )
  }, [state.selectedService, state.availableTimeSlots, isDateAvailable])

  // Format time slot for display
  const formatTimeSlot = useCallback((slot: TimeSlot): string => {
    const start = parseISO(slot.start)
    const end = parseISO(slot.end)
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }, [])

  // Get service duration
  const getServiceDuration = useCallback((serviceId: string): number => {
    const service = services.find(s => s.id === serviceId)
    return service?.duration || 60
  }, [services])

  // Calculate end time
  const calculateEndTime = useCallback((startTime: string, duration: number): string => {
    const start = parseISO(startTime)
    const end = new Date(start.getTime() + duration * 60000)
    return end.toISOString()
  }, [])

  // Fetch available time slots
  const fetchAvailableTimeSlots = useCallback(async (service: Service, dateRange?: { start: Date; end: Date }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Generate time slots for the date range
      const start = dateRange?.start || minDate
      const end = dateRange?.end || maxDate
      const allSlots: TimeSlot[] = []
      
      // Generate slots for each day in the range
      for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
        if (isDateAvailable(date)) {
          const daySlots = generateTimeSlots(date, service)
          allSlots.push(...daySlots)
        }
      }
      
      // In a real app, you would fetch existing bookings from the API
      // and mark conflicting slots as unavailable
      // For now, we'll simulate some unavailable slots
      const unavailableSlots = await fetchExistingBookings(service.id, start, end)
      
      // Mark conflicting slots as unavailable
      allSlots.forEach(slot => {
        const hasConflict = unavailableSlots.some(booking => {
          const slotStart = parseISO(slot.start)
          const slotEnd = parseISO(slot.end)
          const bookingStart = parseISO(booking.startTime)
          const bookingEnd = parseISO(booking.endTime)
          
          return (
            (slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd)
          )
        })
        
        if (hasConflict) {
          slot.available = false
        }
      })
      
      setState(prev => ({
        ...prev,
        availableTimeSlots: allSlots,
        isLoading: false
      }))
    } catch (error) {
      console.error('Failed to fetch available time slots:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to load available time slots',
        isLoading: false
      }))
    }
  }, [minDate, maxDate, isDateAvailable, generateTimeSlots])

  // Mock function to fetch existing bookings
  // In a real app, this would be an API call
  const fetchExistingBookings = async (serviceId: string, start: Date, end: Date) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock some existing bookings
    const mockBookings = [
      {
        id: '1',
        serviceId,
        startTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00:00"),
        endTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'11:00:00"),
      },
      {
        id: '2',
        serviceId,
        startTime: format(addDays(new Date(), 2), "yyyy-MM-dd'T'14:00:00"),
        endTime: format(addDays(new Date(), 2), "yyyy-MM-dd'T'15:30:00"),
      }
    ]
    
    return mockBookings
  }

  // Set selected service
  const setSelectedService = useCallback((service: Service | null) => {
    setState(prev => ({ ...prev, selectedService: service, selectedDate: null }))
    
    if (service) {
      fetchAvailableTimeSlots(service)
    }
  }, [fetchAvailableTimeSlots])

  // Set selected date
  const setSelectedDate = useCallback((date: Date | null) => {
    setState(prev => ({ ...prev, selectedDate: date }))
  }, [])

  // Refresh availability
  const refreshAvailability = useCallback(async () => {
    if (state.selectedService) {
      await fetchAvailableTimeSlots(state.selectedService)
    }
  }, [state.selectedService, fetchAvailableTimeSlots])

  // Submit booking
  const submitBooking = useCallback(async (data: BookingFormData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Make actual API call to create booking with customer info
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: state.selectedService?.id,
          date: data.date,
          time: data.time,
          specialRequests: data.notes || '',
          // Customer information
          customerFirstName: data.customerFirstName,
          customerLastName: data.customerLastName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone
        }),
      })

      const result = await response.json()
      
      if (!response.ok || !result.success) {
        console.error('API Error Response:', result)
        console.error('Validation Details:', result.details)
        throw new Error(result.error || 'Failed to create booking')
      }
      
      console.log('Booking created successfully:', result.data)
      
      // Refresh availability after successful booking
      await refreshAvailability()
      
      setState(prev => ({ ...prev, isLoading: false }))
      
      // Return the booking result for the confirmation message
      return result
    } catch (error) {
      console.error('Failed to submit booking:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to submit booking. Please try again.',
        isLoading: false
      }))
      throw error
    }
  }, [refreshAvailability, state.selectedService])

  return {
    // State
    ...state,
    
    // Actions
    setSelectedService,
    setSelectedDate,
    refreshAvailability,
    submitBooking,
    
    // Computed values
    filteredServices,
    servicesByCategory,
    isDateAvailable,
    getTimeSlotsForDate,
    
    // Helpers
    formatTimeSlot,
    getServiceDuration,
    calculateEndTime
  }
}

export default useBookingCalendar