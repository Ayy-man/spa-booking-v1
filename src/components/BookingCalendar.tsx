'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  ChevronDown, 
  Loader2, 
  Check, 
  X,
  Sparkles,
  Star,
  Heart,
  Leaf
} from 'lucide-react'
import { format, addDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { Service, TimeSlot, BookingFormData } from '@/types'
import DatePicker from './DatePicker'
import TimeSlotPicker from './TimeSlotPicker'

// Category icons mapping for premium visual appeal
const categoryIcons = {
  massage: Heart,
  facial: Sparkles,
  body_treatment: Leaf,
  nail_care: Star,
  hair_removal: Sparkles,
  wellness: Sparkles,
} as const

// Service category colors with spa theme
const categoryColors = {
  massage: 'from-rose-100 to-pink-100 border-rose-200',
  facial: 'from-purple-100 to-lavender-100 border-purple-200',
  body_treatment: 'from-green-100 to-emerald-100 border-green-200',
  nail_care: 'from-amber-100 to-yellow-100 border-amber-200',
  hair_removal: 'from-red-100 to-orange-100 border-red-200',
  wellness: 'from-blue-100 to-cyan-100 border-blue-200',
} as const

interface BookingCalendarProps {
  services: Service[]
  availableTimeSlots: TimeSlot[]
  isLoading?: boolean
  onBookingSubmit: (data: BookingFormData) => Promise<void>
  onDateChange?: (date: Date) => void
  onServiceChange?: (serviceId: string) => void
  preSelectedService?: Service | null
  hideServiceSelection?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
  businessHours?: {
    start: string
    end: string
    daysOfWeek: number[]
  }
}

interface SelectedSlot {
  date: string
  startTime: string
  endTime: string
  service: Service
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  services,
  availableTimeSlots,
  isLoading = false,
  onBookingSubmit,
  onDateChange,
  onServiceChange,
  preSelectedService = null,
  hideServiceSelection = false,
  className = '',
  minDate = new Date(),
  maxDate = addDays(new Date(), 90),
  businessHours = {
    start: '09:00',
    end: '18:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday
  }
}) => {
  const [selectedService, setSelectedService] = useState<Service | null>(preSelectedService)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  
  // Customer information state
  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Update selected service when preSelectedService changes
  useEffect(() => {
    if (preSelectedService) {
      setSelectedService(preSelectedService)
    }
  }, [preSelectedService])

  // Convert TimeSlot[] to TimeSlotPicker format
  const timeSlots = useMemo(() => {
    if (!selectedService || !selectedDate) return []
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return availableTimeSlots
      .filter(slot => slot.start.startsWith(dateStr) && slot.available)
      .map(slot => ({
        id: `${slot.start}-${slot.end}`,
        time: format(new Date(slot.start), 'h:mm a'),
        timeValue: format(new Date(slot.start), 'HH:mm'),
        available: slot.available,
        availableStaffCount: 1,
        availableRoomCount: 1
      }))
  }, [selectedService, selectedDate, availableTimeSlots])

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      setSelectedDate(null)
      setSelectedTime(null)
      setSelectedSlot(null)
      onServiceChange?.(serviceId)
    }
  }

  const handleDateSelect = (date: Date) => {
    // Validate date is within allowed range
    if (isBefore(date, startOfDay(minDate)) || isAfter(date, endOfDay(maxDate))) {
      return
    }
    
    setSelectedDate(date)
    setSelectedTime(null) // Reset time when date changes
    onDateChange?.(date)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    
    // Find the corresponding time slot to get start/end times
    if (selectedService && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const matchingSlot = availableTimeSlots.find(slot => {
        const slotTime = format(new Date(slot.start), 'h:mm a')
        return slot.start.startsWith(dateStr) && slotTime === time && slot.available
      })
      
      if (matchingSlot) {
        setSelectedSlot({
          date: dateStr,
          startTime: matchingSlot.start,
          endTime: matchingSlot.end,
          service: selectedService
        })
        setIsConfirmationOpen(true)
      }
    }
  }

  const handleBookingConfirm = async () => {
    if (!selectedSlot) return
    
    setIsSubmitting(true)
    try {
      // Validate required customer fields
      if (!customerFirstName.trim() || !customerLastName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
        alert('Please fill in all required customer information fields.')
        return
      }

      await onBookingSubmit({
        serviceId: selectedSlot.service.id,
        date: selectedSlot.date,
        time: selectedSlot.startTime,
        notes: notes.trim() || undefined,
        customerFirstName: customerFirstName.trim(),
        customerLastName: customerLastName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim()
      })
      
      // Reset form state
      setIsConfirmationOpen(false)
      setSelectedSlot(null)
      setSelectedTime(null)
      setNotes('')
      setCustomerFirstName('')
      setCustomerLastName('')
      setCustomerEmail('')
      setCustomerPhone('')
    } catch (error) {
      console.error('Booking submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ServiceIcon = selectedService ? categoryIcons[selectedService.category] : Calendar

  return (
    <div className={`booking-calendar ${className}`}>
      {/* Header Section with Service Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-spa-100 to-spa-200">
              <Calendar className="w-5 h-5 text-spa-700" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">Book Your Appointment</h2>
          </div>
          
          <div className="space-y-4">
            {!hideServiceSelection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Service
                </label>
                <Select.Root onValueChange={handleServiceSelect} value={selectedService?.id || ''}>
                  <Select.Trigger className="w-full flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 hover:border-spa-300 focus:border-spa-500 focus:ring-2 focus:ring-spa-200 transition-all duration-200">
                    <Select.Value placeholder="Choose a spa service...">
                      {selectedService && (
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryColors[selectedService.category]}`}>
                            <ServiceIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-gray-800">{selectedService.name}</div>
                            <div className="text-sm text-gray-500">
                              {selectedService.duration} min • ${selectedService.price}
                            </div>
                          </div>
                        </div>
                      )}
                    </Select.Value>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Select.Trigger>
                  
                  <Select.Portal>
                    <Select.Content className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/30 p-2 max-h-96 overflow-y-auto z-50">
                      <Select.Viewport>
                        {services.map((service) => {
                          const Icon = categoryIcons[service.category]
                          return (
                            <Select.Item
                              key={service.id}
                              value={service.id}
                              className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer hover:bg-spa-50 focus:bg-spa-50 focus:outline-none transition-colors duration-150"
                            >
                              <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryColors[service.category]}`}>
                                <Icon className="w-4 h-4 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <Select.ItemText>
                                  <div className="font-medium text-gray-800">{service.name}</div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {service.duration} min • ${service.price}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                    {service.description}
                                  </div>
                                </Select.ItemText>
                              </div>
                            </Select.Item>
                          )
                        })}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            )}
            
            {selectedService && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 rounded-xl bg-gradient-to-br from-spa-50 to-cream-50 border border-spa-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ServiceIcon className="w-4 h-4 text-spa-600" />
                  <span className="text-sm font-medium text-spa-800">Selected Service</span>
                </div>
                <p className="text-sm text-gray-600">{selectedService.description}</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Date and Time Selection Section */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Loading State */}
            {isLoading && (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-12 shadow-lg border border-white/20">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3 text-spa-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg font-medium">Loading available times...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Date Picker */}
            {!isLoading && (
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
                <DatePicker
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  minDate={minDate}
                  maxDate={maxDate}
                />
              </div>
            )}

            {/* Time Slot Picker */}
            {!isLoading && selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20"
              >
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onTimeSelect={handleTimeSelect}
                  availableSlots={timeSlots}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Confirmation Modal */}
      <Dialog.Root 
        open={isConfirmationOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null)
            setSelectedTime(null)
          }
          setIsConfirmationOpen(open)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-semibold text-gray-800">
                  Confirm Booking
                </Dialog.Title>
                <Dialog.Close className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </Dialog.Close>
              </div>

              {selectedSlot && (
                <div className="space-y-4">
                  {/* Service Details */}
                  <div className="p-4 bg-gradient-to-br from-spa-50 to-cream-50 rounded-xl border border-spa-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryColors[selectedSlot.service.category]}`}>
                        <ServiceIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{selectedSlot.service.name}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedSlot.service.duration} minutes • ${selectedSlot.service.price}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{selectedSlot.service.description}</p>
                  </div>

                  {/* Appointment Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-gray-200">
                      <Calendar className="w-5 h-5 text-spa-600" />
                      <div>
                        <p className="font-medium text-gray-800">
                          {format(new Date(selectedSlot.date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">Date</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-gray-200">
                      <Clock className="w-5 h-5 text-spa-600" />
                      <div>
                        <p className="font-medium text-gray-800">
                          {format(new Date(selectedSlot.startTime), 'h:mm a')} - {format(new Date(selectedSlot.endTime), 'h:mm a')}
                        </p>
                        <p className="text-sm text-gray-600">Time</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                      Contact Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={customerFirstName}
                          onChange={(e) => setCustomerFirstName(e.target.value)}
                          placeholder="Enter your first name"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={customerLastName}
                          onChange={(e) => setCustomerLastName(e.target.value)}
                          placeholder="Enter your last name"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requests (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special requests or preferences..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-spa-500 focus:border-spa-500 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmationOpen(false)
                        setSelectedSlot(null)
                        setSelectedTime(null)
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBookingConfirm}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-spa-500 to-spa-600 text-white rounded-lg hover:from-spa-600 hover:to-spa-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirm Booking
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

export default BookingCalendar