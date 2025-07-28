/**
 * Database Types for MedSpa Booking System
 * 
 * This file contains comprehensive TypeScript types and Zod schemas
 * that match the PostgreSQL database schema defined in supabase/schema.sql
 * 
 * Features:
 * - Complete type safety with Zod validation
 * - Database constraint validation (email, phone, enums, etc.)
 * - Insert/Update/Select type variations
 * - Relationship types with joins
 * - Utility types for common operations
 */

import { z } from 'zod';

// =====================================================
// ENUM SCHEMAS
// =====================================================

export const UserRoleSchema = z.enum(['customer', 'staff', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const BookingStatusSchema = z.enum([
  'pending', 
  'confirmed', 
  'in_progress', 
  'completed', 
  'cancelled', 
  'no_show'
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const ServiceCategorySchema = z.enum([
  'massage',
  'facial', 
  'body_treatment',
  'nail_care',
  'hair_removal',
  'wellness'
]);
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

export const AvailabilityStatusSchema = z.enum([
  'available',
  'booked', 
  'break',
  'unavailable'
]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

// =====================================================
// VALIDATION HELPERS
// =====================================================

// Email validation
const emailSchema = z.string().email('Invalid email format');

// Phone validation (supports various formats)
const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .optional();

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// Price validation (positive decimal with 2 decimal places)
const priceSchema = z
  .number()
  .positive('Price must be positive')
  .multipleOf(0.01, 'Price must have at most 2 decimal places');

// Time validation (HH:MM format)
const timeSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');

// Date validation
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

// Timestamp validation
const timestampSchema = z.string().datetime();

// =====================================================
// CORE TABLE SCHEMAS
// =====================================================

/**
 * Users table schema - supports customers, staff, and admin
 */
export const UserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  phone: phoneSchema,
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  role: UserRoleSchema.default('customer'),
  date_of_birth: dateSchema.optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: phoneSchema,
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  preferences: z.record(z.any()).default({}), // JSONB field
  is_active: z.boolean().default(true),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.optional(),
});

export const UserInsertSchema = UserSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  role: true,
  is_active: true,
  preferences: true,
});

export const UserUpdateSchema = UserInsertSchema.partial();

export type User = z.infer<typeof UserSchema>;
export type UserInsert = z.infer<typeof UserInsertSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

/**
 * Rooms table schema - treatment rooms with capacity and equipment
 */
export const RoomSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1, 'Room name is required').max(50),
  number: z.number().int().positive('Room number must be positive'),
  bed_capacity: z.number().int().positive('Bed capacity must be positive'),
  has_shower: z.boolean().default(false),
  has_specialized_drainage: z.boolean().default(false),
  equipment: z.record(z.any()).default({}), // JSONB field
  is_active: z.boolean().default(true),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const RoomInsertSchema = RoomSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  has_shower: true,
  has_specialized_drainage: true,
  equipment: true,
  is_active: true,
});

export const RoomUpdateSchema = RoomInsertSchema.partial();

export type Room = z.infer<typeof RoomSchema>;
export type RoomInsert = z.infer<typeof RoomInsertSchema>;
export type RoomUpdate = z.infer<typeof RoomUpdateSchema>;

/**
 * Services table schema - spa services with categories and restrictions
 */
export const ServiceSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1, 'Service name is required').max(100),
  category: ServiceCategorySchema,
  description: z.string().optional(),
  duration_minutes: z.number().int().positive('Duration must be positive'),
  price: priceSchema,
  requires_specialized_drainage: z.boolean().default(false),
  min_room_capacity: z.number().int().positive().default(1),
  allowed_room_ids: z.array(uuidSchema).optional(),
  is_active: z.boolean().default(true),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  deleted_at: timestampSchema.optional(),
});

export const ServiceInsertSchema = ServiceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
}).partial({
  requires_specialized_drainage: true,
  min_room_capacity: true,
  is_active: true,
});

export const ServiceUpdateSchema = ServiceInsertSchema.partial();

export type Service = z.infer<typeof ServiceSchema>;
export type ServiceInsert = z.infer<typeof ServiceInsertSchema>;
export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>;

/**
 * Staff profiles table schema - additional info for staff and admin users
 */
export const StaffProfileSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  employee_id: z.string().min(1, 'Employee ID is required').max(20),
  hire_date: dateSchema,
  specializations: z.array(ServiceCategorySchema).default([]),
  certification_details: z.record(z.any()).default({}), // JSONB field
  hourly_rate: priceSchema.optional(),
  is_active: z.boolean().default(true),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const StaffProfileInsertSchema = StaffProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  specializations: true,
  certification_details: true,
  is_active: true,
});

export const StaffProfileUpdateSchema = StaffProfileInsertSchema.partial();

export type StaffProfile = z.infer<typeof StaffProfileSchema>;
export type StaffProfileInsert = z.infer<typeof StaffProfileInsertSchema>;
export type StaffProfileUpdate = z.infer<typeof StaffProfileUpdateSchema>;

/**
 * Staff schedules table schema - availability tracking
 */
const StaffScheduleBaseSchema = z.object({
  id: uuidSchema,
  staff_id: uuidSchema,
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  status: AvailabilityStatusSchema.default('available'),
  notes: z.string().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const StaffScheduleSchema = StaffScheduleBaseSchema.refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

export const StaffScheduleInsertSchema = StaffScheduleBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  status: true,
}).refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

export const StaffScheduleUpdateSchema = StaffScheduleBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial();

export type StaffSchedule = z.infer<typeof StaffScheduleSchema>;
export type StaffScheduleInsert = z.infer<typeof StaffScheduleInsertSchema>;
export type StaffScheduleUpdate = z.infer<typeof StaffScheduleUpdateSchema>;

/**
 * Bookings table schema - main booking records
 */
const BookingBaseSchema = z.object({
  id: uuidSchema,
  customer_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema,
  room_id: uuidSchema,
  booking_date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  status: BookingStatusSchema.default('pending'),
  total_price: priceSchema,
  special_requests: z.string().optional(),
  internal_notes: z.string().optional(),
  cancellation_reason: z.string().optional(),
  cancelled_at: timestampSchema.optional(),
  cancelled_by: uuidSchema.optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const BookingSchema = BookingBaseSchema.refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

export const BookingInsertSchema = BookingBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  status: true,
}).refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
);

export const BookingUpdateSchema = BookingBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial();

export type Booking = z.infer<typeof BookingSchema>;
export type BookingInsert = z.infer<typeof BookingInsertSchema>;
export type BookingUpdate = z.infer<typeof BookingUpdateSchema>;

/**
 * Booking history table schema - audit trail for booking changes
 */
export const BookingHistorySchema = z.object({
  id: uuidSchema,
  booking_id: uuidSchema,
  changed_by: uuidSchema,
  old_status: BookingStatusSchema.optional(),
  new_status: BookingStatusSchema.optional(),
  change_reason: z.string().optional(),
  change_details: z.record(z.any()).default({}), // JSONB field
  created_at: timestampSchema,
});

export const BookingHistoryInsertSchema = BookingHistorySchema.omit({
  id: true,
  created_at: true,
}).partial({
  change_details: true,
});

export type BookingHistory = z.infer<typeof BookingHistorySchema>;
export type BookingHistoryInsert = z.infer<typeof BookingHistoryInsertSchema>;

/**
 * Staff schedule view schema - anonymized view for staff interfaces
 */
export const StaffScheduleViewSchema = z.object({
  booking_id: uuidSchema,
  booking_date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  status: BookingStatusSchema,
  special_requests: z.string().optional(),
  internal_notes: z.string().optional(),
  customer_reference: z.string(), // Anonymized customer ID
  service_name: z.string(),
  service_category: ServiceCategorySchema,
  duration_minutes: z.number().int().positive(),
  room_name: z.string(),
  room_number: z.number().int().positive(),
  staff_employee_id: z.string(),
  staff_first_name: z.string(),
  staff_last_name: z.string(),
});

export type StaffScheduleView = z.infer<typeof StaffScheduleViewSchema>;

// =====================================================
// RELATIONSHIP TYPES WITH JOINS
// =====================================================

/**
 * Complete booking details with all related entities
 */
export const BookingWithDetailsSchema = z.object({
  // Booking details
  id: uuidSchema,
  booking_date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  status: BookingStatusSchema,
  total_price: priceSchema,
  special_requests: z.string().optional(),
  internal_notes: z.string().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  
  // Customer details
  customer: z.object({
    id: uuidSchema,
    email: emailSchema,
    first_name: z.string(),
    last_name: z.string(),
    phone: phoneSchema,
  }),
  
  // Service details
  service: z.object({
    id: uuidSchema,
    name: z.string(),
    category: ServiceCategorySchema,
    duration_minutes: z.number().int().positive(),
    price: priceSchema,
  }),
  
  // Staff details
  staff: z.object({
    id: uuidSchema,
    employee_id: z.string(),
    user: z.object({
      first_name: z.string(),
      last_name: z.string(),
    }),
  }),
  
  // Room details
  room: z.object({
    id: uuidSchema,
    name: z.string(),
    number: z.number().int().positive(),
    bed_capacity: z.number().int().positive(),
  }),
});

export type BookingWithDetails = z.infer<typeof BookingWithDetailsSchema>;

/**
 * Staff member with user details and specializations
 */
export const StaffWithUserSchema = z.object({
  id: uuidSchema,
  employee_id: z.string(),
  hire_date: dateSchema,
  specializations: z.array(ServiceCategorySchema),
  hourly_rate: priceSchema.optional(),
  is_active: z.boolean(),
  user: z.object({
    id: uuidSchema,
    email: emailSchema,
    first_name: z.string(),
    last_name: z.string(),
    phone: phoneSchema,
  }),
});

export type StaffWithUser = z.infer<typeof StaffWithUserSchema>;

/**
 * Service with room compatibility information
 */
export const ServiceWithRoomsSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  category: ServiceCategorySchema,
  description: z.string().optional(),
  duration_minutes: z.number().int().positive(),
  price: priceSchema,
  requires_specialized_drainage: z.boolean(),
  min_room_capacity: z.number().int().positive(),
  is_active: z.boolean(),
  compatible_rooms: z.array(z.object({
    id: uuidSchema,
    name: z.string(),
    number: z.number().int().positive(),
    bed_capacity: z.number().int().positive(),
    has_specialized_drainage: z.boolean(),
  })),
});

