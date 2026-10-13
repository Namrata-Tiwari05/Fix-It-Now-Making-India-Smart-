-- ============================================================================
-- FixItNow: AI-Enabled Civic Grievance Platform
-- Single Consolidated Complete Supabase PostgreSQL Schema & Seed Migration
-- Target: Supabase PostgreSQL (Run in Supabase Dashboard -> SQL Editor -> Run)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'municipal_admin', 'field_officer', 'master_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status AS ENUM (
        'SUBMITTED', 
        'UNDER_REVIEW', 
        'ASSIGNED', 
        'IN_PROGRESS', 
        'ON_HOLD', 
        'RESOLUTION_SUBMITTED', 
        'VERIFICATION', 
        'RESOLVED', 
        'CLOSED', 
        'REOPENED', 
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE complaint_priority AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE officer_status AS ENUM ('active', 'on_duty', 'busy', 'offline');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE duplicate_decision AS ENUM ('pending', 'linked', 'kept_separate');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Municipalities Table (Government Corporate Entities)
CREATE TABLE IF NOT EXISTS municipalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    settings JSONB DEFAULT '{"sla_critical_hours": 24, "sla_high_hours": 48, "sla_medium_days": 7, "sla_low_days": 14}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles Table (Extends Supabase Auth or Standalone App Profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    role user_role NOT NULL DEFAULT 'citizen',
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(10),
    is_profile_completed BOOLEAN DEFAULT FALSE,
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wards Table (Administrative Zones within a Municipality)
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    zone VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(municipality_id, code)
);

-- 6. Departments Table (Departmental Divisions: Roads, Sanitation, etc.)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    category_mappings JSONB DEFAULT '[]'::jsonb,
    sla_hours_default INT DEFAULT 48,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Authoritative Problem Location PIN Code Coverage
CREATE TABLE IF NOT EXISTS municipality_pincodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    pincode VARCHAR(10) NOT NULL,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    locality_name VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pincode, municipality_id)
);

-- 8. Field Officers Table (On-Ground Municipal Workforce)
CREATE TABLE IF NOT EXISTS officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(50),
    status officer_status DEFAULT 'active',
    active_workload INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Complaints Table (Civic Grievances)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    citizen_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    citizen_name VARCHAR(255),
    citizen_phone VARCHAR(50),
    municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
    municipality_name VARCHAR(255),
    pincode VARCHAR(10) NOT NULL, -- The Authoritative Problem Location PIN Code
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    ward_name VARCHAR(255),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    department_name VARCHAR(255),
    assigned_officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    assigned_officer_name VARCHAR(255),
    address TEXT,
    landmark VARCHAR(255),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    category VARCHAR(100) NOT NULL,
    category_confirmed_by_admin BOOLEAN DEFAULT FALSE,
    priority complaint_priority DEFAULT 'MEDIUM',
    priority_reason TEXT,
    status complaint_status DEFAULT 'SUBMITTED',
    description TEXT NOT NULL,
    is_routing_review BOOLEAN DEFAULT FALSE,
    ai_status VARCHAR(50) DEFAULT 'COMPLETED',
    due_at TIMESTAMPTZ,
    sla_breached BOOLEAN DEFAULT FALSE,
    reopen_count INT DEFAULT 0,
    duplicate_of UUID REFERENCES complaints(id) ON DELETE SET NULL,
    resolution_verified_by_admin BOOLEAN DEFAULT FALSE,
    citizen_rating INT CHECK (citizen_rating BETWEEN 1 AND 5),
    citizen_feedback TEXT,
    citizen_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Complaint Media Table
CREATE TABLE IF NOT EXISTS complaint_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'image' CHECK (type IN ('image', 'video', 'audio')),
    storage_path TEXT NOT NULL,
    caption TEXT,
    is_resolution_proof BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AI Analyses Table (pgvector embedding & triage metadata)
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    category VARCHAR(100),
    confidence DOUBLE PRECISION,
    duplicate_score DOUBLE PRECISION,
    priority complaint_priority,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    reasoning TEXT,
    embedding vector(384),
    model_version VARCHAR(50) DEFAULT 'v1.0-civic-triage',
    admin_reviewed BOOLEAN DEFAULT FALSE,
    admin_override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Complaint Duplicates Table
CREATE TABLE IF NOT EXISTS complaint_duplicates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL,
    decision duplicate_decision DEFAULT 'pending',
    decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    decision_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'ASSIGNED'
);

