'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import BookingCalendar from '@/components/BookingCalendar'
import { useBookingCalendar } from '@/components/useBookingCalendar'
import { Service, BookingFormData } from '@/types'

// 47 Real Dermal Spa Services with proper slugs
const realServices: Service[] = [
  // Facial Treatments
  {
    id: 'e0924e8a-5155-40ee-9d54-ef0a3a88e324',
    name: 'Basic Facial',
    description: 'A gentle cleansing and moisturizing facial treatment perfect for all skin types.',
    duration: 60,
    price: 85,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'basic-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Deep Cleansing Facial',
    description: 'Intensive facial treatment targeting clogged pores and impurities.',
    duration: 75,
    price: 95,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'deep-cleansing-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Anti-Aging Facial',
    description: 'Advanced facial treatment to reduce fine lines and restore youthful appearance.',
    duration: 90,
    price: 125,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'anti-aging-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Hydrating Facial',
    description: 'Moisture-rich facial treatment for dry and dehydrated skin.',
    duration: 60,
    price: 90,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'hydrating-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Acne Treatment Facial',
    description: 'Specialized facial treatment designed to combat acne and prevent breakouts.',
    duration: 75,
    price: 100,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'acne-treatment-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Oxygen Facial',
    description: 'Rejuvenating oxygen-infused facial for glowing, radiant skin.',
    duration: 60,
    price: 110,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'oxygen-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Chemical Peel',
    description: 'Professional chemical peel to improve skin texture and tone.',
    duration: 45,
    price: 80,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'chemical-peel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Massage Treatments
  {
    id: '8',
    name: 'Swedish Massage',
    description: 'Classic relaxation massage with flowing strokes to reduce stress.',
    duration: 60,
    price: 120,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'swedish-massage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '9',
    name: 'Deep Tissue Massage',
    description: 'Therapeutic massage targeting deep muscle tension and knots.',
    duration: 90,
    price: 150,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'deep-tissue-massage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4bea8217-83bb-4bea-98b6-4166c12b88e7',
    name: 'Hot Stone Massage',
    description: 'Therapeutic massage using heated stones to melt away tension.',
    duration: 90,
    price: 160,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'hot-stone-massage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '11',
    name: 'Aromatherapy Massage',
    description: 'Relaxing massage with essential oils for stress relief.',
    duration: 75,
    price: 135,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'aromatherapy-massage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '12',
    name: 'Sports Massage',
    description: 'Targeted massage for athletes to improve performance and recovery.',
    duration: 60,
    price: 130,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'sports-massage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'a0a7942d-a62f-407c-acd8-3035e0e4238a',
    name: 'Couples Massage',
    description: 'Side-by-side massage experience for two people.',
    duration: 60,
    price: 240,
    category: 'massage',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 2,
    isActive: true,
    slug: 'couples-massage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Hair Removal Services
  {
    id: '70cdd2f9-b25e-4e5b-872c-8fd66f2ee8e9',
    name: 'Brazilian Wax - Women',
    description: 'Complete intimate area hair removal for women using professional wax.',
    duration: 45,
    price: 65,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'brazilian-wax-women',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '15',
    name: 'Brazilian Wax - Men',
    description: 'Complete intimate area hair removal for men using professional wax.',
    duration: 60,
    price: 80,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'brazilian-wax-men',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '16',
    name: 'Bikini Wax',
    description: 'Basic bikini line hair removal for a clean, groomed appearance.',
    duration: 30,
    price: 45,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'bikini-wax',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '17',
    name: 'Leg Wax - Full',
    description: 'Complete leg hair removal from thigh to ankle.',
    duration: 60,
    price: 75,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'leg-wax-full',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '18',
    name: 'Leg Wax - Half',
    description: 'Lower leg hair removal from knee to ankle.',
    duration: 30,
    price: 45,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'leg-wax-half',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '19',
    name: 'Arm Wax - Full',
    description: 'Complete arm hair removal from shoulder to wrist.',
    duration: 45,
    price: 55,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'arm-wax-full',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '20',
    name: 'Underarm Wax',
    description: 'Quick and effective underarm hair removal.',
    duration: 15,
    price: 25,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'underarm-wax',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '21',
    name: 'Eyebrow Wax',
    description: 'Precision eyebrow shaping and hair removal.',
    duration: 20,
    price: 30,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'eyebrow-wax',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '22',
    name: 'Upper Lip Wax',
    description: 'Quick upper lip hair removal for a smooth finish.',
    duration: 10,
    price: 20,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'upper-lip-wax',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '23',
    name: 'Back Wax - Men',
    description: 'Complete back hair removal for men.',
    duration: 45,
    price: 70,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'back-wax-men',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '24',
    name: 'Chest Wax - Men',
    description: 'Chest and abdomen hair removal for men.',
    duration: 30,
    price: 50,
    category: 'hair_removal',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'chest-wax-men',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Body Treatments
  {
    id: 'd8beae5f-967e-4d4c-adf2-76756f09f1d7',
    name: 'Body Scrub',
    description: 'Full-body exfoliation treatment to remove dead skin cells.',
    duration: 45,
    price: 85,
    category: 'body_treatment',
    requiresSpecializedDrainage: true,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'body-scrub',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '26',
    name: 'Body Wrap',
    description: 'Detoxifying body wrap treatment using natural ingredients.',
    duration: 75,
    price: 125,
    category: 'body_treatment',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'body-wrap',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '27',
    name: 'Cellulite Treatment',
    description: 'Specialized treatment to reduce the appearance of cellulite.',
    duration: 60,
    price: 110,
    category: 'body_treatment',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'cellulite-treatment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '28',
    name: 'Spray Tan',
    description: 'Professional spray tan application for a natural-looking glow.',
    duration: 30,
    price: 60,
    category: 'body_treatment',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'spray-tan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Nail Care Services
  {
    id: '29',
    name: 'Classic Manicure',
    description: 'Traditional manicure with nail shaping, cuticle care, and polish.',
    duration: 45,
    price: 55,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'classic-manicure',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '30',
    name: 'Gel Manicure',
    description: 'Long-lasting gel manicure with UV light curing.',
    duration: 60,
    price: 75,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'gel-manicure',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '31',
    name: 'Classic Pedicure',
    description: 'Traditional pedicure with foot soak, nail care, and polish.',
    duration: 60,
    price: 65,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'classic-pedicure',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '32',
    name: 'Gel Pedicure',
    description: 'Long-lasting gel pedicure with UV light curing.',
    duration: 75,
    price: 85,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'gel-pedicure',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '33',
    name: 'Manicure & Pedicure Combo',
    description: 'Complete nail care package for hands and feet.',
    duration: 120,
    price: 110,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'manicure-pedicure-combo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '34',
    name: 'Acrylic Nails',
    description: 'Full set of acrylic nail extensions with shaping and polish.',
    duration: 90,
    price: 95,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'acrylic-nails',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '35',
    name: 'Nail Art',
    description: 'Creative nail art designs and decorations.',
    duration: 30,
    price: 35,
    category: 'nail_care',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'nail-art',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Specialized Treatments
  {
    id: '36',
    name: 'Microdermabrasion',
    description: 'Skin resurfacing treatment to improve texture and appearance.',
    duration: 60,
    price: 100,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'microdermabrasion',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '37',
    name: 'LED Light Therapy',
    description: 'Therapeutic LED light treatment for skin rejuvenation.',
    duration: 30,
    price: 60,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'led-light-therapy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '38',
    name: 'Dermaplaning',
    description: 'Gentle exfoliation treatment using a surgical blade.',
    duration: 45,
    price: 85,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'dermaplaning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '39',
    name: 'Radiofrequency Treatment',
    description: 'Non-invasive skin tightening using radiofrequency technology.',
    duration: 60,
    price: 150,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'radiofrequency-treatment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '40',
    name: 'Ultrasonic Facial',
    description: 'Deep cleansing facial using ultrasonic technology.',
    duration: 75,
    price: 105,
    category: 'facial',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'ultrasonic-facial',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Wellness Services
  {
    id: '41',
    name: 'Lymphatic Drainage',
    description: 'Gentle massage to stimulate lymphatic system and reduce swelling.',
    duration: 60,
    price: 120,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'lymphatic-drainage',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '42',
    name: 'Reflexology',
    description: 'Therapeutic foot massage targeting pressure points.',
    duration: 45,
    price: 80,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'reflexology',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '43',
    name: 'Cupping Therapy',
    description: 'Traditional cupping therapy for muscle tension relief.',
    duration: 45,
    price: 90,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'cupping-therapy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '44',
    name: 'Reiki Session',
    description: 'Energy healing session for relaxation and balance.',
    duration: 60,
    price: 95,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'reiki-session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  
  // Package Treatments
  {
    id: '45',
    name: 'Bridal Package',
    description: 'Complete beauty package for brides including facial, massage, and nail care.',
    duration: 180,
    price: 350,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'bridal-package',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '46',
    name: 'Spa Day Package',
    description: 'Full day relaxation package with multiple treatments.',
    duration: 240,
    price: 450,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 1,
    isActive: true,
    slug: 'spa-day-package',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '47',
    name: 'Mom & Daughter Package',
    description: 'Special bonding package for mothers and daughters.',
    duration: 150,
    price: 280,
    category: 'wellness',
    requiresSpecializedDrainage: false,
    minRoomCapacity: 2,
    isActive: true,
    slug: 'mom-daughter-package',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Default fallback service
const DEFAULT_SERVICE_SLUG = 'hot-stone-massage'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function BookingPageContent() {
  const searchParams = useSearchParams()
  const serviceSlug = searchParams?.get('service')
  
  const [preSelectedService, setPreSelectedService] = useState<Service | null>(null)
  const [isDevFallback, setIsDevFallback] = useState(false)

  // Service pre-selection logic
  useEffect(() => {
    let selectedService: Service | null = null
    let usingFallback = false

    if (serviceSlug) {
      // Try to find service by slug
      selectedService = realServices.find(service => service.slug === serviceSlug) || null
      
      if (!selectedService) {
        console.log(`Dev Mode: Invalid service slug "${serviceSlug}", using fallback service`)
        selectedService = realServices.find(service => service.slug === DEFAULT_SERVICE_SLUG) || null
        usingFallback = true
      }
    } else {
      // No service parameter, use fallback
      console.log('Dev Mode: No service parameter, using fallback service')
      selectedService = realServices.find(service => service.slug === DEFAULT_SERVICE_SLUG) || null
      usingFallback = true
    }

    setPreSelectedService(selectedService)
    setIsDevFallback(usingFallback)
  }, [serviceSlug])

  const {
    selectedService,
    selectedDate,
    availableTimeSlots,
    isLoading,
    error,
    filteredServices,
    setSelectedService,
    setSelectedDate,
    submitBooking,
    refreshAvailability,
  } = useBookingCalendar({
    services: realServices,
    preSelectedService,
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
      const response = await submitBooking(data)
      
      // Show success message with room assignment (in a real app, you might use a toast or modal)
      const roomInfo = (response as any)?.roomAssignment 
        ? `Room: ${(response as any).roomAssignment.roomName} (Room ${(response as any).roomAssignment.roomNumber})`
        : ''
      
      alert(`Booking confirmed! 

Service: ${selectedService?.name}
Date: ${data.date}
Time: ${data.time}
${roomInfo}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-spa-50 via-cream-50 to-spa-100">
      {/* Pure Booking Interface - Calendly Style */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dev Mode Indicator */}
        {isDevFallback && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Dev Mode:</strong> Using fallback service &quot;{realServices.find(s => s.slug === DEFAULT_SERVICE_SLUG)?.name}&quot;
            </p>
          </div>
        )}

        {/* Selected Service Header (when pre-selected) */}
        {preSelectedService && !isDevFallback && (
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Book Your {preSelectedService.name}
            </h1>
            <p className="text-lg text-gray-600 mb-1">
              {preSelectedService.duration} minutes • ${preSelectedService.price}
            </p>
            <p className="text-gray-500">
              {preSelectedService.description}
            </p>
          </div>
        )}

        {/* Booking Calendar */}
        <BookingCalendar
          services={filteredServices}
          availableTimeSlots={availableTimeSlots}
          isLoading={isLoading}
          onBookingSubmit={handleBookingSubmit}
          onDateChange={handleDateChange}
          onServiceChange={handleServiceChange}
          preSelectedService={preSelectedService}
          hideServiceSelection={!!preSelectedService && !isDevFallback}
          className="booking-calendar-container"
        />

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-center">{error}</p>
            <button
              onClick={refreshAvailability}
              className="mt-2 mx-auto block px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-spa-50 via-cream-50 to-spa-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spa-600 mx-auto mb-4"></div>
          <p className="text-spa-600 font-medium">Loading booking system...</p>
        </div>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  )
}