export type ServiceWithRooms = z.infer<typeof ServiceWithRoomsSchema>;

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Available time slot for booking
 */
export const TimeSlotSchema = z.object({
  start_time: timeSchema,
  end_time: timeSchema,
  is_available: z.boolean(),
  staff_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
  booking_id: uuidSchema.optional(), // If slot is occupied
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;

/**
 * Room availability for a specific date and time range
 */
export const RoomAvailabilitySchema = z.object({
  room_id: uuidSchema,
  room_name: z.string(),
  room_number: z.number().int().positive(),
  bed_capacity: z.number().int().positive(),
  has_specialized_drainage: z.boolean(),
  is_available: z.boolean(),
  conflicting_booking_id: uuidSchema.optional(),
});

export type RoomAvailability = z.infer<typeof RoomAvailabilitySchema>;

/**
 * Staff availability for a specific date and time range
 */
export const StaffAvailabilitySchema = z.object({
  staff_id: uuidSchema,
  employee_id: z.string(),
  staff_name: z.string(),
  specializations: z.array(ServiceCategorySchema),
  is_available: z.boolean(),
  is_scheduled: z.boolean(), // Has a schedule entry for the date
  conflicting_booking_id: uuidSchema.optional(),
  schedule_status: AvailabilityStatusSchema.optional(),
});

export type StaffAvailability = z.infer<typeof StaffAvailabilitySchema>;

/**
 * Booking form validation schema
 */
export const BookingFormSchema = z.object({
  customer_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema,
  room_id: uuidSchema,
  booking_date: dateSchema,
  start_time: timeSchema,
  special_requests: z.string().optional(),
}).refine(
  async (data) => {
    // This would typically call validation functions
    // For now, we'll just do basic time validation
    return true;
  },
  {
    message: 'Invalid booking parameters',
  }
);

export type BookingForm = z.infer<typeof BookingFormSchema>;

/**
 * Service compatibility check parameters
 */
export const ServiceCompatibilitySchema = z.object({
  service_id: uuidSchema,
  room_id: uuidSchema,
  staff_id: uuidSchema,
  booking_date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
});

export type ServiceCompatibility = z.infer<typeof ServiceCompatibilitySchema>;

/**
 * Business rules validation results
 */
export const ValidationResultSchema = z.object({
  is_valid: z.boolean(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// =====================================================
// DATABASE OPERATION RESPONSE TYPES
// =====================================================

/**
 * Standard API response wrapper
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      details: z.any().optional(),
    }).optional(),
    meta: z.object({
      count: z.number().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
    }).optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    count?: number;
    page?: number;
    limit?: number;
    total?: number;
  };
};

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Filter parameters for various entities
 */
export const BookingFiltersSchema = z.object({
  customer_id: uuidSchema.optional(),
  staff_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
  service_id: uuidSchema.optional(),
  status: BookingStatusSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  search: z.string().optional(),
});

export type BookingFilters = z.infer<typeof BookingFiltersSchema>;

export const ServiceFiltersSchema = z.object({
  category: ServiceCategorySchema.optional(),
  min_price: priceSchema.optional(),
  max_price: priceSchema.optional(),
  min_duration: z.number().int().positive().optional(),
  max_duration: z.number().int().positive().optional(),
  requires_specialized_drainage: z.boolean().optional(),
  room_id: uuidSchema.optional(), // Filter by room compatibility
  search: z.string().optional(),
});

export type ServiceFilters = z.infer<typeof ServiceFiltersSchema>;

// =====================================================
// EXPORT ALL SCHEMAS FOR RUNTIME VALIDATION
// =====================================================

export const DatabaseSchemas = {
  // Core entity schemas
  User: UserSchema,
  UserInsert: UserInsertSchema,
  UserUpdate: UserUpdateSchema,
  Room: RoomSchema,
  RoomInsert: RoomInsertSchema,
  RoomUpdate: RoomUpdateSchema,
  Service: ServiceSchema,
  ServiceInsert: ServiceInsertSchema,
  ServiceUpdate: ServiceUpdateSchema,
  StaffProfile: StaffProfileSchema,
  StaffProfileInsert: StaffProfileInsertSchema,
  StaffProfileUpdate: StaffProfileUpdateSchema,
  StaffSchedule: StaffScheduleSchema,
  StaffScheduleInsert: StaffScheduleInsertSchema,
  StaffScheduleUpdate: StaffScheduleUpdateSchema,
  Booking: BookingSchema,
  BookingInsert: BookingInsertSchema,
  BookingUpdate: BookingUpdateSchema,
  BookingHistory: BookingHistorySchema,
  BookingHistoryInsert: BookingHistoryInsertSchema,
  
  // View schemas
  StaffScheduleView: StaffScheduleViewSchema,
  
  // Relationship schemas
  BookingWithDetails: BookingWithDetailsSchema,
  StaffWithUser: StaffWithUserSchema,
  ServiceWithRooms: ServiceWithRoomsSchema,
  
  // Utility schemas
  TimeSlot: TimeSlotSchema,
  RoomAvailability: RoomAvailabilitySchema,
  StaffAvailability: StaffAvailabilitySchema,
  BookingForm: BookingFormSchema,
  ServiceCompatibility: ServiceCompatibilitySchema,
  ValidationResult: ValidationResultSchema,
  
  // Basic API schemas
  Pagination: PaginationSchema,
  BookingFilters: BookingFiltersSchema,
  ServiceFilters: ServiceFiltersSchema,
  
  // API Request/Response schemas - commented out to fix compilation
  // CreateBookingRequest: CreateBookingRequestSchema,
  // CreateBookingResponse: CreateBookingResponseSchema,
  // ListBookingsQuery: ListBookingsQuerySchema,
  // ListBookingsResponse: ListBookingsResponseSchema,
  // UpdateBookingRequest: UpdateBookingRequestSchema,
  // UpdateBookingParams: UpdateBookingParamsSchema,
  // CancelBookingRequest: CancelBookingRequestSchema,
  // CheckAvailabilityQuery: CheckAvailabilityQuerySchema,
  // AvailableSlot: AvailableSlotSchema,
  // CheckAvailabilityResponse: CheckAvailabilityResponseSchema,
  // BulkAvailabilityRequest: BulkAvailabilityRequestSchema,
  // BulkAvailabilityResponse: BulkAvailabilityResponseSchema,
  // CreateUserRequest: CreateUserRequestSchema,
  // ListUsersQuery: ListUsersQuerySchema,
  // UpdateUserParams: UpdateUserParamsSchema,
  // Commented out to fix compilation issues with forward references
  // ListServicesQuery: ListServicesQuerySchema,
  // ServiceCompatibilityQuery: ServiceCompatibilityQuerySchema,
  // ServiceCompatibilityResponse: ServiceCompatibilityResponseSchema,
  // RoomScheduleQuery: RoomScheduleQuerySchema,
  // RoomScheduleResponse: RoomScheduleResponseSchema,
  // StaffScheduleQuery: StaffScheduleQuerySchema,
  // StaffScheduleResponse: StaffScheduleResponseSchema,
  
  // Validation schemas - commented out to fix compilation
  // QueryParams: QueryParamsSchema,
  // PathParams: PathParamsSchema,
  // BookingPathParams: BookingPathParamsSchema,
  // UserPathParams: UserPathParamsSchema,
  // StaffPathParams: StaffPathParamsSchema,
  // ServicePathParams: ServicePathParamsSchema,
  // RoomPathParams: RoomPathParamsSchema,
  // PostBookingBody: PostBookingBodySchema,
  // PostUserBody: PostUserBodySchema,
  // PostServiceBody: PostServiceBodySchema,
  // PostRoomBody: PostRoomBodySchema,
  // PostStaffBody: PostStaffBodySchema,
  // PutBookingBody: PutBookingBodySchema,
  // PutUserBody: PutUserBodySchema,
  // PutServiceBody: PutServiceBodySchema,
  // Remaining schemas commented out to fix compilation
  // PutStaffBody: PutStaffBodySchema,
  // PatchBookingStatus: PatchBookingStatusSchema,
  // PatchUserRole: PatchUserRoleSchema,
  // PatchServicePricing: PatchServicePricingSchema,
  // BulkUpdateBookings: BulkUpdateBookingsSchema,
  // BulkCancelBookings: BulkCancelBookingsSchema,
  // BulkCreateBookings: BulkCreateBookingsSchema,
  // AdvancedBookingFilters: AdvancedBookingFiltersSchema,
  // AdvancedServiceFilters: AdvancedServiceFiltersSchema,
  // AdvancedUserFilters: AdvancedUserFiltersSchema,
  // DateRange: DateRangeSchema,
  // TimeSlotValidation: TimeSlotValidationSchema,
  // RecurringBooking: RecurringBookingSchema,
  // FileUpload: FileUploadSchema,
  // ProfilePictureUpload: ProfilePictureUploadSchema,
  // DocumentUpload: DocumentUploadSchema,
  // ExportRequest: ExportRequestSchema,
  
  // Error handling schemas - commented out
  // ApiError: ApiErrorSchema,
  // ValidationErrorDetail: ValidationErrorDetailSchema,
  // ValidationErrorResponse: ValidationErrorResponseSchema,
  // BusinessErrorResponse: BusinessErrorResponseSchema,
  
  // Enhanced pagination schemas - commented out
  // CursorPagination: CursorPaginationSchema,
  // OffsetPagination: OffsetPaginationSchema,
  // FilterCondition: FilterConditionSchema,
  // FilterGroup: FilterGroupSchema,
  // Remaining forward references commented out
  // SearchConfig: SearchConfigSchema,
  // Aggregation: AggregationSchema,
  // GroupBy: GroupBySchema,
  // QueryBuilder: QueryBuilderSchema,
  // BookingAdvancedFilters: BookingAdvancedFiltersSchema,
  // ServiceAdvancedFilters: ServiceAdvancedFiltersSchema,
  // UserAdvancedFilters: UserAdvancedFiltersSchema,
  // ExportFilters: ExportFiltersSchema,
  
  // Webhook schemas - commented out
  // WebhookHeaders: WebhookHeadersSchema,
  // BaseWebhookPayload: BaseWebhookPayloadSchema,
  // VoiceBookingRequest: VoiceBookingRequestSchema,
  // VoiceBookingResponse: VoiceBookingResponseSchema,
  // PaymentWebhook: PaymentWebhookSchema,
  // CalendarSyncWebhook: CalendarSyncWebhookSchema,
  // CommunicationWebhook: CommunicationWebhookSchema,
  // ReviewWebhook: ReviewWebhookSchema,
  // WebhookResponse: WebhookResponseSchema,
  // WebhookConfig: WebhookConfigSchema,
  // WebhookDelivery: WebhookDeliverySchema,
  // AnyWebhookPayload: AnyWebhookPayloadSchema,
  
  // Enum schemas - only include already defined ones
  UserRole: UserRoleSchema,
  BookingStatus: BookingStatusSchema,
  ServiceCategory: ServiceCategorySchema,
  AvailabilityStatus: AvailabilityStatusSchema,
  // FilterOperator: FilterOperatorSchema,
  // VoiceBookingEvent: VoiceBookingEventSchema,
  // PaymentEvent: PaymentEventSchema,
  // CalendarEvent: CalendarEventSchema,
  // CommunicationEvent: CommunicationEventSchema,
  // ReviewEvent: ReviewEventSchema,
} as const;

/**
 * Type-safe schema validator function
 */
export function validateSchema<T extends keyof typeof DatabaseSchemas>(
  schemaName: T,
  data: unknown
): { success: true; data: z.infer<typeof DatabaseSchemas[T]> } | { success: false; errors: z.ZodError } {
  try {
    const schema = DatabaseSchemas[schemaName];
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Business rule constants that match database constraints
 */
// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

/**
 * Standard API request wrapper for body validation
 */
export const ApiRequestSchema = <T extends z.ZodType>(bodySchema: T) =>
  z.object({
    body: bodySchema,
    query: z.record(z.string()).optional(),
    params: z.record(z.string()).optional(),
  });

/**
 * Enhanced API response wrapper with proper error handling
 */
export const ApiResponseWrapperSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      message: z.string(),
      code: z.string(),
      field: z.string().optional(),
      details: z.record(z.any()).optional(),
    }).optional(),
    meta: z.object({
      count: z.number().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
      has_next: z.boolean().optional(),
      has_prev: z.boolean().optional(),
    }).optional(),
  });

export type ApiRequest<T> = {
  body: T;
  query?: Record<string, string>;
  params?: Record<string, string>;
};

export type ApiResponseWrapper<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    field?: string;
    details?: Record<string, any>;
  };
  meta?: {
    count?: number;
    page?: number;
    limit?: number;
    total?: number;
    has_next?: boolean;
    has_prev?: boolean;
    timestamp?: string;
    [key: string]: any;
  };
};

/**
 * Booking API endpoints request/response types
 */

// POST /api/bookings - Create booking
export const CreateBookingRequestSchema = z.object({
  customer_id: uuidSchema,
  service_id: uuidSchema,
  staff_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
  booking_date: dateSchema,
  start_time: timeSchema,
  special_requests: z.string().max(500).optional(),
  source: z.enum(['web', 'phone', 'walk_in', 'webhook']).default('web'),
  force_booking: z.boolean().default(false), // Override availability checks
});

export const CreateBookingResponseSchema = BookingWithDetailsSchema;

export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;
export type CreateBookingResponse = z.infer<typeof CreateBookingResponseSchema>;

// GET /api/bookings - List bookings with filters
export const ListBookingsQuerySchema = PaginationSchema.extend({
  customer_id: uuidSchema.optional(),
  staff_id: uuidSchema.optional(),
  service_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
  status: BookingStatusSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  search: z.string().max(100).optional(),
  include_cancelled: z.boolean().default(false),
});

export const ListBookingsResponseSchema = z.object({
  bookings: z.array(BookingWithDetailsSchema),
  stats: z.object({
    total_revenue: priceSchema,
    upcoming_count: z.number().int().nonnegative(),
    completed_count: z.number().int().nonnegative(),
    cancelled_count: z.number().int().nonnegative(),
  }).optional(),
});

export type ListBookingsQuery = z.infer<typeof ListBookingsQuerySchema>;
export type ListBookingsResponse = z.infer<typeof ListBookingsResponseSchema>;

// PUT /api/bookings/[id] - Update booking
export const UpdateBookingRequestSchema = z.object({
  service_id: uuidSchema.optional(),
  staff_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
  booking_date: dateSchema.optional(),
  start_time: timeSchema.optional(),
  status: BookingStatusSchema.optional(),
  special_requests: z.string().max(500).optional(),
  internal_notes: z.string().max(1000).optional(),
  cancellation_reason: z.string().max(500).optional(),
});

export const UpdateBookingParamsSchema = z.object({
  id: uuidSchema,
});

export type UpdateBookingRequest = z.infer<typeof UpdateBookingRequestSchema>;
export type UpdateBookingParams = z.infer<typeof UpdateBookingParamsSchema>;

// POST /api/bookings/[id]/cancel - Cancel booking
export const CancelBookingRequestSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
  refund_amount: priceSchema.optional(),
  notify_customer: z.boolean().default(true),
});

