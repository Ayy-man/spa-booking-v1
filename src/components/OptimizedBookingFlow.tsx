/**
 * OptimizedBookingFlow Component
 * 
 * Demonstrates the complete integration of DatePicker and TimeSlotPicker
 * with the optimized availability system and database queries.
 * 
 * Features:
 * - Real-time availability checking
 * - Efficient date/time selection
 * - Conflict detection and validation
 * - Performance monitoring
 * - Error handling and loading states
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DatePicker from './DatePicker'
import TimeSlotPicker from './TimeSlotPicker'
import { useAvailability } from '@/hooks/useAvailability'
import { 
  BookingFormData, 
  Service, 
  Staff, 
  Room,
  TimeSlotOption,
  BookingConflict 
} from '@/types'

interface OptimizedBookingFlowProps {
  services: Service[]
  staff: Staff[]
  rooms: Room[]
  onBookingComplete?: (booking: BookingFormData) => void
  className?: string
}

const OptimizedBookingFlow: React.FC<OptimizedBookingFlowProps> = ({
  services,
  staff,
  rooms,
  onBookingComplete,
  className = ''
}) => {
  // Form state
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [specialRequests, setSpecialRequests] = useState('')

  // Validation state
  const [showValidation, setShowValidation] = useState(false)
  const [conflicts, setConflicts] = useState<BookingConflict[]>([])

  // Availability hook with optimizations
  const {
    dateAvailability,
    dateLoading,
    dateError,
    timeSlots,
    timeSlotsLoading,
    timeSlotsError,
    validationResult,
    validationLoading,
    fetchTimeSlots,
    validateBooking,
    isDateAvailable,
    getDateInfo,
    preloadData
  } = useAvailability({
    enableRealTimeUpdates: true,
    autoPreload: true
  })

  // Preload next few days on component mount
  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() + i)
      return date.toISOString().split('T')[0]
    })
    preloadData(dates)
  }, [preloadData])

  // Fetch time slots when date/service changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      fetchTimeSlots({
        date: dateStr,
        serviceId: selectedService.id,
        staffId: selectedStaff?.id,
        roomId: selectedRoom?.id
      })
    }
  }, [selectedDate, selectedService, selectedStaff, selectedRoom, fetchTimeSlots])

  // Validate booking when all required fields are selected
  useEffect(() => {
    if (selectedDate && selectedTime && selectedStaff && selectedRoom && selectedService) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      validateBooking({
        roomId: selectedRoom.id,
        staffId: selectedStaff.id,
        date: dateStr,
        startTime: selectedTime,
        duration: selectedService.duration
      })
    }
  }, [selectedDate, selectedTime, selectedStaff, selectedRoom, selectedService, validateBooking])

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null) // Reset time when date changes
    setShowValidation(false)
  }, [])

  // Handle time selection
  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time)
    setShowValidation(true)
  }, [])

  // Handle service selection
  const handleServiceSelect = useCallback((service: Service) => {
    setSelectedService(service)
    setSelectedTime(null) // Reset time when service changes
    
    // Auto-select compatible rooms and staff
    const compatibleRooms = rooms.filter(room => {
      // Check room capacity and special requirements
      return room.bedCapacity >= service.minRoomCapacity &&
             (!service.requiresSpecializedDrainage || room.hasSpecializedDrainage) &&
             (!service.allowedRoomIds || service.allowedRoomIds.includes(room.id))
    })
    
    if (compatibleRooms.length === 1) {
      setSelectedRoom(compatibleRooms[0])
    }

    const compatibleStaff = staff.filter(s => 
      s.specializations.includes(service.category)
    )
    
    if (compatibleStaff.length === 1) {
      setSelectedStaff(compatibleStaff[0])
    }
  }, [rooms, staff])

  // Handle booking submission
  const handleSubmit = useCallback(() => {
    if (!selectedDate || !selectedTime || !selectedService || !selectedStaff || !selectedRoom) {
      return
    }

    const bookingData: BookingFormData = {
      serviceId: selectedService.id,
      staffId: selectedStaff.id,
      roomId: selectedRoom.id,
      date: selectedDate.toISOString().split('T')[0],
      time: selectedTime,
      specialRequests: specialRequests || undefined
    }

    onBookingComplete?.(bookingData)
  }, [selectedDate, selectedTime, selectedService, selectedStaff, selectedRoom, specialRequests, onBookingComplete])

  // Enhanced time slots with suggestions
  const enhancedTimeSlots: TimeSlotOption[] = timeSlots.map(slot => ({
    ...slot,
    suggestedStaffId: slot.suggestedStaffId || selectedStaff?.id,
    suggestedRoomId: slot.suggestedRoomId || selectedRoom?.id
  }))

  const canProceed = selectedDate && selectedTime && selectedService && selectedStaff && selectedRoom &&
                    validationResult?.isValid

  return (
    <div className={`optimized-booking-flow space-y-8 ${className}`}>
      {/* Performance Indicator */}
      <div className="bg-gradient-to-r from-spa-50 to-cream-50 rounded-xl p-4 border border-spa-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-100 to-green-200">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Optimized Booking System</h3>
              <p className="text-sm text-gray-600">Real-time availability with intelligent caching</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700">
              {dateAvailability.length} days loaded
            </div>
            <div className="text-xs text-gray-500">
              {dateLoading ? 'Updating...' : 'Data fresh'}
            </div>
          </div>
        </div>
      </div>

      {/* Service Selection */}
      <div className="service-selection">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-spa-100 to-spa-200">
            <svg className="w-5 h-5 text-spa-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          Select Service
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <motion.button
              key={service.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleServiceSelect(service)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedService?.id === service.id
                  ? 'border-spa-500 bg-spa-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-spa-300 hover:shadow-md'
              }`}
            >
              <div className="font-semibold text-gray-800">{service.name}</div>
              <div className="text-sm text-gray-600 mt-1">{service.duration} minutes</div>
              <div className="text-spa-600 font-medium mt-2">${service.price}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Date Selection */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DatePicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              className="date-picker-optimized"
            />
            
            {/* Date availability info */}
            {selectedDate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  {(() => {
                    const dateStr = selectedDate.toISOString().split('T')[0]
                    const dateInfo = getDateInfo(dateStr)
                    if (dateInfo) {
                      return `${dateInfo.availableSlots} of ${dateInfo.totalSlots} slots available`
                    }
                    return 'Checking availability...'
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Selection */}
      <AnimatePresence>
        {selectedDate && selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TimeSlotPicker
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onTimeSelect={handleTimeSelect}
              availableSlots={enhancedTimeSlots}
              className="time-picker-optimized"
            />
            
            {timeSlotsLoading && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-spa-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Loading time slots...</span>
                </div>
              </div>
            )}
            
            {timeSlotsError && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-sm text-red-800">{timeSlotsError}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Results */}
      <AnimatePresence>
        {showValidation && validationResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="validation-results"
          >
            {validationResult.isValid ? (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800">Booking Available</h4>
                    <p className="text-sm text-green-700">Your selected time slot is available</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800">Booking Conflict</h4>
                    <div className="text-sm text-red-700 mt-1">
                      {!validationResult.roomAvailable && <div>• Room not available</div>}
                      {!validationResult.staffAvailable && <div>• Staff not available</div>}
                      {validationResult.conflicts.map(conflict => (
                        <div key={conflict.bookingId}>
                          • {conflict.conflictType.replace('_', ' ')}: {conflict.resourceName}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special Requests */}
      <AnimatePresence>
        {selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="special-requests"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Requests (Optional)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any special requests or notes for your appointment..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500"
              rows={3}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <AnimatePresence>
        {canProceed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="w-full py-4 bg-gradient-to-r from-spa-500 to-spa-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Complete Booking
          </motion.button>
        )}
      </AnimatePresence>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 p-4 bg-gray-50 rounded-lg">
          <summary className="cursor-pointer font-medium text-gray-700">Debug Info</summary>
          <pre className="mt-2 text-xs text-gray-600 overflow-auto">
            {JSON.stringify({
              selectedService: selectedService?.name,
              selectedDate: selectedDate?.toISOString().split('T')[0],
              selectedTime,
              availableSlots: enhancedTimeSlots.filter(s => s.available).length,
              validationResult
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

export default OptimizedBookingFlow