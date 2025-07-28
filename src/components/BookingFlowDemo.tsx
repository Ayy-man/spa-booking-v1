'use client'

import React, { useState, useCallback } from 'react'
import { format } from 'date-fns'
import DatePicker from './DatePicker'
import TimeSlotPicker from './TimeSlotPicker'
import { useAvailability } from '@/hooks/useAvailability'
import { TimeSlotOption } from '@/types'

/**
 * Demo component showing the optimized booking flow
 * with the new DatePicker and TimeSlotPicker components
 */
const BookingFlowDemo: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string>('')

  // Use the optimized availability hook
  const {
    dateAvailability,
    dateLoading,
    dateError,
    timeSlots,
    timeSlotsLoading,
    timeSlotsError,
    fetchTimeSlots,
    isDateAvailable
  } = useAvailability({
    enableRealTimeUpdates: true,
    autoPreload: true
  })

  // Handle date selection
  const handleDateSelect = useCallback(async (date: Date) => {
    setSelectedDate(date)
    setSelectedTime(null) // Reset time when date changes
    
    // Fetch time slots for the selected date
    const dateString = format(date, 'yyyy-MM-dd')
    await fetchTimeSlots({
      date: dateString,
      serviceId: selectedService || undefined
    })
  }, [fetchTimeSlots, selectedService])

  // Handle time selection
  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time)
  }, [])

  // Handle service change
  const handleServiceChange = useCallback(async (serviceId: string) => {
    setSelectedService(serviceId)
    setSelectedTime(null) // Reset time when service changes
    
    // Refetch time slots with new service filter
    if (selectedDate) {
      const dateString = format(selectedDate, 'yyyy-MM-dd')
      await fetchTimeSlots({
        date: dateString,
        serviceId: serviceId || undefined
      })
    }
  }, [fetchTimeSlots, selectedDate])

  // Create booking
  const handleCreateBooking = useCallback(async () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both date and time')
      return
    }

    try {
      const bookingData = {
        serviceId: selectedService || 'default-service-id',
        customerId: 'demo-customer-id',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        specialRequests: ''
      }

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()

      if (result.success) {
        alert('Booking created successfully!')
        // Reset selections
        setSelectedDate(null)
        setSelectedTime(null)
      } else {
        alert(`Booking failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    }
  }, [selectedDate, selectedTime, selectedService])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Optimized Spa Booking System
        </h1>
        <p className="text-gray-600">
          Experience our enhanced date and time selection with real-time availability
        </p>
      </div>

      {/* Service Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Select Service (Optional)
        </h2>
        <select
          value={selectedService}
          onChange={(e) => handleServiceChange(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500"
        >
          <option value="">All Services</option>
          <option value="service-1">Swedish Massage</option>
          <option value="service-2">Deep Tissue Massage</option>
          <option value="service-3">Body Scrub</option>
          <option value="service-4">Facial Treatment</option>
        </select>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <DatePicker
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          className="w-full"
        />
        
        {dateLoading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-spa-600">
              <div className="w-4 h-4 border-2 border-spa-600 border-t-transparent rounded-full animate-spin"></div>
              Loading availability...
            </div>
          </div>
        )}
        
        {dateError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            Error loading dates: {dateError}
          </div>
        )}
      </div>

      {/* Time Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <TimeSlotPicker
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onTimeSelect={handleTimeSelect}
          availableSlots={timeSlots}
          className="w-full"
        />
        
        {timeSlotsLoading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 text-spa-600">
              <div className="w-4 h-4 border-2 border-spa-600 border-t-transparent rounded-full animate-spin"></div>
              Loading time slots...
            </div>
          </div>
        )}
        
        {timeSlotsError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            Error loading time slots: {timeSlotsError}
          </div>
        )}
      </div>

      {/* Booking Summary */}
      {selectedDate && selectedTime && (
        <div className="bg-gradient-to-br from-spa-50 to-cream-50 rounded-xl shadow-lg p-6 border border-spa-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Booking Summary
          </h3>
          <div className="space-y-2 text-gray-700">
            <p><strong>Date:</strong> {format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
            <p><strong>Time:</strong> {selectedTime}</p>
            {selectedService && <p><strong>Service:</strong> {selectedService}</p>}
          </div>
          
          <button
            onClick={handleCreateBooking}
            className="mt-6 w-full bg-gradient-to-r from-spa-500 to-spa-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-spa-600 hover:to-spa-700 focus:outline-none focus:ring-2 focus:ring-spa-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Create Booking
          </button>
        </div>
      )}

      {/* API Performance Info */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          System Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <strong>Date Availability:</strong>
            <br />
            {dateAvailability.length} days loaded
          </div>
          <div>
            <strong>Time Slots:</strong>
            <br />
            {timeSlots.length} slots available
          </div>
          <div>
            <strong>Cache Status:</strong>
            <br />
            Optimized caching active
          </div>
        </div>
      </div>

      {/* Development Info */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Development Notes
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>✅ Optimized database queries with specialized indexes</li>
          <li>✅ Efficient API responses returning only available slots</li>
          <li>✅ Real-time cache invalidation on booking changes</li>
          <li>✅ Business rules enforcement (Room 3 for body scrubs)</li>
          <li>✅ Enhanced error handling and validation</li>
          <li>✅ Responsive design with modern UI components</li>
        </ul>
      </div>
    </div>
  )
}

export default BookingFlowDemo