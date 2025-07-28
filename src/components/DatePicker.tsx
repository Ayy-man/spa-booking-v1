'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { addDays, format, isToday, isBefore, startOfDay, isSameDay } from 'date-fns'

interface DatePickerProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateSelect,
  minDate = new Date(),
  maxDate = addDays(new Date(), 90),
  className = ''
}) => {
  // Generate next 14 days starting from today
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  const handleDateClick = (date: Date) => {
    // Don't allow selection of past dates
    if (isBefore(date, startOfDay(minDate))) {
      return
    }
    onDateSelect(date)
  }

  return (
    <div className={`date-picker ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-spa-100 to-spa-200">
            <svg className="w-5 h-5 text-spa-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          Select Date
        </h3>
        <p className="text-sm text-gray-600 mt-1">Choose your preferred appointment date</p>
      </div>

      {/* Date Grid - 2 rows x 7 days */}
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {dates.map((date, index) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const isCurrentDay = isToday(date)
          const isPastDate = isBefore(date, startOfDay(minDate))
          const dayName = format(date, 'EEE')
          const dayNumber = format(date, 'd')

          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleDateClick(date)}
              disabled={isPastDate}
              className={`
                relative p-3 sm:p-4 rounded-xl border transition-all duration-200 text-center min-h-[80px] sm:min-h-[90px] flex flex-col justify-center items-center gap-1
                ${isSelected 
                  ? 'bg-gradient-to-br from-spa-500 to-spa-600 text-white shadow-lg scale-105 border-spa-600' 
                  : isCurrentDay
                    ? 'bg-gradient-to-br from-cream-100 to-cream-200 border-cream-300 text-gray-800 shadow-md'
                    : isPastDate
                      ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:border-spa-300 hover:bg-spa-50 hover:shadow-md text-gray-700 hover:text-spa-700'
                }
                active:scale-95 focus:outline-none focus:ring-2 focus:ring-spa-500 focus:ring-offset-2
              `}
            >
              {/* Today indicator */}
              {isCurrentDay && !isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-sm" />
              )}
              
              {/* Day name */}
              <span className={`text-xs font-medium uppercase tracking-wide ${
                isSelected ? 'text-white/90' : 'text-gray-500'
              }`}>
                {dayName}
              </span>
              
              {/* Date number */}
              <span className={`text-lg font-bold ${
                isSelected ? 'text-white' : isCurrentDay ? 'text-gray-800' : 'text-gray-700'
              }`}>
                {dayNumber}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-sm"
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Quick navigation hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Showing next 14 days • Today is highlighted
        </p>
      </div>
    </div>
  )
}

export default DatePicker