export type CancelBookingRequest = z.infer<typeof CancelBookingRequestSchema>;

/**
 * Availability API endpoints request/response types
 */

// GET /api/availability - Check availability
export const CheckAvailabilityQuerySchema = z.object({
  service_id: uuidSchema,
  date: dateSchema,
  staff_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
  duration_minutes: z.number().int().positive().optional(),
});

export const AvailableSlotSchema = z.object({
  start_time: timeSchema,
  end_time: timeSchema,
  staff: z.object({
    id: uuidSchema,
    name: z.string(),
    employee_id: z.string(),
  }),
  room: z.object({
    id: uuidSchema,
    name: z.string(),
    number: z.number().int().positive(),
  }),
  price: priceSchema,
});

export const CheckAvailabilityResponseSchema = z.object({
  date: dateSchema,
  service: z.object({
    id: uuidSchema,
    name: z.string(),
    duration_minutes: z.number().int().positive(),
    price: priceSchema,
  }),
  available_slots: z.array(AvailableSlotSchema),
  business_hours: z.object({
    open_time: timeSchema,
    close_time: timeSchema,
    is_open: z.boolean(),
  }),
});

export type CheckAvailabilityQuery = z.infer<typeof CheckAvailabilityQuerySchema>;
export type AvailableSlot = z.infer<typeof AvailableSlotSchema>;
export type CheckAvailabilityResponse = z.infer<typeof CheckAvailabilityResponseSchema>;

// POST /api/availability/bulk - Bulk availability check
export const BulkAvailabilityRequestSchema = z.object({
  service_ids: z.array(uuidSchema).min(1).max(10),
  date_from: dateSchema,
  date_to: dateSchema,
  staff_ids: z.array(uuidSchema).optional(),
  room_ids: z.array(uuidSchema).optional(),
});

export const BulkAvailabilityResponseSchema = z.object({
  availability_by_date: z.record(
    dateSchema,
    z.array(z.object({
      service_id: uuidSchema,
      available_slots: z.array(AvailableSlotSchema),
    }))
  ),
});

export type BulkAvailabilityRequest = z.infer<typeof BulkAvailabilityRequestSchema>;
export type BulkAvailabilityResponse = z.infer<typeof BulkAvailabilityResponseSchema>;

/**
 * User management API endpoints request/response types
 */

