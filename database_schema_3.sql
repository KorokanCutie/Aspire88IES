-- =============================================================================
-- Aspire88 Estates Corporation - PostgreSQL Database Migration Schema v3
-- Location: /database_schema_3.sql
-- Description: Incremental database update to persist changed custom passwords.
-- =============================================================================

-- Add password column to profiles table to support post-onboarding logging
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
