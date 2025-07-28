'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parse, isBefore } from 'date-fns'
import { TimeSlotOption } from '@/types'
import { parseTimeToDatabase } from '@/lib/availability'

interface TimeSlotPickerProps {
  selectedDate: Date | null
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  availableSlots?: TimeSlotOption[]
  className?: string
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  selectedTime,
  onTimeSelect,
  availableSlots,
  className = ''
}) => {
  // Generate realistic spa appointment times if no slots provided
  const defaultTimeSlots = useMemo(() => {
    const slots: TimeSlotOption[] = []
    const times = [
      '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
      '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
      '6:00 PM', '6:30 PM', '7:00 PM'
    ]

    times.forEach((time, index) => {
      slots.push({
        id: `slot-${index}`,
        time,
        timeValue: parseTimeToDatabase(time),
        available: Math.random() > 0.3, // 70% availability rate
        availableStaffCount: Math.floor(Math.random() * 3) + 1,
        availableRoomCount: Math.floor(Math.random() * 2) + 1
      })
    })

    return slots
  }, [])

  const timeSlots = availableSlots || defaultTimeSlots

  // Group slots by morning and afternoon
  const { morningSlots, afternoonSlots } = useMemo(() => {
    const morning: TimeSlotOption[] = []
    const afternoon: TimeSlotOption[] = []

    timeSlots.forEach(slot => {
      const time24 = parse(slot.time, 'h:mm a', new Date())
      const hour = time24.getHours()
      
      if (hour < 12) {
        morning.push(slot)
      } else {
        afternoon.push(slot)
      }
    })

    return { morningSlots: morning, afternoonSlots: afternoon }
  }, [timeSlots])

  if (!selectedDate) {
    return (
      <div className={`time-slot-picker ${className}`}>
        <div className="text-center py-8">
          <div className="p-4 rounded-xl bg-gradient-to-br from-spa-50 to-cream-50 border border-spa-200 inline-block">
            <svg className="w-8 h-8 text-spa-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-spa-600 font-medium">Select a date first</p>
            <p className="text-sm text-gray-500 mt-1">Choose your preferred date to view available times</p>
          </div>
        </div>
      </div>
    )
  }

  const handleTimeClick = (time: string, available: boolean) => {
    if (available) {
      onTimeSelect(time)
    }
  }

  const renderTimeSlots = (slots: TimeSlotOption[], title: string, icon: React.ReactNode) => (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-spa-100 to-spa-200">
          {icon}
        </div>
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
        <span className="text-sm text-gray-500">({slots.filter(s => s.available).length} available)</span>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {slots.map((slot, index) => {
          const isSelected = selectedTime === slot.time
          const isAvailable = slot.available

          return (
            <motion.button
              key={slot.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleTimeClick(slot.time, isAvailable)}
              disabled={!isAvailable}
              className={`
                relative px-3 py-3 sm:px-4 sm:py-3 rounded-xl border transition-all duration-200 text-sm font-medium min-h-[50px] flex items-center justify-center
                ${isSelected
                  ? 'bg-gradient-to-br from-spa-500 to-spa-600 text-white shadow-lg scale-105 border-spa-600'
                  : isAvailable
                    ? 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-spa-300 hover:bg-spa-50 hover:shadow-md text-gray-700 hover:text-spa-700 hover:scale-105'
                    : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                }
                active:scale-95 focus:outline-none focus:ring-2 focus:ring-spa-500 focus:ring-offset-2
              `}
            >
              {slot.time}
              
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-spa-500 rounded-full" />
                </motion.div>
              )}

              {/* Availability indicator with staff/room count */}
              {isAvailable && slot.availableStaffCount > 0 && (
                <div className="absolute -bottom-1 -right-1 text-xs bg-spa-100 text-spa-700 px-1 rounded-full">
                  {slot.availableStaffCount}
                </div>
              )}

              {/* Unavailable overlay */}
              {!isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-8 bg-gray-300 rotate-45 absolute" />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`time-slot-picker ${className}`}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-spa-100 to-spa-200">
            <svg className="w-5 h-5 text-spa-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Available Times
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Choose your preferred time for {format(selectedDate, 'EEEE, MMMM d')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Morning Slots */}
        {morningSlots.length > 0 && renderTimeSlots(
          morningSlots,
          'Morning',
          <svg className="w-5 h-5 text-spa-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}

        {/* Afternoon Slots */}
        {afternoonSlots.length > 0 && renderTimeSlots(
          afternoonSlots,
          'Afternoon',
          <svg className="w-5 h-5 text-spa-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </div>

      {/* No available slots message */}
      {timeSlots.filter(slot => slot.available).length === 0 && (
        <div className="text-center py-8">
          <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 inline-block max-w-sm">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-gray-600 font-medium mb-1">No times available</p>
            <p className="text-sm text-gray-500">Please select a different date</p>
          </div>
        </div>
      )}

      {/* Selection summary */}
      {selectedTime && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-4 bg-gradient-to-br from-spa-50 to-cream-50 rounded-xl border border-spa-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-spa-500 to-spa-600">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">Time Selected</p>
              <p className="text-sm text-gray-600">
                {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default TimeSlotPicker