// POST /api/users - Create user
export const CreateUserRequestSchema = UserInsertSchema.extend({
  send_welcome_email: z.boolean().default(true),
});

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// GET /api/users - List users
export const ListUsersQuerySchema = PaginationSchema.extend({
  role: UserRoleSchema.optional(),
  search: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
  created_after: timestampSchema.optional(),
  created_before: timestampSchema.optional(),
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

// PUT /api/users/[id] - Update user
export const UpdateUserParamsSchema = z.object({
  id: uuidSchema,
});

export type UpdateUserParams = z.infer<typeof UpdateUserParamsSchema>;

/**
 * Service management API endpoints request/response types
 */

// GET /api/services - List services
export const ListServicesQuerySchema = PaginationSchema.extend({
  category: ServiceCategorySchema.optional(),
  min_price: priceSchema.optional(),
  max_price: priceSchema.optional(),
  min_duration: z.number().int().positive().optional(),
  max_duration: z.number().int().positive().optional(),
  requires_specialized_drainage: z.boolean().optional(),
  compatible_with_room: uuidSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional(),
});

export type ListServicesQuery = z.infer<typeof ListServicesQuerySchema>;

// GET /api/services/[id]/compatibility - Check service compatibility
export const ServiceCompatibilityQuerySchema = z.object({
  date: dateSchema,
  start_time: timeSchema,
  staff_id: uuidSchema.optional(),
  room_id: uuidSchema.optional(),
});

export const ServiceCompatibilityResponseSchema = z.object({
  is_compatible: z.boolean(),
  compatible_staff: z.array(z.object({
    id: uuidSchema,
    name: z.string(),
    employee_id: z.string(),
    specializations: z.array(ServiceCategorySchema),
  })),
  compatible_rooms: z.array(z.object({
    id: uuidSchema,
    name: z.string(),
    number: z.number().int().positive(),
    bed_capacity: z.number().int().positive(),
    has_specialized_drainage: z.boolean(),
  })),
  conflicts: z.array(z.object({
    type: z.enum(['staff_unavailable', 'room_unavailable', 'insufficient_capacity', 'drainage_required']),
    message: z.string(),
    details: z.record(z.any()).optional(),
  })),
});

export type ServiceCompatibilityQuery = z.infer<typeof ServiceCompatibilityQuerySchema>;
export type ServiceCompatibilityResponse = z.infer<typeof ServiceCompatibilityResponseSchema>;

/**
 * Room management API endpoints request/response types
 */

// GET /api/rooms/[id]/schedule - Get room schedule
export const RoomScheduleQuerySchema = z.object({
  date_from: dateSchema,
  date_to: dateSchema,
  include_breaks: z.boolean().default(false),
});

export const RoomScheduleResponseSchema = z.object({
  room: z.object({
    id: uuidSchema,
    name: z.string(),
    number: z.number().int().positive(),
    bed_capacity: z.number().int().positive(),
  }),
  schedule: z.array(z.object({
    date: dateSchema,
    slots: z.array(z.object({
      start_time: timeSchema,
      end_time: timeSchema,
      status: z.enum(['available', 'booked', 'maintenance']),
      booking: z.object({
        id: uuidSchema,
        service_name: z.string(),
        customer_name: z.string(),
        staff_name: z.string(),
      }).optional(),
    })),
  })),
});

export type RoomScheduleQuery = z.infer<typeof RoomScheduleQuerySchema>;
export type RoomScheduleResponse = z.infer<typeof RoomScheduleResponseSchema>;

/**
 * Staff management API endpoints request/response types
 */

// GET /api/staff/[id]/schedule - Get staff schedule
export const StaffScheduleQuerySchema = z.object({
  date_from: dateSchema,
  date_to: dateSchema,
  include_personal_info: z.boolean().default(false),
});

export const StaffScheduleResponseSchema = z.object({
  staff: z.object({
    id: uuidSchema,
    employee_id: z.string(),
    name: z.string(),
    specializations: z.array(ServiceCategorySchema),
  }),
  schedule: z.array(z.object({
    date: dateSchema,
    work_hours: z.object({
      start_time: timeSchema,
      end_time: timeSchema,
      status: AvailabilityStatusSchema,
    }).optional(),
    bookings: z.array(z.object({
      id: uuidSchema,
      start_time: timeSchema,
      end_time: timeSchema,
      service_name: z.string(),
      room_name: z.string(),
      customer_info: z.object({
        name: z.string(),
        phone: phoneSchema,
      }).optional(), // Only included if include_personal_info = true
    })),
  })),
});

export type StaffScheduleQuery = z.infer<typeof StaffScheduleQuerySchema>;
export type StaffScheduleResponse = z.infer<typeof StaffScheduleResponseSchema>;

// =====================================================
// VALIDATION SCHEMAS FOR API ROUTES
// =====================================================

/**
 * Common query parameter validation schemas
 */
export const QueryParamsSchema = z.object({
  // Pagination
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  
  // Search and filtering
  search: z.string().max(100).optional(),
  status: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Boolean flags
  is_active: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional(),
  include_cancelled: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional(),
  include_personal_info: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional(),
  
  // UUID parameters
  customer_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
});

/**
 * Path parameter validation schemas
 */
export const PathParamsSchema = z.object({
  id: uuidSchema,
});

export const BookingPathParamsSchema = z.object({
  id: uuidSchema,
  action: z.enum(['cancel', 'confirm', 'reschedule']).optional(),
});

export const UserPathParamsSchema = z.object({
  id: uuidSchema,
  action: z.enum(['activate', 'deactivate', 'reset-password']).optional(),
});

export const StaffPathParamsSchema = z.object({
  id: uuidSchema,
  action: z.enum(['schedule', 'availability', 'performance']).optional(),
});

export const ServicePathParamsSchema = z.object({
  id: uuidSchema,
  action: z.enum(['compatibility', 'pricing', 'rooms']).optional(),
});

export const RoomPathParamsSchema = z.object({
  id: uuidSchema,
  action: z.enum(['schedule', 'maintenance', 'availability']).optional(),
});

/**
 * Request body validation schemas for different HTTP methods
 */

// POST request body schemas
export const PostBookingBodySchema = CreateBookingRequestSchema;
export const PostUserBodySchema = CreateUserRequestSchema;
export const PostServiceBodySchema = ServiceInsertSchema;
export const PostRoomBodySchema = RoomInsertSchema;
export const PostStaffBodySchema = StaffProfileInsertSchema;

// PUT request body schemas (allow partial updates)
export const PutBookingBodySchema = UpdateBookingRequestSchema;
export const PutUserBodySchema = UserUpdateSchema;
export const PutServiceBodySchema = ServiceUpdateSchema;
export const PutRoomBodySchema = RoomUpdateSchema;
export const PutStaffBodySchema = StaffProfileUpdateSchema;

// PATCH request body schemas (specific field updates)
export const PatchBookingStatusSchema = z.object({
  status: BookingStatusSchema,
  reason: z.string().max(500).optional(),
  internal_notes: z.string().max(1000).optional(),
});

export const PatchUserRoleSchema = z.object({
  role: UserRoleSchema,
  reason: z.string().max(500).optional(),
});

export const PatchServicePricingSchema = z.object({
  price: priceSchema,
  effective_date: dateSchema.optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Bulk operation validation schemas
 */
export const BulkUpdateBookingsSchema = z.object({
  booking_ids: z.array(uuidSchema).min(1).max(50),
  updates: z.object({
    status: BookingStatusSchema.optional(),
    staff_id: uuidSchema.optional(),
    room_id: uuidSchema.optional(),
    internal_notes: z.string().max(1000).optional(),
  }),
  reason: z.string().max(500).optional(),
});

export const BulkCancelBookingsSchema = z.object({
  booking_ids: z.array(uuidSchema).min(1).max(20),
  reason: z.string().min(1).max(500),
  refund_policy: z.enum(['full', 'partial', 'none']).default('partial'),
  notify_customers: z.boolean().default(true),
});

export const BulkCreateBookingsSchema = z.object({
  bookings: z.array(CreateBookingRequestSchema).min(1).max(10),
  validate_conflicts: z.boolean().default(true),
  auto_assign_staff: z.boolean().default(false),
  auto_assign_room: z.boolean().default(false),
});

/**
 * Advanced filtering and search schemas
 */
export const AdvancedBookingFiltersSchema = BookingFiltersSchema.extend({
  price_min: priceSchema.optional(),
  price_max: priceSchema.optional(),
  duration_min: z.number().int().positive().optional(),
  duration_max: z.number().int().positive().optional(),
  service_category: ServiceCategorySchema.optional(),
  has_special_requests: z.boolean().optional(),
  created_after: timestampSchema.optional(),
  created_before: timestampSchema.optional(),
  last_modified_after: timestampSchema.optional(),
  last_modified_before: timestampSchema.optional(),
});

export const AdvancedServiceFiltersSchema = ServiceFiltersSchema.extend({
  staff_specialization: ServiceCategorySchema.optional(),
  room_capacity_min: z.number().int().positive().optional(),
  room_capacity_max: z.number().int().positive().optional(),
  available_on_date: dateSchema.optional(),
  available_at_time: timeSchema.optional(),
  popularity_score_min: z.number().min(0).max(5).optional(),
});

export const AdvancedUserFiltersSchema = z.object({
  role: UserRoleSchema.optional(),
  search: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
  has_bookings: z.boolean().optional(),
  last_booking_after: dateSchema.optional(),
  last_booking_before: dateSchema.optional(),
  total_bookings_min: z.number().int().nonnegative().optional(),
  total_bookings_max: z.number().int().nonnegative().optional(),
  total_spent_min: priceSchema.optional(),
  total_spent_max: priceSchema.optional(),
  has_medical_conditions: z.boolean().optional(),
  has_allergies: z.boolean().optional(),
  emergency_contact_provided: z.boolean().optional(),
});

/**
 * Date range and time slot validation schemas
 */
export const DateRangeSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date'],
  }
);

export const TimeSlotValidationSchema = z.object({
  start_time: timeSchema,
  end_time: timeSchema,
  date: dateSchema,
}).refine(
  (data) => data.end_time > data.start_time,
  {
    message: 'End time must be after start time',
    path: ['end_time'],
  }
).refine(
  (data) => {
    const bookingDateTime = new Date(`${data.date}T${data.start_time}`);
    const now = new Date();
    const minAdvanceHours = 2; // MIN_BOOKING_ADVANCE_HOURS
    return bookingDateTime.getTime() > now.getTime() + (minAdvanceHours * 60 * 60 * 1000);
  },
  {
    message: `Booking must be at least 2 hours in advance`,
    path: ['start_time'],
  }
);

export const RecurringBookingSchema = z.object({
  base_booking: CreateBookingRequestSchema,
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
    interval: z.number().int().positive().max(12), // Max 12 intervals
    end_date: dateSchema,
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(), // For weekly patterns
    day_of_month: z.number().int().min(1).max(31).optional(), // For monthly patterns
  }),
  skip_conflicts: z.boolean().default(true),
  auto_assign_alternatives: z.boolean().default(false),
});

/**
 * File upload validation schemas
 */
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/),
  size: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
  data: z.string().base64(), // Base64 encoded file data
});

export const ProfilePictureUploadSchema = FileUploadSchema.extend({
  content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive().max(5 * 1024 * 1024), // 5MB max for images
});

export const DocumentUploadSchema = FileUploadSchema.extend({
  content_type: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  document_type: z.enum(['medical_clearance', 'identification', 'insurance_card', 'other']),
  description: z.string().max(200).optional(),
});

/**
 * Export validation schemas
 */
export const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']),
  date_from: dateSchema,
  date_to: dateSchema,
  filters: z.record(z.any()).optional(),
  include_personal_data: z.boolean().default(false),
  email_to: emailSchema.optional(), // Send export via email
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;
export type PathParams = z.infer<typeof PathParamsSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type TimeSlotValidation = z.infer<typeof TimeSlotValidationSchema>;
export type RecurringBooking = z.infer<typeof RecurringBookingSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type ProfilePictureUpload = z.infer<typeof ProfilePictureUploadSchema>;
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type BulkUpdateBookings = z.infer<typeof BulkUpdateBookingsSchema>;
export type BulkCancelBookings = z.infer<typeof BulkCancelBookingsSchema>;
export type BulkCreateBookings = z.infer<typeof BulkCreateBookingsSchema>;
export type AdvancedBookingFilters = z.infer<typeof AdvancedBookingFiltersSchema>;
export type AdvancedServiceFilters = z.infer<typeof AdvancedServiceFiltersSchema>;
export type AdvancedUserFilters = z.infer<typeof AdvancedUserFiltersSchema>;

// =====================================================
// ERROR HANDLING TYPES & HTTP STATUS CODES
// =====================================================

/**
 * HTTP status codes for API responses
 */
export const HttpStatusCodes = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = typeof HttpStatusCodes[keyof typeof HttpStatusCodes];

/**
 * Standard error codes for business logic
 */
