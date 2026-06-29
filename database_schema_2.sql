-- =============================================================================
-- Aspire88 Estates Corporation - PostgreSQL Database Migration Schema v2
-- Location: /database_schema_2.sql
-- Description: Incremental database updates for Staff and Client additional properties.
-- =============================================================================

-- Add extra columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prc_license TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Add extra columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;
