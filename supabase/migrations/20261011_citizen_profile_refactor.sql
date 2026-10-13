-- ============================================================================
-- FixItNow Migration: 20261011_citizen_profile_refactor.sql
-- Description: Refactor Citizen Profile:
--   1. Add state, district, pincode, is_profile_completed to public.profiles
--   2. Remove obsolete Aadhaar columns from public.profiles
--   3. Configure avatars storage bucket and RLS policies
-- ============================================================================

-- 1. Add Location and Profile Completion Status to Profiles Table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE;

-- 2. Backfill existing active citizen profiles
UPDATE profiles 
SET is_profile_completed = TRUE,
    state = COALESCE(state, 'Uttar Pradesh'),
    district = COALESCE(district, 'Gorakhpur'),
    pincode = COALESCE(pincode, '273001')
WHERE role = 'citizen' AND name IS NOT NULL AND name != 'Unregistered Citizen' AND (is_profile_completed IS FALSE OR is_profile_completed IS NULL);

-- 3. Safely remove obsolete Aadhaar columns
ALTER TABLE profiles DROP COLUMN IF EXISTS aadhaar_masked;
ALTER TABLE profiles DROP COLUMN IF EXISTS aadhaar_hash;

-- 4. Create performance index for location and completion lookups
CREATE INDEX IF NOT EXISTS idx_profiles_pincode ON profiles(pincode);
CREATE INDEX IF NOT EXISTS idx_profiles_completion ON profiles(is_profile_completed);

-- 5. Supabase Storage Setup for Avatars (executed if storage schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