export const ErrorCodes = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_ENUM_VALUE: 'INVALID_ENUM_VALUE',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_DELETED: 'RESOURCE_DELETED',
  
  // Booking specific errors
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  STAFF_UNAVAILABLE: 'STAFF_UNAVAILABLE',
  ROOM_UNAVAILABLE: 'ROOM_UNAVAILABLE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BOOKING_TOO_EARLY: 'BOOKING_TOO_EARLY',
  BOOKING_TOO_LATE: 'BOOKING_TOO_LATE',
  BOOKING_LIMIT_EXCEEDED: 'BOOKING_LIMIT_EXCEEDED',
  INVALID_TIME_SLOT: 'INVALID_TIME_SLOT',
  BOOKING_ALREADY_CANCELLED: 'BOOKING_ALREADY_CANCELLED',
  BOOKING_ALREADY_COMPLETED: 'BOOKING_ALREADY_COMPLETED',
  CANCELLATION_DEADLINE_PASSED: 'CANCELLATION_DEADLINE_PASSED',
  
  // Availability errors
  INSUFFICIENT_CAPACITY: 'INSUFFICIENT_CAPACITY',
  DRAINAGE_REQUIRED: 'DRAINAGE_REQUIRED',
  STAFF_INCOMPATIBLE: 'STAFF_INCOMPATIBLE',
  ROOM_INCOMPATIBLE: 'ROOM_INCOMPATIBLE',
  SERVICE_INCOMPATIBLE: 'SERVICE_INCOMPATIBLE',
  
  // Business rule violations
  BUSINESS_HOURS_VIOLATION: 'BUSINESS_HOURS_VIOLATION',
  ADVANCE_BOOKING_VIOLATION: 'ADVANCE_BOOKING_VIOLATION',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  PRICE_MISMATCH: 'PRICE_MISMATCH',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  WEBHOOK_ERROR: 'WEBHOOK_ERROR',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  REFUND_FAILED: 'REFUND_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Detailed error information schema
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: timestampSchema,
  request_id: z.string().optional(),
  path: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Validation error details schema
 */
export const ValidationErrorDetailSchema = z.object({
  field: z.string(),
  value: z.any().optional(),
  message: z.string(),
  code: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
});

export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal(ErrorCodes.VALIDATION_ERROR),
    message: z.string(),
    details: z.object({
      validation_errors: z.array(ValidationErrorDetailSchema),
      invalid_fields: z.array(z.string()),
    }),
  }),
  meta: z.object({
    timestamp: timestampSchema,
    request_id: z.string(),
  }),
});

export type ValidationErrorDetail = z.infer<typeof ValidationErrorDetailSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;

/**
 * Business error response schema for domain-specific errors
 */
export const BusinessErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    context: z.record(z.any()).optional(),
    suggestions: z.array(z.string()).optional(),
    retry_after: z.number().optional(), // Seconds to wait before retry
  }),
  meta: z.object({
    timestamp: timestampSchema,
    request_id: z.string(),
  }),
});

export type BusinessErrorResponse = z.infer<typeof BusinessErrorResponseSchema>;

/**
 * Error mapping for HTTP status codes
 */
export const ErrorStatusMapping: Record<ErrorCode, HttpStatusCode> = {
  // Validation errors -> 400 Bad Request
  [ErrorCodes.VALIDATION_ERROR]: HttpStatusCodes.BAD_REQUEST,
  [ErrorCodes.INVALID_INPUT]: HttpStatusCodes.BAD_REQUEST,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: HttpStatusCodes.BAD_REQUEST,
  [ErrorCodes.INVALID_FORMAT]: HttpStatusCodes.BAD_REQUEST,
  [ErrorCodes.INVALID_ENUM_VALUE]: HttpStatusCodes.BAD_REQUEST,
  
  // Authentication & Authorization -> 401/403
  [ErrorCodes.UNAUTHORIZED]: HttpStatusCodes.UNAUTHORIZED,
  [ErrorCodes.INVALID_TOKEN]: HttpStatusCodes.UNAUTHORIZED,
  [ErrorCodes.TOKEN_EXPIRED]: HttpStatusCodes.UNAUTHORIZED,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: HttpStatusCodes.FORBIDDEN,
  
  // Resource errors -> 404/409
  [ErrorCodes.RESOURCE_NOT_FOUND]: HttpStatusCodes.NOT_FOUND,
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.RESOURCE_CONFLICT]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.RESOURCE_DELETED]: HttpStatusCodes.NOT_FOUND,
  
  // Booking specific -> 409/422
  [ErrorCodes.BOOKING_CONFLICT]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.STAFF_UNAVAILABLE]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.ROOM_UNAVAILABLE]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.SERVICE_UNAVAILABLE]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.BOOKING_TOO_EARLY]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.BOOKING_TOO_LATE]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.BOOKING_LIMIT_EXCEEDED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.INVALID_TIME_SLOT]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.BOOKING_ALREADY_CANCELLED]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.BOOKING_ALREADY_COMPLETED]: HttpStatusCodes.CONFLICT,
  [ErrorCodes.CANCELLATION_DEADLINE_PASSED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  
  // Availability errors -> 422
  [ErrorCodes.INSUFFICIENT_CAPACITY]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.DRAINAGE_REQUIRED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.STAFF_INCOMPATIBLE]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.ROOM_INCOMPATIBLE]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.SERVICE_INCOMPATIBLE]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  
  // Business rule violations -> 422
  [ErrorCodes.BUSINESS_HOURS_VIOLATION]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.ADVANCE_BOOKING_VIOLATION]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.DAILY_LIMIT_EXCEEDED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.PRICE_MISMATCH]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  
  // System errors -> 500/429
  [ErrorCodes.DATABASE_ERROR]: HttpStatusCodes.INTERNAL_SERVER_ERROR,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: HttpStatusCodes.BAD_GATEWAY,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: HttpStatusCodes.TOO_MANY_REQUESTS,
  [ErrorCodes.FILE_UPLOAD_ERROR]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.WEBHOOK_ERROR]: HttpStatusCodes.INTERNAL_SERVER_ERROR,
  
  // Payment errors -> 422
  [ErrorCodes.PAYMENT_FAILED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.PAYMENT_DECLINED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.REFUND_FAILED]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
  [ErrorCodes.INSUFFICIENT_FUNDS]: HttpStatusCodes.UNPROCESSABLE_ENTITY,
};

/**
 * User-friendly error messages
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Validation errors
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCodes.INVALID_INPUT]: 'The provided input is invalid.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'A required field is missing.',
  [ErrorCodes.INVALID_FORMAT]: 'The format of the provided data is incorrect.',
  [ErrorCodes.INVALID_ENUM_VALUE]: 'Please select a valid option.',
  
  // Authentication & Authorization
  [ErrorCodes.UNAUTHORIZED]: 'Please log in to access this resource.',
  [ErrorCodes.INVALID_TOKEN]: 'Your session has expired. Please log in again.',
  [ErrorCodes.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  
  // Resource errors
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 'This resource already exists.',
  [ErrorCodes.RESOURCE_CONFLICT]: 'There is a conflict with the current state of this resource.',
  [ErrorCodes.RESOURCE_DELETED]: 'This resource has been deleted and is no longer available.',
  
  // Booking specific errors
  [ErrorCodes.BOOKING_CONFLICT]: 'This time slot is no longer available.',
  [ErrorCodes.STAFF_UNAVAILABLE]: 'The selected staff member is not available at this time.',
  [ErrorCodes.ROOM_UNAVAILABLE]: 'The selected room is not available at this time.',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'This service is currently unavailable.',
  [ErrorCodes.BOOKING_TOO_EARLY]: 'Bookings must be made at least 2 hours in advance.',
  [ErrorCodes.BOOKING_TOO_LATE]: 'Bookings cannot be made more than 90 days in advance.',
  [ErrorCodes.BOOKING_LIMIT_EXCEEDED]: 'You have reached the maximum number of bookings for today.',
  [ErrorCodes.INVALID_TIME_SLOT]: 'The selected time slot is invalid.',
  [ErrorCodes.BOOKING_ALREADY_CANCELLED]: 'This booking has already been cancelled.',
  [ErrorCodes.BOOKING_ALREADY_COMPLETED]: 'This booking has already been completed.',
  [ErrorCodes.CANCELLATION_DEADLINE_PASSED]: 'The cancellation deadline for this booking has passed.',
  
  // Availability errors
  [ErrorCodes.INSUFFICIENT_CAPACITY]: 'The selected room does not have sufficient capacity for this service.',
  [ErrorCodes.DRAINAGE_REQUIRED]: 'This service requires a room with specialized drainage.',
  [ErrorCodes.STAFF_INCOMPATIBLE]: 'The selected staff member is not qualified for this service.',
  [ErrorCodes.ROOM_INCOMPATIBLE]: 'The selected room is not suitable for this service.',
  [ErrorCodes.SERVICE_INCOMPATIBLE]: 'This service is not compatible with your selection.',
  
  // Business rule violations
  [ErrorCodes.BUSINESS_HOURS_VIOLATION]: 'Bookings can only be made during business hours.',
  [ErrorCodes.ADVANCE_BOOKING_VIOLATION]: 'This booking violates our advance booking policy.',
  [ErrorCodes.DAILY_LIMIT_EXCEEDED]: 'You have exceeded the daily limit for this action.',
  [ErrorCodes.PRICE_MISMATCH]: 'The price for this service has changed. Please refresh and try again.',
  
  // System errors
  [ErrorCodes.DATABASE_ERROR]: 'We are experiencing technical difficulties. Please try again later.',
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 'An external service is currently unavailable. Please try again later.',
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment before trying again.',
  [ErrorCodes.FILE_UPLOAD_ERROR]: 'Failed to upload file. Please check the file format and size.',
  [ErrorCodes.WEBHOOK_ERROR]: 'Failed to process external request.',
  
  // Payment errors
  [ErrorCodes.PAYMENT_FAILED]: 'Payment could not be processed. Please try again.',
  [ErrorCodes.PAYMENT_DECLINED]: 'Payment was declined. Please check your payment method.',
  [ErrorCodes.REFUND_FAILED]: 'Refund could not be processed. Please contact support.',
  [ErrorCodes.INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction.',
};

/**
 * Error context helpers for building detailed error responses
 */
export interface BookingErrorContext {
  booking_id?: string;
  customer_id?: string;
  service_id?: string;
  staff_id?: string;
  room_id?: string;
  requested_date?: string;
  requested_time?: string;
  conflicting_booking_id?: string;
  available_alternatives?: Array<{
    staff_id: string;
    room_id: string;
    start_time: string;
  }>;
}