-- 14. Resolutions Table
CREATE TABLE IF NOT EXISTS resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    officer_id UUID REFERENCES officers(id) ON DELETE SET NULL,
    notes TEXT NOT NULL,
    evidence JSONB DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    citizen_confirmed BOOLEAN,
    citizen_rating INT CHECK (citizen_rating BETWEEN 1 AND 5),
    citizen_feedback TEXT,
    reopen_reason TEXT
);

-- 15. Audit Logs Table (Immutable Compliance History)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role user_role NOT NULL,
    actor_name VARCHAR(255),
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Citizen Phone OTP Store (For secure SMS/OTP lifecycle)
CREATE TABLE IF NOT EXISTS citizen_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(50) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 18. Strategic Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_municipality_pincodes_pin ON municipality_pincodes(pincode);
CREATE INDEX IF NOT EXISTS idx_complaints_municipality_status ON complaints(municipality_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_pincode ON complaints(pincode);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_citizen_otps_phone ON citizen_otps(phone, expires_at);

-- ============================================================================
-- 19. Triggers: Automatic Updated_At
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_municipalities_updated_at ON municipalities;
CREATE TRIGGER trg_municipalities_updated_at
    BEFORE UPDATE ON municipalities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_complaints_updated_at ON complaints;
CREATE TRIGGER trg_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 20. Row Level Security (RLS) Helper Functions & Policies
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipality_pincodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_otps ENABLE ROW LEVEL SECURITY;

-- Helper to get auth user role
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper to get auth user municipality_id
CREATE OR REPLACE FUNCTION get_auth_municipality_id()
RETURNS UUID AS $$
    SELECT municipality_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id OR get_auth_role() = 'master_admin');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id OR get_auth_role() = 'master_admin');

-- Municipalities Policies (Public read for active, Master Admin write)
DROP POLICY IF EXISTS "Anyone can view active municipalities" ON municipalities;
CREATE POLICY "Anyone can view active municipalities" ON municipalities
    FOR SELECT USING (status = 'active' OR get_auth_role() = 'master_admin');

DROP POLICY IF EXISTS "Master admin manage municipalities" ON municipalities;
CREATE POLICY "Master admin manage municipalities" ON municipalities
    FOR ALL USING (get_auth_role() = 'master_admin');

-- PIN Coverage Policies (Public read for PIN lookup)
DROP POLICY IF EXISTS "Public can view active PIN coverage" ON municipality_pincodes;
CREATE POLICY "Public can view active PIN coverage" ON municipality_pincodes
    FOR SELECT USING (active = true OR get_auth_role() = 'master_admin');

-- Complaints Policies (Strict Municipality Isolation + Citizen Ownership)
DROP POLICY IF EXISTS "Citizens can view own complaints" ON complaints;
CREATE POLICY "Citizens can view own complaints" ON complaints
    FOR SELECT USING (
        citizen_id = auth.uid()
        OR get_auth_role() = 'master_admin'
        OR (get_auth_role() = 'municipal_admin' AND municipality_id = get_auth_municipality_id())
        OR (get_auth_role() = 'field_officer' AND municipality_id = get_auth_municipality_id())
    );

DROP POLICY IF EXISTS "Citizens can create complaints" ON complaints;
CREATE POLICY "Citizens can create complaints" ON complaints
    FOR INSERT WITH CHECK (
        citizen_id = auth.uid() OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS "Municipal Admin and Officer update complaints" ON complaints;
CREATE POLICY "Municipal Admin and Officer update complaints" ON complaints
    FOR UPDATE USING (
        get_auth_role() = 'master_admin'
        OR (get_auth_role() = 'municipal_admin' AND municipality_id = get_auth_municipality_id())
        OR (get_auth_role() = 'field_officer' AND municipality_id = get_auth_municipality_id())
    );

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid() OR get_auth_role() = 'master_admin');

-- ============================================================================
-- 21. Master Admin Setup
-- ============================================================================

-- 21.1 Master Admin Profile
INSERT INTO profiles (id, email, role, name, phone, aadhaar_masked, municipality_id, avatar_url)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'masteradmin@fixitnow.gov', 'master_admin', 'National Command Admin', '+91-9811000001', 'XXXX-XXXX-9999', NULL, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- End of FixItNow Consolidated Schema
-- ============================================================================
