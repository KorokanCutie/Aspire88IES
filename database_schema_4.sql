-- =============================================================================
-- Aspire88 Estates Corporation - PostgreSQL Database Migration Schema v4
-- Location: /database_schema_4.sql
-- Description: Add duplicateStatus and notified1Hr columns.
-- =============================================================================

-- Add duplicateStatus column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "duplicateStatus" BOOLEAN DEFAULT FALSE;

-- Add notified1Hr column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "notified1Hr" BOOLEAN DEFAULT FALSE;