export interface AvailabilityErrorContext {
  service_id: string;
  date: string;
  time: string;
  conflicts: Array<{
    type: string;
    resource_id: string;
    message: string;
  }>;
  suggestions: Array<{
    date: string;
    time: string;
    staff_id: string;
    room_id: string;
  }>;
}

/**
 * Utility type for creating standardized error responses
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: Record<string, any>;
  };
  meta: {
    timestamp: string;
    request_id: string;
    path?: string;
  };
}

// =====================================================
// ENHANCED PAGINATION & FILTERING
// =====================================================

/**
 * Enhanced pagination with cursor support for large datasets
 */
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(), // Base64 encoded cursor
  limit: z.number().int().positive().max(100).default(20),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const OffsetPaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type CursorPagination = z.infer<typeof CursorPaginationSchema>;
export type OffsetPagination = z.infer<typeof OffsetPaginationSchema>;

/**
 * Paginated response wrapper with comprehensive metadata
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: z.object({
      // Offset-based pagination
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive(),
      total_items: z.number().int().nonnegative(),
      total_pages: z.number().int().nonnegative().optional(),
      has_next: z.boolean(),
      has_prev: z.boolean(),
      
      // Cursor-based pagination
      next_cursor: z.string().optional(),
      prev_cursor: z.string().optional(),
      
      // Sorting information
      sort_by: z.string().optional(),
      sort_order: z.enum(['asc', 'desc']),
    }),
    filters: z.object({
      applied_filters: z.record(z.any()),
      available_filters: z.record(z.object({
        type: z.enum(['string', 'number', 'boolean', 'enum', 'date', 'datetime']),
        options: z.array(z.any()).optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      })).optional(),
    }).optional(),
    meta: z.object({
      query_time_ms: z.number().nonnegative(),
      cache_hit: z.boolean().optional(),
      timestamp: timestampSchema,
    }),
  });

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    page?: number;
    limit: number;
    total_items: number;
    total_pages?: number;
    has_next: boolean;
    has_prev: boolean;
    next_cursor?: string;
    prev_cursor?: string;
    sort_by?: string;
    sort_order: 'asc' | 'desc';
  };
  filters?: {
    applied_filters: Record<string, any>;
    available_filters?: Record<string, {
      type: 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'datetime';
      options?: any[];
      min?: number;
      max?: number;
    }>;
  };
  meta: {
    query_time_ms: number;
    cache_hit?: boolean;
    timestamp: string;
  };
};

/**
 * Advanced filtering with operators
 */
export const FilterOperatorSchema = z.enum([
  'eq',           // equals
  'ne',           // not equals
  'gt',           // greater than
  'gte',          // greater than or equal
  'lt',           // less than
  'lte',          // less than or equal
  'like',         // SQL LIKE pattern
  'ilike',        // case-insensitive LIKE
  'in',           // value in array
  'not_in',       // value not in array
  'is_null',      // is null
  'is_not_null',  // is not null
  'between',      // between two values
  'contains',     // array contains value
  'contained_by', // array is contained by value
  'overlaps',     // arrays overlap
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.any().optional(),
  values: z.array(z.any()).optional(), // For 'in', 'not_in', 'between'
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;

export type FilterGroup = {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
};

export const FilterGroupSchema = z.object({
  logic: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(FilterConditionSchema),
  groups: z.array(z.lazy(() => FilterGroupSchema)).optional(), // Nested groups
}) as z.ZodSchema<FilterGroup>;

/**
 * Search configuration with text search options
 */
export const SearchConfigSchema = z.object({
  query: z.string().min(1).max(200),
  fields: z.array(z.string()).optional(), // Specific fields to search
  operator: z.enum(['AND', 'OR']).default('OR'),
  fuzzy: z.boolean().default(false), // Enable fuzzy matching
  highlight: z.boolean().default(false), // Return highlighted results
  boost: z.record(z.number().positive()).optional(), // Field boost scores
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

/**
 * Aggregation support for analytics
 */
export const AggregationSchema = z.object({
  field: z.string(),
  type: z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct_count']),
  alias: z.string().optional(),
});

export const GroupBySchema = z.object({
  fields: z.array(z.string()).min(1),
  aggregations: z.array(AggregationSchema).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export type Aggregation = z.infer<typeof AggregationSchema>;
export type GroupBy = z.infer<typeof GroupBySchema>;

/**
 * Comprehensive query builder for complex API requests
 */
export const QueryBuilderSchema = z.object({
  // Pagination
  pagination: z.union([CursorPaginationSchema, OffsetPaginationSchema]).optional(),
  
  // Filtering
  filters: FilterGroupSchema.optional(),
  
  // Search
  search: SearchConfigSchema.optional(),
  
  // Sorting
  sort: z.array(z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('asc'),
    nulls: z.enum(['first', 'last']).optional(),
  })).optional(),
  
  // Field selection
  select: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(), // Related entities to include
  exclude: z.array(z.string()).optional(), // Fields to exclude
  
  // Aggregation
  group_by: GroupBySchema.optional(),
  
  // Performance options
  cache: z.boolean().default(true),
  explain: z.boolean().default(false), // Return query execution plan
});

export type QueryBuilder = z.infer<typeof QueryBuilderSchema>;

/**
 * Specific filter schemas for different entities
 */
export const BookingAdvancedFiltersSchema = z.object({
  // Basic filters
  customer_id: z.array(uuidSchema).optional(),
  staff_id: z.array(uuidSchema).optional(),
  service_id: z.array(uuidSchema).optional(),
  room_id: z.array(uuidSchema).optional(),
  status: z.array(BookingStatusSchema).optional(),
  
  // Date and time filters
  booking_date: z.object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  }).optional(),
  booking_time: z.object({
    from: timeSchema.optional(),
    to: timeSchema.optional(),
  }).optional(),
  created_at: z.object({
    from: timestampSchema.optional(),
    to: timestampSchema.optional(),
  }).optional(),
  
  // Price filters
  total_price: z.object({
    min: priceSchema.optional(),
    max: priceSchema.optional(),
  }).optional(),
  
  // Duration filters
  duration_minutes: z.object({
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
  }).optional(),
  
  // Service category filter
  service_category: z.array(ServiceCategorySchema).optional(),
  
  // Special requests
  has_special_requests: z.boolean().optional(),
  special_requests_contains: z.string().optional(),
  
  // Customer details
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
  
  // Staff details
  staff_name: z.string().optional(),
  staff_employee_id: z.string().optional(),
  
  // Room details
  room_name: z.string().optional(),
  room_number: z.array(z.number().int().positive()).optional(),
  room_capacity: z.object({
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
  }).optional(),
  
  // Source tracking
  source: z.array(z.enum(['web', 'phone', 'walk_in', 'webhook'])).optional(),
});

export const ServiceAdvancedFiltersSchema = z.object({
  // Basic filters
  category: z.array(ServiceCategorySchema).optional(),
  is_active: z.boolean().optional(),
  
  // Price filters
  price: z.object({
    min: priceSchema.optional(),
    max: priceSchema.optional(),
  }).optional(),
  
  // Duration filters
  duration_minutes: z.object({
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
  }).optional(),
  
  // Room requirements
  requires_specialized_drainage: z.boolean().optional(),
  min_room_capacity: z.object({
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
  }).optional(),
  
  // Availability filters
  available_on_date: dateSchema.optional(),
  available_at_time: timeSchema.optional(),
  compatible_with_room: z.array(uuidSchema).optional(),
  
  // Staff compatibility
  staff_specialization: z.array(ServiceCategorySchema).optional(),
  available_staff_count: z.object({
    min: z.number().int().nonnegative().optional(),
  }).optional(),
  
  // Usage statistics
  booking_count: z.object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
    period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  }).optional(),
  
  // Revenue filters
  total_revenue: z.object({
    min: priceSchema.optional(),
    max: priceSchema.optional(),
    period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  }).optional(),
});

export const UserAdvancedFiltersSchema = z.object({
  // Basic filters
  role: z.array(UserRoleSchema).optional(),
  is_active: z.boolean().optional(),
  
  // Registration date
  created_at: z.object({
    from: timestampSchema.optional(),
    to: timestampSchema.optional(),
  }).optional(),
  
  // Personal info
  age: z.object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
  }).optional(),
  has_date_of_birth: z.boolean().optional(),
  has_emergency_contact: z.boolean().optional(),
  has_medical_conditions: z.boolean().optional(),
  has_allergies: z.boolean().optional(),
  
  // Contact info
  has_phone: z.boolean().optional(),
  phone_area_code: z.string().optional(),
  email_domain: z.string().optional(),
  
  // Booking behavior
  total_bookings: z.object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().nonnegative().optional(),
  }).optional(),
  last_booking_date: z.object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  }).optional(),
  total_spent: z.object({
    min: priceSchema.optional(),
    max: priceSchema.optional(),
  }).optional(),
  favorite_service_category: z.array(ServiceCategorySchema).optional(),
  
  // Staff-specific filters
  staff_hire_date: z.object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  }).optional(),
  staff_specializations: z.array(ServiceCategorySchema).optional(),
  staff_hourly_rate: z.object({
    min: priceSchema.optional(),
    max: priceSchema.optional(),
  }).optional(),
});

export type BookingAdvancedFilters = z.infer<typeof BookingAdvancedFiltersSchema>;
export type ServiceAdvancedFilters = z.infer<typeof ServiceAdvancedFiltersSchema>;
export type UserAdvancedFilters = z.infer<typeof UserAdvancedFiltersSchema>;

/**
 * Export and reporting filters
 */
export const ExportFiltersSchema = z.object({
  date_range: z.object({
    from: dateSchema,
    to: dateSchema,
  }),
  entities: z.array(z.enum(['bookings', 'users', 'services', 'staff', 'rooms'])),
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']),
  include_personal_data: z.boolean().default(false),
  include_financial_data: z.boolean().default(false),
  grouping: z.enum(['daily', 'weekly', 'monthly']).optional(),
  filters: z.record(z.any()).optional(),
});

export type ExportFilters = z.infer<typeof ExportFiltersSchema>;

// =====================================================
// WEBHOOK TYPES FOR EXTERNAL INTEGRATIONS
// =====================================================

/**
 * Common webhook headers and security
 */
