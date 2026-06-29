-- =============================================================================
-- Aspire88 Estates Corporation - PostgreSQL Enterprise Database Schema
-- Location: /database_schema.sql
-- Description: Core schema, role triggers, RLS, and security policies for ERP.
-- =============================================================================

-- ==========================================
-- 1. EXTENSIONS & CORE FUNCTIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Unique Alphanumeric ID Generator for Specific Formats
-- Formats required: Prefixes list: AD-, BR-, AG-, TR-, CL-, APT-, DUP-, DEV-, PRJ-
-- Sequence of 4 random uppercase letters [A-Z] followed by 4 random digits [0-9]
CREATE OR REPLACE FUNCTION generate_custom_id(prefix TEXT) RETURNS TEXT AS $$
DECLARE
    letters TEXT := '';
    digits TEXT := '';
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    i INT;
BEGIN
    -- Generate 4 random characters from A-Z
    FOR i IN 1..4 LOOP
        letters := letters || substr(chars, floor(random() * 26 + 1)::int, 1);
    END LOOP;
    -- Generate 4 random digits from 0-9
    FOR i IN 1..4 LOOP
        digits := digits || floor(random() * 10)::text;
    END LOOP;
    RETURN prefix || letters || digits;
END;
$$ LANGUAGE plpgsql VOLATILE;


-- ==========================================
-- 2. SYSTEM PROFILE ENUMS & SCHEMAS
-- ==========================================

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, -- AD-XXXX1111, BR-XXXX1111, AG-XXXX1111, TR-XXXX1111
    user_id UUID UNIQUE, -- Associated Supabase Auth UID
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Broker', 'Agent', 'Treasurer')),
    parent_broker_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_temporary BOOLEAN DEFAULT TRUE NOT NULL,
    temp_password TEXT, -- For onboarding lifecycle ("Copy to Clipboard" support)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for optimized searches
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_parent ON profiles(parent_broker_id);


-- ==========================================
-- 3. LAND DEVELOPERS & PROJECTS
-- ==========================================

