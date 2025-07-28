-- Clear existing services
DELETE FROM services;

-- Insert real spa services
INSERT INTO services (name, description, duration, price, category, requires_specialized_drainage, min_room_capacity, is_active) VALUES
-- Facial Services
('Basic Facial (For Men & Women)', 'Gentle cleansing and moisturizing facial suitable for all skin types', 30, 65.00, 'facial', false, 1, true),
('Deep Cleansing Facial (for Men & Women)', 'Intensive cleansing treatment for deep pore purification', 60, 79.00, 'facial', false, 1, true),
('Placenta | Collagen Facial', 'Rejuvenating facial with placenta and collagen treatment', 60, 90.00, 'facial', false, 1, true),
('Whitening Kojic Facial', 'Brightening facial treatment with kojic acid', 60, 90.00, 'facial', false, 1, true),
('Anti-Acne Facial (for Men & Women)', 'Specialized treatment for acne-prone skin', 60, 90.00, 'facial', false, 1, true),
('Microderm Facial', 'Microdermabrasion facial for skin resurfacing', 60, 99.00, 'facial', false, 1, true),
('Vitamin C Facial with Extreme Softness', 'Vitamin C infused facial for radiant, soft skin', 60, 120.00, 'facial', false, 1, true),
('Acne Vulgaris Facial', 'Medical-grade treatment for severe acne', 60, 120.00, 'facial', false, 1, true),

-- Package Deals
('Balinese Body Massage + Basic Facial', 'Relaxing massage and facial combination', 90, 130.00, 'wellness', false, 1, true),
('Deep Tissue Body Massage + 3Face', 'Intensive massage with triple facial treatment', 120, 180.00, 'wellness', false, 1, true),
('Hot Stone Body Massage + Microderm Facial', 'Hot stone therapy with skin resurfacing facial', 150, 200.00, 'wellness', false, 1, true),

-- Massage Services
('Balinese Body Massage', 'Traditional Balinese massage technique', 60, 80.00, 'massage', false, 1, true),
('Maternity Massage', 'Gentle massage designed for expecting mothers', 60, 85.00, 'massage', false, 1, true),
('Stretching Body Massage', 'Massage incorporating assisted stretching', 60, 85.00, 'massage', false, 1, true),
('Deep Tissue Body Massage', 'Intensive massage targeting deep muscle layers', 60, 90.00, 'massage', false, 1, true),
('Hot Stone Massage', 'Relaxing massage using heated stones', 60, 90.00, 'massage', false, 1, true),
('Hot Stone Massage 90 Minutes', 'Extended hot stone therapy session', 90, 120.00, 'massage', false, 1, true),

-- Body Treatments
('Underarm Cleaning', 'Deep cleaning treatment for underarm area', 30, 99.00, 'body_treatment', true, 1, true),
('Back Treatment', 'Cleansing and purifying treatment for back', 30, 99.00, 'body_treatment', true, 1, true),
('Chemical Peel (Body) Per Area', 'Chemical exfoliation treatment per body area', 30, 85.00, 'body_treatment', true, 1, true),
('Underarm or Inguinal Whitening', 'Skin lightening treatment for sensitive areas', 30, 150.00, 'body_treatment', true, 1, true),
('Basic Vajacial Cleaning + Brazilian Wax', 'Intimate area treatment with waxing', 30, 90.00, 'body_treatment', true, 1, true),
('Microdermabrasion (Body) Per Area', 'Body skin resurfacing treatment', 30, 85.00, 'body_treatment', true, 1, true),
('Deep Moisturizing Body Treatment', 'Intensive hydration for dry skin', 30, 65.00, 'body_treatment', false, 1, true),
('Dead Sea Salt Body Scrub + Deep Moisturizing', 'Exfoliating scrub with moisturizing treatment', 30, 65.00, 'body_treatment', true, 1, true),
('Mud Mask Body Wrap + Deep Moisturizing Body Treatment', 'Detoxifying mud wrap with hydration', 30, 65.00, 'body_treatment', true, 1, true),

-- Hair Removal Services
('Eyebrow Waxing', 'Precise eyebrow shaping with wax', 15, 20.00, 'hair_removal', false, 1, true),
('Lip Waxing', 'Upper lip hair removal', 5, 10.00, 'hair_removal', false, 1, true),
('Half Arm Waxing', 'Hair removal for lower arms', 15, 40.00, 'hair_removal', false, 1, true),
('Full Arm Waxing', 'Complete arm hair removal', 30, 60.00, 'hair_removal', false, 1, true),
('Chin Waxing', 'Chin area hair removal', 5, 12.00, 'hair_removal', false, 1, true),
('Neck Waxing', 'Neck area hair removal', 15, 30.00, 'hair_removal', false, 1, true),
('Lower Leg Waxing', 'Hair removal below the knee', 30, 40.00, 'hair_removal', false, 1, true),
('Full Leg Waxing', 'Complete leg hair removal', 60, 80.00, 'hair_removal', false, 1, true),
('Full Face Waxing', 'Complete facial hair removal', 30, 60.00, 'hair_removal', false, 1, true),
('Bikini Waxing', 'Bikini line hair removal', 30, 35.00, 'hair_removal', false, 1, true),
('Underarm Waxing', 'Underarm hair removal', 15, 20.00, 'hair_removal', false, 1, true),
('Brazilian Wax ( Women )', 'Complete intimate waxing for women', 45, 60.00, 'hair_removal', true, 1, true),
('Brazilian Waxing ( Men)', 'Complete intimate waxing for men', 45, 75.00, 'hair_removal', true, 1, true),
('Chest Wax', 'Chest hair removal', 30, 40.00, 'hair_removal', false, 1, true),
('Stomach Wax', 'Stomach area hair removal', 30, 40.00, 'hair_removal', false, 1, true),
('Shoulders', 'Shoulder area hair removal', 30, 30.00, 'hair_removal', false, 1, true),
('Feet', 'Foot hair removal', 5, 30.00, 'hair_removal', false, 1, true),

-- Membership
('Dermal VIP Card $50 / Year', 'Annual VIP membership with exclusive benefits', 30, 50.00, 'wellness', false, 1, true);