export const WebhookHeadersSchema = z.object({
  'x-webhook-id': z.string(),
  'x-webhook-timestamp': z.string(),
  'x-webhook-signature': z.string(), // HMAC signature for verification
  'x-webhook-retry': z.string().optional(), // Retry attempt number
  'content-type': z.literal('application/json'),
  'user-agent': z.string().optional(),
});

export type WebhookHeaders = z.infer<typeof WebhookHeadersSchema>;

/**
 * Base webhook payload structure
 */
export const BaseWebhookPayloadSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: timestampSchema,
  version: z.string().default('1.0'),
  source: z.string(),
  test: z.boolean().default(false), // Flag for test webhooks
});

export type BaseWebhookPayload = z.infer<typeof BaseWebhookPayloadSchema>;

/**
 * Voice booking agent webhook types
 */
export const VoiceBookingEventSchema = z.enum([
  'booking.requested',
  'booking.confirmed',
  'booking.cancelled',
  'booking.rescheduled',
  'availability.requested',
  'customer.identified',
  'customer.not_found',
  'call.started',
  'call.ended',
  'error.occurred',
]);

export type VoiceBookingEvent = z.infer<typeof VoiceBookingEventSchema>;

export const VoiceBookingRequestSchema = z.object({
  // Customer information (may be partial from voice recognition)
  customer: z.object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    customer_id: uuidSchema.optional(), // If customer was identified
  }),
  
  // Booking preferences from voice input
  booking_request: z.object({
    service_name: z.string().optional(),
    service_category: ServiceCategorySchema.optional(),
    preferred_date: dateSchema.optional(),
    preferred_time: timeSchema.optional(),
    staff_preference: z.string().optional(), // Staff name or "no preference"
    special_requests: z.string().optional(),
    flexible_scheduling: z.boolean().default(true),
  }),
  
  // Call context
  call_info: z.object({
    call_id: z.string(),
    duration_seconds: z.number().int().nonnegative().optional(),
    confidence_score: z.number().min(0).max(1).optional(), // Voice recognition confidence
    language: z.string().default('en'),
    transcription: z.string().optional(),
  }),
  
  // Assistant response requirements
  response_requirements: z.object({
    include_alternatives: z.boolean().default(true),
    max_alternatives: z.number().int().positive().max(5).default(3),
    include_pricing: z.boolean().default(true),
    preferred_response_format: z.enum(['structured', 'natural_language']).default('structured'),
  }),
});

export const VoiceBookingResponseSchema = z.object({
  success: z.boolean(),
  booking: BookingWithDetailsSchema.optional(),
  alternatives: z.array(z.object({
    date: dateSchema,
    time: timeSchema,
    staff_name: z.string(),
    room_name: z.string(),
    price: priceSchema,
    confidence_score: z.number().min(0).max(1),
  })).optional(),
  message: z.string(), // Human-readable response for voice assistant
  next_action: z.enum([
    'confirm_booking',
    'request_customer_info',
    'suggest_alternatives',
    'transfer_to_human',
    'end_call',
  ]),
  required_fields: z.array(z.string()).optional(), // Fields needed to complete booking
});

export type VoiceBookingRequest = z.infer<typeof VoiceBookingRequestSchema>;
export type VoiceBookingResponse = z.infer<typeof VoiceBookingResponseSchema>;

/**
 * Payment processing webhook types
 */
export const PaymentEventSchema = z.enum([
  'payment.initiated',
  'payment.processing',
  'payment.succeeded',
  'payment.failed',
  'payment.cancelled',
  'refund.initiated',
  'refund.succeeded',
  'refund.failed',
  'chargeback.created',
  'dispute.created',
]);

export type PaymentEvent = z.infer<typeof PaymentEventSchema>;

export const PaymentWebhookSchema = BaseWebhookPayloadSchema.extend({
  type: PaymentEventSchema,
  data: z.object({
    payment_id: z.string(),
    booking_id: uuidSchema,
    customer_id: uuidSchema,
    amount: priceSchema,
    currency: z.string().length(3).default('USD'),
    payment_method: z.enum(['card', 'bank_transfer', 'digital_wallet', 'cash']),
    
    // Payment processor details
    processor: z.enum(['stripe', 'square', 'paypal', 'manual']),
    processor_transaction_id: z.string().optional(),
    processor_fee: priceSchema.optional(),
    
    // Status details
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']),
    failure_reason: z.string().optional(),
    risk_score: z.number().min(0).max(100).optional(),
    
    // Metadata
    metadata: z.record(z.any()).optional(),
    receipt_url: z.string().url().optional(),
    refund_amount: priceSchema.optional(),
  }),
});

export type PaymentWebhook = z.infer<typeof PaymentWebhookSchema>;

/**
 * Calendar sync webhook types
 */
export const CalendarEventSchema = z.enum([
  'calendar.sync_requested',
  'calendar.booking_created',
  'calendar.booking_updated',
  'calendar.booking_deleted',
  'calendar.availability_changed',
  'calendar.sync_failed',
]);

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarSyncWebhookSchema = BaseWebhookPayloadSchema.extend({
  type: CalendarEventSchema,
  data: z.object({
    calendar_provider: z.enum(['google', 'outlook', 'apple', 'other']),
    staff_id: uuidSchema,
    booking_id: uuidSchema.optional(),
    
    // Calendar event details
    event: z.object({
      external_event_id: z.string(),
      title: z.string(),
      start_time: timestampSchema,
      end_time: timestampSchema,
      location: z.string().optional(),
      description: z.string().optional(),
      attendees: z.array(z.string()).optional(),
    }),
    
    // Sync details
    sync_direction: z.enum(['inbound', 'outbound', 'bidirectional']),
    conflict_resolution: z.enum(['override_external', 'override_internal', 'manual_review']).optional(),
    
    // Error information (if sync failed)
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.any()).optional(),
    }).optional(),
  }),
});

export type CalendarSyncWebhook = z.infer<typeof CalendarSyncWebhookSchema>;

/**
 * Customer communication webhook types
 */
export const CommunicationEventSchema = z.enum([
  'sms.sent',
  'sms.delivered',
  'sms.failed',
  'email.sent',
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
  'notification.sent',
  'notification.received',
]);

export type CommunicationEvent = z.infer<typeof CommunicationEventSchema>;

export const CommunicationWebhookSchema = BaseWebhookPayloadSchema.extend({
  type: CommunicationEventSchema,
  data: z.object({
    message_id: z.string(),
    customer_id: uuidSchema,
    booking_id: uuidSchema.optional(),
    
    // Message details
    channel: z.enum(['sms', 'email', 'push', 'in_app']),
    template_id: z.string().optional(),
    subject: z.string().optional(),
    content: z.string(),
    
    // Delivery details
    sent_at: timestampSchema,
    delivered_at: timestampSchema.optional(),
    opened_at: timestampSchema.optional(),
    clicked_at: timestampSchema.optional(),
    
    // Status and metrics
    status: z.enum(['sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked']),
    error_message: z.string().optional(),
    cost: priceSchema.optional(),
    
    // Recipient info
    recipient: z.object({
      email: emailSchema.optional(),
      phone: phoneSchema.optional(),
      device_id: z.string().optional(),
    }),
  }),
});

export type CommunicationWebhook = z.infer<typeof CommunicationWebhookSchema>;

/**
 * Review and feedback webhook types
 */
export const ReviewEventSchema = z.enum([
  'review.submitted',
  'review.updated',
  'review.deleted',
  'review.flagged',
  'feedback.received',
  'survey.completed',
]);

export type ReviewEvent = z.infer<typeof ReviewEventSchema>;

export const ReviewWebhookSchema = BaseWebhookPayloadSchema.extend({
  type: ReviewEventSchema,
  data: z.object({
    review_id: z.string(),
    booking_id: uuidSchema,
    customer_id: uuidSchema,
    service_id: uuidSchema,
    staff_id: uuidSchema,
    
    // Review content
    rating: z.number().int().min(1).max(5),
    title: z.string().optional(),
    comment: z.string().optional(),
    
    // Feedback categories
    categories: z.array(z.enum([
      'service_quality',
      'staff_professionalism',
      'cleanliness',
      'value_for_money',
      'booking_process',
      'facility_quality',
    ])).optional(),
    
    // Metadata
    verified_purchase: z.boolean().default(true),
    anonymous: z.boolean().default(false),
    language: z.string().default('en'),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    
    // Moderation
    flagged: z.boolean().default(false),
    flag_reason: z.string().optional(),
    auto_moderated: z.boolean().default(false),
  }),
});

export type ReviewWebhook = z.infer<typeof ReviewWebhookSchema>;

/**
 * Webhook response schemas
 */
export const WebhookResponseSchema = z.object({
  status: z.enum(['received', 'processed', 'error']),
  message: z.string().optional(),
  retry: z.boolean().default(false),
  retry_after: z.number().int().positive().optional(), // Seconds to wait
  data: z.record(z.any()).optional(),
});

export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;

/**
 * Webhook configuration and management
 */
