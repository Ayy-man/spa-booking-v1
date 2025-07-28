// =====================================================
// CORE ENTITY INTERFACES - Updated for Date/Time Architecture
// =====================================================

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'customer' | 'staff' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  name: string
  description: string
  duration: number // in minutes
  price: number
  category: 'massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness'
  requiresSpecializedDrainage: boolean
  minRoomCapacity: number
  allowedRoomIds?: string[]
  isActive: boolean
  slug?: string // URL-friendly identifier for service pre-selection
  createdAt: string
  updatedAt: string
}

export interface Room {
  id: string
  name: string
  number: number
  bedCapacity: number
  hasShower: boolean
  hasSpecializedDrainage: boolean
  equipment: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Staff {
  id: string
  userId: string
  employeeId: string
  hireDate: string
  specializations: string[]
  certificationDetails: Record<string, any>
  hourlyRate?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StaffSchedule {
  id: string
  staffId: string
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  status: 'available' | 'booked' | 'break' | 'unavailable'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Booking {
  id: string
  customerId: string
  serviceId: string
  staffId: string
  roomId: string
  bookingDate: string // YYYY-MM-DD format
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  totalPrice: number
  specialRequests?: string
  internalNotes?: string
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  createdAt: string
  updatedAt: string
}

// =====================================================
// DATE/TIME PICKER SPECIFIC INTERFACES
// =====================================================

export interface DateAvailability {
  date: string // YYYY-MM-DD format
  totalSlots: number
  bookedSlots: number
  availableSlots: number
  hasAvailability: boolean
}

export interface TimeSlotOption {
  time: string // h:MM AM/PM format for display
  timeValue: string // HH:MM format for database
  available: boolean
  id: string
  availableStaffCount: number
  availableRoomCount: number
  suggestedStaffId?: string
  suggestedRoomId?: string
}

export interface AvailabilityQuery {
  date: string // YYYY-MM-DD format
  serviceId?: string
  staffId?: string
  roomId?: string
  duration?: number // in minutes
}

export interface BookingConflict {
  bookingId: string
  conflictType: 'room_conflict' | 'staff_conflict' | 'general_conflict'
  resourceName: string
  existingStartTime: string
  existingEndTime: string
  customerReference: string
}

// =====================================================
// FORM DATA INTERFACES
// =====================================================

export interface BookingFormData {
  serviceId: string
  staffId?: string
  roomId?: string
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
  specialRequests?: string
  notes?: string
}

export interface BookingStep {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isActive: boolean
}

// =====================================================
// API RESPONSE INTERFACES
// =====================================================

export interface AvailabilityResponse {
  success: boolean
  data: {
    dateAvailability: DateAvailability[]
    timeSlots?: TimeSlotOption[]
  }
  error?: string
}

export interface BookingResponse {
  success: boolean
  data?: Booking
  error?: string
  conflicts?: BookingConflict[]
}

// =====================================================
// STAFF VIEW INTERFACES (ANONYMIZED)
// =====================================================

export interface StaffScheduleView {
  bookingId: string
  bookingDate: string
  startTime: string
  endTime: string
  status: string
  specialRequests?: string
  internalNotes?: string
  totalPrice: number
  customerReference: string // Anonymized
  serviceName: string
  serviceCategory: string
  durationMinutes: number
  servicePrice: number
  roomName: string
  roomNumber: number
  bedCapacity: number
  staffEmployeeId: string
  staffFirstName: string
  staffLastName: string
  bookingCreatedAt: string
  bookingUpdatedAt: string
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type ServiceCategory = 'massage' | 'facial' | 'body_treatment' | 'nail_care' | 'hair_removal' | 'wellness'
export type UserRole = 'customer' | 'staff' | 'admin'
export type AvailabilityStatus = 'available' | 'booked' | 'break' | 'unavailable'

// =====================================================
// PERFORMANCE MONITORING INTERFACES
// =====================================================

export interface PerformanceMetric {
  metricName: string
  metricValue: number
  description: string
}

export interface IndexUsageStats {
  tableName: string
  indexName: string
  indexScans: number
  tuplesRead: number
  tuplesFetched: number
}

// =====================================================
// LEGACY COMPATIBILITY (deprecated - to be removed)
// =====================================================

/** @deprecated Use TimeSlotOption instead */
export interface TimeSlot {
  start: string
  end: string
  available: boolean
  staffId?: string
  roomId?: string
}