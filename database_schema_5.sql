-- =============================================================================
-- Aspire88 Estates Corporation - PostgreSQL Database Migration Schema v5
-- Location: /database_schema_5.sql
-- Description: Drop old duplicate triggers, add duplicateStatus and notified1Hr columns.
-- =============================================================================

-- Remove current trigger-based duplicate checking in the database
DROP TRIGGER IF EXISTS trg_detect_client_duplicate ON clients CASCADE;
DROP FUNCTION IF EXISTS detect_client_duplicate_trigger_func() CASCADE;

-- Add duplicateStatus column to clients table if not exists
ALTER TABLE clients ADD COLUMN IF NOT EXISTS "duplicateStatus" BOOLEAN DEFAULT FALSE;

-- Add notified1Hr column to appointments table if not exists
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "notified1Hr" BOOLEAN DEFAULT FALSE;

-- Drop old check constraint on resolution_decision to support new values
ALTER TABLE duplicate_conflicts DROP CONSTRAINT IF EXISTS duplicate_conflicts_resolution_decision_check;
ALTER TABLE duplicate_conflicts ADD CONSTRAINT duplicate_conflicts_resolution_decision_check 
  CHECK (resolution_decision IN ('Pending', 'Marked False Positive', 'Surrendered Claim', 'Marked Duplicate', 'Awarded To Challenger'));