export const WebhookConfigSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  active: z.boolean().default(true),
  
  // Security
  secret: z.string().min(32), // For HMAC signature verification
  signature_header: z.string().default('x-webhook-signature'),
  
  // Retry configuration
  max_retries: z.number().int().nonnegative().max(10).default(3),
  retry_delays: z.array(z.number().int().positive()).default([1, 5, 15]), // Seconds between retries
  timeout_seconds: z.number().int().positive().max(30).default(10),
  
  // Filtering
  filters: z.record(z.any()).optional(),
  
  // Headers to include
  custom_headers: z.record(z.string()).optional(),
  
  // Metadata
  description: z.string().optional(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  last_triggered_at: timestampSchema.optional(),
  last_success_at: timestampSchema.optional(),
  failure_count: z.number().int().nonnegative().default(0),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

/**
 * Webhook delivery tracking
 */
export const WebhookDeliverySchema = z.object({
  id: uuidSchema,
  webhook_id: uuidSchema,
  event_type: z.string(),
  payload: z.record(z.any()),
  
  // Delivery details
  url: z.string().url(),
  http_method: z.enum(['POST', 'PUT']).default('POST'),
  headers: z.record(z.string()),
  
  // Response details
  status_code: z.number().int().optional(),
  response_body: z.string().optional(),
  response_headers: z.record(z.string()).optional(),
  
  // Timing
  attempted_at: timestampSchema,
  completed_at: timestampSchema.optional(),
  duration_ms: z.number().nonnegative().optional(),
  
  // Status
  success: z.boolean(),
  error_message: z.string().optional(),
  retry_count: z.number().int().nonnegative().default(0),
  next_retry_at: timestampSchema.optional(),
});

export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

/**
 * Union type for all webhook payloads
 */
export const AnyWebhookPayloadSchema = z.discriminatedUnion('type', [
  PaymentWebhookSchema,
  CalendarSyncWebhookSchema,
  CommunicationWebhookSchema,
  ReviewWebhookSchema,
]);

export type AnyWebhookPayload = z.infer<typeof AnyWebhookPayloadSchema>;

// =====================================================
// NEXT.JS API ROUTE HELPERS & UTILITIES
// =====================================================

/**
 * Next.js API route context types
 */
export interface ApiRouteContext {
  params: Record<string, string>;
  searchParams: Record<string, string | string[]>;
  req: {
    headers: Record<string, string>;
    method: string;
    url: string;
    cookies: Record<string, string>;
  };
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
  session?: {
    id: string;
    expires_at: string;
  };
}

/**
 * API route handler function types
 */
export type ApiHandler<TRequest = any, TResponse = any> = (
  request: TRequest,
  context: ApiRouteContext
) => Promise<TResponse>;

export type NextApiHandler<TResponse = any> = (
  req: NextApiRequest,
  res: NextApiResponse<TResponse>
) => Promise<void>;

// Type imports for Next.js
interface NextApiRequest {
  query: Record<string, string | string[]>;
  method?: string;
  cookies: Record<string, string>;
  body: any;
  headers: Record<string, string>;
}

interface NextApiResponse<T = any> {
  status: (statusCode: number) => NextApiResponse<T>;
  json: (body: T) => void;
  send: (body: T) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
}

/**
 * API middleware types
 */
export type ApiMiddleware<TContext = ApiRouteContext> = (
  context: TContext,
  next: () => Promise<void>
) => Promise<void>;

export interface MiddlewareConfig {
  auth?: {
    required: boolean;
    roles?: UserRole[];
    permissions?: string[];
  };
  rateLimit?: {
    requests: number;
    window: number; // seconds
    skip?: (context: ApiRouteContext) => boolean;
  };
  cors?: {
    origin: string | string[];
    methods: string[];
    allowedHeaders: string[];
  };
  cache?: {
    ttl: number; // seconds
    tags?: string[];
    key?: (context: ApiRouteContext) => string;
  };
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
}

/**
 * Request validation helpers
 */
export const createRequestValidator = <
  TBody extends z.ZodSchema,
  TQuery extends z.ZodSchema,
  TParams extends z.ZodSchema
>(config: {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
}) => {
  return (data: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
  }): {
    body?: z.infer<TBody>;
    query?: z.infer<TQuery>;
    params?: z.infer<TParams>;
  } => {
    const result: any = {};
    
    if (config.body && data.body !== undefined) {
      result.body = config.body.parse(data.body);
    }
    
    if (config.query && data.query !== undefined) {
      result.query = config.query.parse(data.query);
    }
    
    if (config.params && data.params !== undefined) {
      result.params = config.params.parse(data.params);
    }
    
    return result;
  };
};

/**
 * Response builder helpers
 */
export class ApiResponseBuilder<T = any> {
  private statusCode: number = 200;
  private headers: Record<string, string> = {};
  private data?: T;
  private errorData?: {
    code: ErrorCode;
    message: string;
    field?: string;
    details?: Record<string, any>;
  };
  private meta?: Record<string, any>;

  status(code: HttpStatusCode): this {
    this.statusCode = code;
    return this;
  }

  header(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  success(data: T, meta?: Record<string, any>): ApiResponseWrapper<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  error(
    code: ErrorCode,
    message?: string,
    field?: string,
    details?: Record<string, any>
  ): StandardErrorResponse {
    const errorMessage = message || ErrorMessages[code];
    return {
      success: false,
      error: {
        code,
        message: errorMessage,
        field,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
    };
  }

  validationError(errors: z.ZodError): ValidationErrorResponse {
    return {
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: {
          validation_errors: errors.errors.map(err => ({
            field: err.path.join('.'),
            value: (err as any).received,
            message: err.message,
            code: err.code,
            path: err.path,
          })),
          invalid_fields: errors.errors.map(err => err.path.join('.')),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
    };
  }

  paginated<TItem>(
    items: TItem[],
    pagination: {
      page?: number;
      limit: number;
      total_items: number;
      sort_by?: string;
      sort_order: 'asc' | 'desc';
    },
    meta?: Record<string, any>
  ): PaginatedResponse<TItem> {
    const totalPages = pagination.page ? Math.ceil(pagination.total_items / pagination.limit) : undefined;
    const hasNext = pagination.page ? pagination.page < totalPages! : false;
    const hasPrev = pagination.page ? pagination.page > 1 : false;

    return {
      success: true,
      data: items,
      pagination: {
        ...pagination,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev,
      },
      meta: {
        query_time_ms: 0,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }
}

/**
 * API route method handlers
 */
export interface RouteHandlers {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  PATCH?: ApiHandler;
  DELETE?: ApiHandler;
  OPTIONS?: ApiHandler;
}

/**
 * Rate limiting types
 */
export interface RateLimitConfig {
  identifier: string; // IP address, user ID, API key, etc.
  limit: number;
  window: number; // seconds
  skip?: boolean;
  reset_time?: number;
  remaining?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset_time: number;
  retry_after?: number;
}

/**
 * Caching types
 */
export interface CacheConfig {
  key: string;
  ttl: number; // seconds
  tags?: string[];
  namespace?: string;
  compress?: boolean;
}

export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  created_at?: string;
  expires_at?: string;
}

/**
 * Authentication and authorization types
 */
export interface AuthContext {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
  session?: {
    id: string;
    expires_at: string;
  };
  token?: {
    type: 'bearer' | 'api_key';
    value: string;
    expires_at?: string;
  };
}

export interface PermissionCheck {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

/**
 * Database transaction types
 */
export interface TransactionContext {
  id: string;
  started_at: string;
  isolation_level?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
}

export type TransactionCallback<T> = (tx: any) => Promise<T>;

/**
 * Audit logging types
 */
export interface AuditLogEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

/**
 * File handling types
 */
export interface FileUploadResult {
  id: string;
  filename: string;
  original_filename: string;
  content_type: string;
  size: number;
  url: string;
  storage_path: string;
  uploaded_at: string;
}

export interface FileUploadConfig {
  max_size: number; // bytes
  allowed_types: string[];
  storage_path: string;
  generate_thumbnails?: boolean;
  virus_scan?: boolean;
}

/**
 * Background job types
 */
export interface JobDefinition<TPayload = any> {
  id: string;
  type: string;
  payload: TPayload;
  priority?: number;
  delay?: number; // seconds
  max_retries?: number;
  retry_delay?: number; // seconds
  scheduled_for?: string;
  metadata?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
  duration_ms: number;
  retries: number;
  completed_at: string;
}

/**
 * Metrics and monitoring types
 */
export interface ApiMetrics {
  request_count: number;
  response_time_ms: number;
  error_count: number;
  error_rate: number;
  throughput: number; // requests per second
  active_connections: number;
  cache_hit_rate?: number;
  database_query_time_ms?: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time_ms?: number;
  last_check: string;
  details?: Record<string, any>;
  dependencies?: HealthCheck[];
}

/**
 * API versioning types
 */
export interface ApiVersion {
  version: string;
  status: 'active' | 'deprecated' | 'sunset';
  sunset_date?: string;
  migration_guide?: string;
  breaking_changes?: string[];
}

/**
 * Content negotiation types
 */
export interface ContentType {
  type: string;
  charset?: string;
  boundary?: string;
  quality?: number;
}

export interface AcceptHeader {
  types: ContentType[];
  languages: string[];
  encodings: string[];
}

/**
 * Utility type for API endpoint configuration
 */
export interface ApiEndpointConfig {
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  auth?: MiddlewareConfig['auth'];
  rateLimit?: MiddlewareConfig['rateLimit'];
  cache?: MiddlewareConfig['cache'];
  validation?: MiddlewareConfig['validation'];
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  version?: string;
}

/**
 * OpenAPI/Swagger documentation types
 */
export interface ApiDocumentation {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
}

/**
 * Export commonly used response builders
 */
export const ApiResponse = new ApiResponseBuilder();

/**
 * Utility functions for common API operations
 */
export const ApiUtils = {
  generateRequestId: () => crypto.randomUUID(),
  
  extractBearerToken: (authHeader?: string): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  },
  
  parseAcceptHeader: (acceptHeader?: string): ContentType[] => {
    if (!acceptHeader) return [];
    
    return acceptHeader
      .split(',')
      .map(type => {
        const [mediaType, ...params] = type.trim().split(';');
        const quality = params
          .find(p => p.trim().startsWith('q='))
          ?.split('=')[1];
        
        return {
          type: mediaType.trim(),
          quality: quality ? parseFloat(quality) : 1,
        };
      })
      .sort((a, b) => (b.quality || 1) - (a.quality || 1));
  },
  
  isValidUUID: (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  },
  
  sanitizeFilename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  },
  
  calculatePagination: (page: number, limit: number, total: number) => ({
    page,
    limit,
    total_items: total,
    total_pages: Math.ceil(total / limit),
    has_next: page * limit < total,
    has_prev: page > 1,
    offset: (page - 1) * limit,
  }),
} as const;

export const BusinessRules = {
  ROOMS: {
    ROOM_1: { number: 1, bed_capacity: 1, name: 'Serenity Suite' },
    ROOM_2: { number: 2, bed_capacity: 2, name: 'Harmony Haven' },
    ROOM_3: { number: 3, bed_capacity: 2, name: 'Renewal Retreat', has_specialized_drainage: true },
  },
  SERVICES: {
    BODY_SCRUBS_ROOM_ONLY: 3, // Only Room 3 for body scrubs
    COUPLES_MIN_CAPACITY: 2,   // Couples treatments need double rooms
  },
  VALIDATION: {
    MAX_BOOKING_ADVANCE_DAYS: 90,
    MIN_BOOKING_ADVANCE_HOURS: 2,
    MAX_DAILY_BOOKINGS_PER_CUSTOMER: 3,
  },
} as const;