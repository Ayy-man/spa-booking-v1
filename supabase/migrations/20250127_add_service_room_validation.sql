-- =====================================================
-- Service Room Compatibility Validation Function
-- =====================================================
-- Adds a database function to validate service-room compatibility
-- Used by the optimized availability functions
-- =====================================================

-- Create function to validate service-room compatibility
CREATE OR REPLACE FUNCTION validate_service_room_compatibility(
    p_service_id UUID,
    p_room_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    service_record RECORD;
    room_record RECORD;
BEGIN
    -- Get service requirements
    SELECT 
        requires_specialized_drainage,
        min_room_capacity,
        allowed_room_ids
    INTO service_record
    FROM services 
    WHERE id = p_service_id 
    AND is_active = true
    AND deleted_at IS NULL;
    
    -- Return false if service not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get room capabilities
    SELECT 
        bed_capacity,
        has_specialized_drainage
    INTO room_record
    FROM rooms 
    WHERE id = p_room_id 
    AND is_active = true
    AND deleted_at IS NULL;
    
    -- Return false if room not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check specialized drainage requirement
    IF service_record.requires_specialized_drainage = true 
       AND room_record.has_specialized_drainage = false THEN
        RETURN FALSE;
    END IF;
    
    -- Check minimum capacity requirement
    IF service_record.min_room_capacity > room_record.bed_capacity THEN
        RETURN FALSE;
    END IF;
    
    -- Check allowed rooms restriction
    IF service_record.allowed_room_ids IS NOT NULL 
       AND array_length(service_record.allowed_room_ids, 1) > 0 THEN
        IF NOT (p_room_id = ANY(service_record.allowed_room_ids::uuid[])) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- All checks passed
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return false for safety
        RAISE WARNING 'Error in validate_service_room_compatibility: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION validate_service_room_compatibility IS 'Validates whether a service can be performed in a specific room based on business rules';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_service_room_compatibility TO authenticated;
GRANT EXECUTE ON FUNCTION validate_service_room_compatibility TO service_role;