-- Aspire88 Estates Corporation SaaS
-- Database Schema Migrations for Supabase (PostgreSQL)
-- Includes Tables, Constraints, and Pre-defined Admin User

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    address TEXT NOT NULL,
    birthday DATE NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Broker', 'Agent', 'Treasurer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_temporary_password BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash VARCHAR(255) NOT NULL,
    broker_id VARCHAR(50) REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enforce standard custom IDs via regular expressions
    CONSTRAINT chk_profile_id_format CHECK (
        (role = 'Admin' AND id ~ '^AD-[A-Z]{4}\d{4}$') OR
        (role = 'Broker' AND id ~ '^BR-[A-Z]{4}\d{4}$') OR
        (role = 'Agent' AND id ~ '^AG-[A-Z]{4}\d{4}$') OR
        (role = 'Treasurer' AND id ~ '^TR-[A-Z]{4}\d{4}$')
    )
);

-- Indexing for speed and lookup efficiency
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_broker_id ON public.profiles(broker_id);

-- 2. DEVELOPERS TABLE
CREATE TABLE IF NOT EXISTS public.developers (
    id VARCHAR(50) PRIMARY KEY CHECK (id ~ '^DEV-[A-Z]{4}\d{4}$'),
    name VARCHAR(150) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id VARCHAR(50) PRIMARY KEY CHECK (id ~ '^PRJ-[A-Z]{4}\d{4}$'),
    developer_id VARCHAR(50) NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (developer_id, name)
);

-- 4. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id VARCHAR(50) PRIMARY KEY CHECK (id ~ '^CL-[A-Z]{4}\d{4}$'),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    contact_number VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    created_by VARCHAR(50) NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- False if soft-deleted/removed
    conflict_status VARCHAR(30) NOT NULL DEFAULT 'None' CHECK (conflict_status IN ('None', 'Pending', 'Resolved_Duplicate', 'Resolved_FalsePositive', 'Resolved_ChangeOwnership', 'Surrendered')),
    original_client_id VARCHAR(50) REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_names ON public.clients(last_name, first_name);

-- 5. DUPLICATE CONFLICTS TABLE
CREATE TABLE IF NOT EXISTS public.duplicate_conflicts (
    id VARCHAR(50) PRIMARY KEY CHECK (id ~ '^DUP-[A-Z]{4}\d{4}$'),
    original_client_id VARCHAR(50) NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    original_agent_id VARCHAR(50) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenging_client_id VARCHAR(50) NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    challenging_agent_id VARCHAR(50) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved_Duplicate', 'Resolved_FalsePositive', 'Resolved_ChangeOwnership', 'Surrendered_Original', 'Surrendered_Challenger')),
    resolved_by VARCHAR(50) REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.appointments (
    id VARCHAR(50) PRIMARY KEY CHECK (id ~ '^APT-[A-Z]{4}\d{4}$'),
    client_id VARCHAR(50) NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    agent_id VARCHAR(50) NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL CHECK (type IN ('Site Visit', 'Reservation', 'Payment', 'Meeting', 'Submit Requirement')),
    project_id VARCHAR(50) REFERENCES public.projects(id) ON DELETE SET NULL, -- Null if not site visit
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Done', 'Cancelled')),
    datetime TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON public.appointments(agent_id);

-- 7. UPDATE TIME TRIGGER FOR ALL TABLES
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_developers_modtime BEFORE UPDATE ON public.developers FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


-- 8. PRE-DEFINED ADMIN USER INSERT
-- Password hash generated using bcrypt (strength 10) for 'Admin@Aspire88'
-- Since Admin needs to be forced to change password first, is_temporary_password is set to TRUE.
INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    middle_name, 
    address, 
    birthday, 
    contact_number, 
    email, 
    role, 
    is_active, 
    is_temporary_password, 
    password_hash, 
    broker_id, 
    created_at
) VALUES (
    'AD-AAAA1000', 
    'System', 
    'Administrator', 
    'Main', 
    'Aspire88 Estates Headquarters, Metro Manila, Philippines', 
    '1990-01-01', 
    '+639171234567', 
    'nari.casama.developer@gmail.com', -- User's email from request metadata for seamless testing
    'Admin', 
    TRUE, 
    TRUE, 
    '$2b$10$C82D7kLqS73v7gE2fIuEpeF1SjD/rS.H0v26iN3Q/Z.V8/e9pG/Y6', -- Salted bcrypt hash for "Admin@Aspire88"
    NULL, 
    NOW()
) ON CONFLICT (email) DO NOTHING;