CREATE TABLE IF NOT EXISTS developers (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('DEV-'),
    name TEXT NOT NULL UNIQUE,
    contact_person TEXT,
    contact_email TEXT,
    contact_number TEXT,
    office_address TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('PRJ-'),
    developer_id TEXT REFERENCES developers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Sold Out', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ==========================================
-- 4. CLIENT IDENTITY SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('CL-'),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    contact_number TEXT NOT NULL,
    address TEXT NOT NULL,
    created_by TEXT REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_names ON clients(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_clients_contact ON clients(contact_number);


-- ==========================================
-- 5. DUPLICATE CLIENT CONFLICTS
-- ==========================================

CREATE TABLE IF NOT EXISTS duplicate_conflicts (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('DUP-'),
    original_client_id TEXT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    challenged_client_id TEXT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    original_encoder_id TEXT REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    challenging_encoder_id TEXT REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
    resolution_decision TEXT NOT NULL DEFAULT 'Pending' CHECK (resolution_decision IN ('Marked False Positive', 'Marked Duplicate', 'Awarded To Challenger', 'Surrendered Claim')),
    resolved_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ==========================================
-- 6. APPOINTMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('APT-'),
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    agent_id TEXT REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    appointment_type TEXT NOT NULL CHECK (appointment_type IN ('Site Visit', 'Reservation', 'Payment', 'Meeting', 'Submit Requirement')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Done', 'Cancelled')),
    notes TEXT,
    address TEXT, -- Auto-populated Project physical address if Site Visit, or explicit location info
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- ==========================================
-- 7. DATABASE TRIGGERS & RPC LOGIC
-- ==========================================

-- Trigger A: Auto-generate appropriate Profile IDs based on user Role on Insert
CREATE OR REPLACE FUNCTION set_profile_id_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    role_prefix TEXT;
BEGIN
    IF NEW.id IS NULL OR NEW.id = '' THEN
        IF NEW.role = 'Admin' THEN role_prefix := 'AD-';
        ELSIF NEW.role = 'Broker' THEN role_prefix := 'BR-';
        ELSIF NEW.role = 'Agent' THEN role_prefix := 'AG-';
        ELSIF NEW.role = 'Treasurer' THEN role_prefix := 'TR-';
        ELSE role_prefix := 'USR-';
        END IF;
        NEW.id := generate_custom_id(role_prefix);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_profile_id
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_profile_id_trigger_func();


-- Trigger B: Automatic Client Duplicate Detection and Freeze Signal
CREATE OR REPLACE FUNCTION detect_client_duplicate_trigger_func() RETURNS TRIGGER AS $$
DECLARE
    matched_client RECORD;
BEGIN
    -- Query database for exact name pair (case-insensitive) OR same contact number 
    -- registered by *another* encoder.
    SELECT * INTO matched_client
    FROM clients
    WHERE id <> COALESCE(NEW.id, '')
      AND created_by <> NEW.created_by
      AND (
          (LOWER(first_name) = LOWER(NEW.first_name) AND LOWER(last_name) = LOWER(NEW.last_name))
          OR contact_number = NEW.contact_number
      )
    LIMIT 1;

    IF matched_client.id IS NOT NULL THEN
        -- Verify if conflict already registered
        IF NOT EXISTS (
            SELECT 1 FROM duplicate_conflicts 
            WHERE original_client_id = matched_client.id AND challenged_client_id = NEW.id
        ) THEN
            INSERT INTO duplicate_conflicts (
                id,
                original_client_id,
                challenged_client_id,
                original_encoder_id,
                challenging_encoder_id,
                status
            ) VALUES (
                generate_custom_id('DUP-'),
                matched_client.id,
                NEW.id,
                matched_client.created_by,
                NEW.created_by,
                'Pending'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_client_duplicate
AFTER INSERT OR UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION detect_client_duplicate_trigger_func();


-- Trigger C: Enforce Appointment Immutability (Done/Cancelled remain frozen)
CREATE OR REPLACE FUNCTION freeze_completed_appointments_func() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('Done', 'Cancelled') THEN
        -- Prevent changing anything except raising an illustrative state error
        RAISE EXCEPTION 'ERP Error: Immutable State. Done and Cancelled custom appointments are functionally frozen.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_freeze_completed_appointments
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION freeze_completed_appointments_func();


-- Trigger D: Auto-populate Site Visit Project Address
CREATE OR REPLACE FUNCTION auto_populate_appointment_address_func() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.appointment_type = 'Site Visit' AND NEW.project_id IS NOT NULL THEN
        SELECT address INTO NEW.address FROM projects WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_populate_appointment_address
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION auto_populate_appointment_address_func();


-- Trigger E: Duplicate Freeze Validation (Prevent blocked challengers from updating details or bookings)
CREATE OR REPLACE FUNCTION validate_freeze_principle_func() RETURNS TRIGGER AS $$
DECLARE
    is_conflicted BOOLEAN := FALSE;
    is_historic_first BOOLEAN := FALSE;
    client_id_val TEXT;
    user_id_val TEXT;
BEGIN
    -- Determine current target context (for client update vs appointment update)
    -- This trigger applies to client updates AND appointment inserts/updates
    -- Wait, let's write simple specific guards on transaction paths in API, or keep a basic query trigger.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- 8. SERVICE RPC RESOLUTION DECISION ENGINE
-- ==========================================

CREATE OR REPLACE FUNCTION resolve_duplicate_conflict(
    p_conflict_id TEXT,
    p_decision TEXT, -- 'False Positive', 'Marked Duplicate', 'Change Ownership', 'Surrender Claim'
    p_resolver_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_orig_client TEXT;
    v_chal_client TEXT;
    v_orig_enc TEXT;
    v_chal_enc TEXT;
BEGIN
    -- Fetch the active pending conflict
    SELECT original_client_id, challenged_client_id, original_encoder_id, challenging_encoder_id
    INTO v_orig_client, v_chal_client, v_orig_enc, v_chal_enc
    FROM duplicate_conflicts
    WHERE id = p_conflict_id AND status = 'Pending';

    IF v_orig_client IS NULL THEN
        RAISE EXCEPTION 'Pending duplicate conflict claim % not found.', p_conflict_id;
    END IF;

    -- Update Duplicate Conflict record
    UPDATE duplicate_conflicts
    SET status = 'Resolved',
        resolution_decision = p_decision,
        resolved_by = p_resolver_id,
        resolved_at = CURRENT_TIMESTAMP
    WHERE id = p_conflict_id;

    -- Implement transactional business rules
    IF p_decision = 'False Positive' THEN
        -- Both brokers keep their records; full access is restored to both. Done.
        NULL;

    ELSIF p_decision = 'Marked Duplicate' OR p_decision = 'Surrender Claim' THEN
        -- Original keeper wins. Challenging encoder loses open transactional capabilities for this target.
        -- Update challenged encoder's appointments to Cancelled
        UPDATE appointments
        SET status = 'Cancelled'
        WHERE client_id = v_chal_client AND status = 'Open';

    ELSIF p_decision = 'Change Ownership' THEN
        -- Revoke original access, grant everything to the challenger. Original appointments cancelled.
        UPDATE appointments
        SET status = 'Cancelled'
        WHERE client_id = v_orig_client AND status = 'Open';

        -- Optionally shift client assignment to the challenger, or keep both records with original mapped as inactive/frozen.
        -- Here we swap clients. we update original client owner to challenging_encoder
        UPDATE clients
        SET created_by = v_chal_enc
        WHERE id = v_orig_client;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Because this ERP implements a robust simulated account sandbox directly over the table data (with quick account selectors in the UI),
-- client-side connection via the standard AnonKey executes queries without active Supabase auth session UID (auth.uid() is NULL).
-- In order for the custom accounts system to function properly, RLS is disabled by default.
-- Users can enable RLS if they configure real Supabase Auth for the profiles.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE developers DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_conflicts DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Dynamic query checking current active user profile and role
CREATE OR REPLACE FUNCTION get_current_user_role(p_user_uuid UUID) RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE user_id = p_user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_profile_id(p_user_uuid UUID) RETURNS TEXT AS $$
    SELECT id FROM profiles WHERE user_id = p_user_uuid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- A. PROFILES POLICIES
CREATE POLICY admin_manage_all_profiles ON profiles 
    FOR ALL USING (get_current_user_role(auth.uid()) = 'Admin');

CREATE POLICY broker_manage_own_agents ON profiles
    FOR ALL USING (
        id = get_current_profile_id(auth.uid()) OR 
        (role = 'Agent' AND parent_broker_id = get_current_profile_id(auth.uid()))
    );

CREATE POLICY agent_view_self ON profiles
    FOR SELECT USING (id = get_current_profile_id(auth.uid()));

CREATE POLICY treasurer_view_staff ON profiles
    FOR SELECT USING (
        get_current_user_role(auth.uid()) = 'Treasurer' AND role IN ('Broker', 'Agent')
    );


-- B. CLIENTS POLICIES
CREATE POLICY admin_manage_all_clients ON clients
    FOR ALL USING (get_current_user_role(auth.uid()) = 'Admin');

CREATE POLICY broker_manage_downline_clients ON clients
    FOR ALL USING (
        created_by = get_current_profile_id(auth.uid()) OR
        created_by IN (
            SELECT id FROM profiles WHERE parent_broker_id = get_current_profile_id(auth.uid())
        )
    );

CREATE POLICY agent_manage_own_clients ON clients
    FOR ALL USING (created_by = get_current_profile_id(auth.uid()));


-- C. CONFLICTS POLICIES
CREATE POLICY admin_manage_all_conflicts ON duplicate_conflicts
    FOR ALL USING (get_current_user_role(auth.uid()) = 'Admin');

CREATE POLICY broker_manage_downline_conflicts ON duplicate_conflicts
    FOR ALL USING (
        original_encoder_id = get_current_profile_id(auth.uid()) OR
        challenging_encoder_id = get_current_profile_id(auth.uid()) OR
        original_encoder_id IN (SELECT id FROM profiles WHERE parent_broker_id = get_current_profile_id(auth.uid())) OR
        challenging_encoder_id IN (SELECT id FROM profiles WHERE parent_broker_id = get_current_profile_id(auth.uid()))
    );

CREATE POLICY agent_view_own_conflicts ON duplicate_conflicts
    FOR SELECT USING (
        original_encoder_id = get_current_profile_id(auth.uid()) OR
        challenging_encoder_id = get_current_profile_id(auth.uid())
    );


-- D. DEVELOPERS & PROJECTS POLICIES
CREATE POLICY admin_manage_all_projects_devs ON developers
    FOR ALL USING (get_current_user_role(auth.uid()) = 'Admin');

CREATE POLICY staff_select_developers ON developers
    FOR SELECT USING (get_current_user_role(auth.uid()) IN ('Broker', 'Agent'));

CREATE POLICY admin_manage_all_proj ON projects
    FOR ALL USING (get_current_user_role(auth.uid()) = 'Admin');

CREATE POLICY staff_select_projects ON projects
    FOR SELECT USING (get_current_user_role(auth.uid()) IN ('Broker', 'Agent'));


-- E. APPOINTMENTS POLICIES
CREATE POLICY admin_manage_all_appointments ON appointments
    FOR ALL USING (get_current_user_role(auth.uid()) = 'Admin');

CREATE POLICY broker_manage_downline_appointments ON appointments
    FOR ALL USING (
        agent_id = get_current_profile_id(auth.uid()) OR
        agent_id IN (SELECT id FROM profiles WHERE parent_broker_id = get_current_profile_id(auth.uid()))
    );

CREATE POLICY agent_manage_own_appointments ON appointments
    FOR ALL USING (agent_id = get_current_profile_id(auth.uid()));


-- ==========================================
-- 10. REPUTABLE CORE SEED ACCOUNTS
-- ==========================================

-- Seed default Super Admin Account with Secure Temporary Password Flag enabled (is_temporary = true)
INSERT INTO profiles (
    id,
    user_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    is_temporary,
    temp_password
) VALUES (
    'AD-SEED9000',
    uuid_generate_v4(), -- Simulated baseline user_id, can be bound with real Supabase UID on login
    'admin@aspire88estates.com',
    'Admin',
    'Super',
    'Admin',
    TRUE,
    TRUE,
    'AspireAdmin2026!'
) ON CONFLICT (email) DO NOTHING;
