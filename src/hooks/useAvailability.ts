/**
 * useAvailability Hook
 * 
 * Custom React hook for managing availability data with the DatePicker and TimeSlotPicker components.
 * Provides optimized caching, real-time updates, and error handling.
 * 
 * Features:
 * - Automatic date availability fetching for DatePicker
 * - Dynamic time slot loading for TimeSlotPicker
 * - Efficient caching and invalidation
 * - Real-time validation and conflict checking
 * - Loading states and error handling
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  DateAvailability, 
  TimeSlotOption, 
  AvailabilityQuery, 
  BookingConflict,
  AvailabilityResponse 
} from '@/types'

interface UseAvailabilityOptions {
  enableRealTimeUpdates?: boolean
  cacheTimeout?: number
  autoPreload?: boolean
}

interface UseAvailabilityReturn {
  // Date availability data
  dateAvailability: DateAvailability[]
  dateLoading: boolean
  dateError: string | null
  
  // Time slot data
  timeSlots: TimeSlotOption[]
  timeSlotsLoading: boolean
  timeSlotsError: string | null
  
  // Validation data
  validationResult: {
    isValid: boolean
    roomAvailable: boolean
    staffAvailable: boolean
    conflicts: BookingConflict[]
  } | null
  validationLoading: boolean
  validationError: string | null
  
  // Actions
  fetchDateAvailability: (days?: number) => Promise<void>
  fetchTimeSlots: (query: AvailabilityQuery) => Promise<void>
  validateBooking: (data: {
    roomId: string
    staffId: string
    date: string
    startTime: string
    endTime?: string
    duration?: number
    excludeBookingId?: string
  }) => Promise<void>
  clearCache: () => void
  preloadData: (dates?: string[]) => Promise<void>
  
  // Utility functions
  getAvailableSlots: (date: string) => TimeSlotOption[]
  isDateAvailable: (date: string) => boolean
  getDateInfo: (date: string) => DateAvailability | null
}

export function useAvailability(options: UseAvailabilityOptions = {}): UseAvailabilityReturn {
  const {
    enableRealTimeUpdates = false,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    autoPreload = true
  } = options

  // Date availability state
  const [dateAvailability, setDateAvailability] = useState<DateAvailability[]>([])
  const [dateLoading, setDateLoading] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  // Time slots state
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([])
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false)
  const [timeSlotsError, setTimeSlotsError] = useState<string | null>(null)

  // Validation state
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    roomAvailable: boolean
    staffAvailable: boolean
    conflicts: BookingConflict[]
  } | null>(null)
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Cache management
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map())

  // Utility function to check cache validity
  const isCacheValid = useCallback((key: string): boolean => {
    const cached = cache.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < cacheTimeout
  }, [cache, cacheTimeout])

  // Fetch date availability
  const fetchDateAvailability = useCallback(async (days: number = 14) => {
    const cacheKey = `date-availability-${days}`
    
    if (isCacheValid(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (cached) {
        setDateAvailability(cached.data)
        return
      }
    }

    setDateLoading(true)
    setDateError(null)

    try {
      const response = await fetch(`/api/availability?days=${days}`)
      const result: AvailabilityResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch date availability')
      }

      const availabilityData = result.data.dateAvailability
      setDateAvailability(availabilityData)

      // Update cache
      setCache(prev => new Map(prev.set(cacheKey, {
        data: availabilityData,
        timestamp: Date.now()
      })))

    } catch (error) {
      console.error('Error fetching date availability:', error)
      setDateError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setDateLoading(false)
    }
  }, [cache, isCacheValid])

  // Fetch time slots for a specific date
  const fetchTimeSlots = useCallback(async (query: AvailabilityQuery) => {
    const cacheKey = `time-slots-${JSON.stringify(query)}`
    
    if (isCacheValid(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (cached) {
        setTimeSlots(cached.data)
        return
      }
    }

    setTimeSlotsLoading(true)
    setTimeSlotsError(null)

    try {
      const params = new URLSearchParams()
      if (query.date) params.append('date', query.date)
      if (query.serviceId) params.append('service', query.serviceId)
      if (query.staffId) params.append('staff', query.staffId)
      if (query.roomId) params.append('room', query.roomId)
      params.append('includeTimeSlots', 'true')

      const response = await fetch(`/api/availability?${params.toString()}`)
      const result: AvailabilityResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch time slots')
      }

      const slotsData = result.data.timeSlots || []
      setTimeSlots(slotsData)

      // Update cache with shorter TTL for time slots
      setCache(prev => new Map(prev.set(cacheKey, {
        data: slotsData,
        timestamp: Date.now()
      })))

    } catch (error) {
      console.error('Error fetching time slots:', error)
      setTimeSlotsError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setTimeSlotsLoading(false)
    }
  }, [cache, isCacheValid])

  // Validate booking availability
  const validateBooking = useCallback(async (data: {
    roomId: string
    staffId: string
    date: string
    startTime: string
    endTime?: string
    duration?: number
    excludeBookingId?: string
  }) => {
    setValidationLoading(true)
    setValidationError(null)

    try {
      const response = await fetch('/api/availability/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Validation failed')
      }

      setValidationResult(result.data)

    } catch (error) {
      console.error('Error validating booking:', error)
      setValidationError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setValidationLoading(false)
    }
  }, [])

  // Clear cache
  const clearCache = useCallback(() => {
    setCache(new Map())
  }, [])

  // Preload data for better performance
  const preloadData = useCallback(async (dates?: string[]) => {
    try {
      if (!dates || dates.length === 0) {
        // Preload general availability
        await fetch('/api/availability?preload=true')
      } else {
        // Preload specific dates
        await fetch('/api/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dates })
        })
      }
    } catch (error) {
      console.error('Error preloading data:', error)
      // Don't throw - preloading is optional
    }
  }, [])

  // Utility functions
  const getAvailableSlots = useCallback((date: string): TimeSlotOption[] => {
    // This would typically filter timeSlots by date if we had multiple dates
    return timeSlots.filter(slot => slot.available)
  }, [timeSlots])

  const isDateAvailable = useCallback((date: string): boolean => {
    const dateInfo = dateAvailability.find(d => d.date === date)
    return dateInfo?.hasAvailability || false
  }, [dateAvailability])

  const getDateInfo = useCallback((date: string): DateAvailability | null => {
    return dateAvailability.find(d => d.date === date) || null
  }, [dateAvailability])

  // Auto-load initial data
  useEffect(() => {
    if (autoPreload) {
      fetchDateAvailability()
    }
  }, [autoPreload, fetchDateAvailability])

  // Set up real-time updates if enabled
  useEffect(() => {
    if (!enableRealTimeUpdates) return

    const interval = setInterval(() => {
      // Refresh data periodically
      fetchDateAvailability()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [enableRealTimeUpdates, fetchDateAvailability])

  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    // State
    dateAvailability,
    dateLoading,
    dateError,
    timeSlots,
    timeSlotsLoading,
    timeSlotsError,
    validationResult,
    validationLoading,
    validationError,
    
    // Actions
    fetchDateAvailability,
    fetchTimeSlots,
    validateBooking,
    clearCache,
    preloadData,
    
    // Utilities
    getAvailableSlots,
    isDateAvailable,
    getDateInfo
  }), [
    dateAvailability,
    dateLoading,
    dateError,
    timeSlots,
    timeSlotsLoading,
    timeSlotsError,
    validationResult,
    validationLoading,
    validationError,
    fetchDateAvailability,
    fetchTimeSlots,
    validateBooking,
    clearCache,
    preloadData,
    getAvailableSlots,
    isDateAvailable,
    getDateInfo
  ])
}