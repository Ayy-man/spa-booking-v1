'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Heart, Leaf, Star } from 'lucide-react'
import BookingCalendar from './BookingCalendar'
import { useBookingCalendar } from './useBookingCalendar'
import { Service, BookingFormData } from '@/types'
import './BookingCalendar.css'

// Mock spa services data
const mockServices: Service[] = [
  {
    id: '1',
    name: 'Swedish Relaxation Massage',
    description: 'A gentle, flowing massage that promotes deep relaxation and stress relief using long, smooth strokes.',
    duration: 60,
    price: 120,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Deep Tissue Massage',
    description: 'Therapeutic massage targeting deeper layers of muscle and connective tissue to relieve chronic tension.',
    duration: 90,
    price: 150,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Hydrating Facial Treatment',
    description: 'Luxurious facial treatment that deeply hydrates and nourishes your skin for a radiant glow.',
    duration: 75,
    price: 100,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Anti-Aging Facial',
    description: 'Advanced facial treatment using premium ingredients to reduce fine lines and restore youthful appearance.',
    duration: 90,
    price: 180,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Detoxifying Body Wrap',
    description: 'Full-body treatment that detoxifies, tones, and moisturizes your skin using natural marine ingredients.',
    duration: 60,
    price: 140,
    category: 'body_treatment',
    requiresSpecializedDrainage: true,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Hot Stone Massage',
    description: 'Therapeutic massage using heated stones to melt away tension and promote deep relaxation.',
    duration: 90,
    price: 160,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Luxury Manicure & Pedicure',
    description: 'Complete nail care treatment including cuticle care, shaping, and premium polish application.',
    duration: 120,
    price: 85,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Aromatherapy Wellness Session',
    description: 'Holistic wellness experience combining essential oils, meditation, and gentle bodywork.',
    duration: 60,
    price: 95,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const BookingCalendarExample: React.FC = () => {
  const {
    selectedService,
    selectedDate,
    availableTimeSlots,
    isLoading,
    error,
    filteredServices,
    servicesByCategory,
    setSelectedService,
    setSelectedDate,
    submitBooking,
    refreshAvailability,
    getTimeSlotsForDate
  } = useBookingCalendar({
    services: mockServices,
    businessHours: {
      start: '09:00',
      end: '19:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6] // Monday to Saturday
    },
    timeSlotDuration: 30,
    bufferTime: 15
  })

  const handleBookingSubmit = async (data: BookingFormData) => {
    try {
      await submitBooking(data)
      
      // Show success message (in a real app, you might use a toast or modal)
      alert(`Booking confirmed! 
      
Service: ${selectedService?.name}
Date: ${data.date}
Time: ${data.time}
${data.notes ? `Notes: ${data.notes}` : ''}`)
      
    } catch (error) {
      console.error('Booking failed:', error)
      alert('Booking failed. Please try again.')
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const service = filteredServices.find(s => s.id === serviceId)
    setSelectedService(service || null)
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  // Category icons for the service showcase
  const categoryIcons = {
    massage: Heart,
    facial: Sparkles,
    body: Leaf,
    nail: Star,
    wellness: Sparkles,
  } as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-spa-50 via-cream-50 to-spa-100">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-16 pb-8"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-gray-800 mb-4"
            >
              Book Your Perfect 
              <span className="bg-gradient-to-r from-spa-600 to-spa-700 bg-clip-text text-transparent"> Spa Experience</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-600 max-w-2xl mx-auto"
            >
              Indulge in luxury treatments designed to rejuvenate your body and soul. 
              Choose from our premium spa services and find the perfect time for your relaxation.
            </motion.p>
          </div>

          {/* Service Categories Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
          >
            {Object.entries(servicesByCategory).map(([category, services], index) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons]
              const serviceCount = services.length
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-white/70 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 hover:border-spa-300 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-spa-100 to-spa-200 mb-2">
                    <Icon className="w-6 h-6 text-spa-700" />
                  </div>
                  <h3 className="font-semibold text-gray-800 capitalize">{category}</h3>
                  <p className="text-sm text-gray-600">{serviceCount} service{serviceCount !== 1 ? 's' : ''}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </motion.div>

      {/* Booking Calendar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <BookingCalendar
            services={filteredServices}
            availableTimeSlots={availableTimeSlots}
            isLoading={isLoading}
            onBookingSubmit={handleBookingSubmit}
            onDateChange={handleDateChange}
            onServiceChange={handleServiceChange}
            className="booking-calendar-container"
          />
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p className="text-red-700 text-center">{error}</p>
            <button
              onClick={refreshAvailability}
              className="mt-2 mx-auto block px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Selected Service Info */}
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">About Your Selected Service</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">{selectedService.name}</h4>
                <p className="text-gray-600 mb-4">{selectedService.description}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-spa-500 rounded-full"></span>
                    <span className="text-gray-600">Duration: {selectedService.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-600">Price: ${selectedService.price}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-spa-50 to-cream-50 rounded-xl p-4">
                <h5 className="font-medium text-gray-800 mb-2">What to Expect</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Arrive 15 minutes early for check-in</li>
                  <li>• Complimentary consultation included</li>
                  <li>• Premium organic products used</li>
                  <li>• Relaxation time in our wellness lounge</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Available Times for Selected Date */}
        {selectedDate && selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="text-center">
              <p className="text-gray-600">
                {getTimeSlotsForDate(selectedDate).length > 0 
                  ? `${getTimeSlotsForDate(selectedDate).length} available time slots for your selected date`
                  : 'No available time slots for this date. Please choose another date.'
                }
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default BookingCalendarExample