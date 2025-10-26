-- Migration: Fix Security and Performance Issues
-- Version: 3.3
-- Date: 2025-10-26
-- Description: Fix function security and optimize RLS policies based on Supabase advisors

-- ============================================================================
-- PART 1: FIX SECURITY - Function Search Path Mutable
-- ============================================================================
-- Issue: Functions without set search_path are vulnerable to search_path hijacking
-- Fix: Add SECURITY DEFINER and SET search_path = '' to all functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix: update_batch_job_progress function
CREATE OR REPLACE FUNCTION update_batch_job_progress()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  -- Update completed_documents count when a run completes
  UPDATE public.batch_jobs
  SET
    completed_documents = (
      SELECT COUNT(DISTINCT document_id)
      FROM public.runs
      WHERE batch_job_id = NEW.batch_job_id
    ),
    updated_at = now()
  WHERE id = NEW.batch_job_id;

  RETURN NEW;
END;
$$;

-- Fix: update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_batch_job_progress IS 'Trigger function to update batch job progress (SECURITY DEFINER with immutable search_path)';
COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to update updated_at timestamp (SECURITY DEFINER with immutable search_path)';

-- ============================================================================
-- PART 2: FIX PERFORMANCE - Optimize RLS Policies
-- ============================================================================
-- Issue: auth.uid() is re-evaluated for each row, causing poor performance at scale
-- Fix: Wrap auth.uid() in (SELECT auth.uid()) to cache the value
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ----------------------------------------------------------------------------
-- 2.1 Fix RLS Policies on DOCUMENTS table (4 policies)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- 2.2 Fix RLS Policies on RUNS table (2 policies)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view runs for their documents" ON public.runs;
CREATE POLICY "Users can view runs for their documents"
  ON public.runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = runs.document_id
      AND documents.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert runs for their documents" ON public.runs;
CREATE POLICY "Users can insert runs for their documents"
  ON public.runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = runs.document_id
      AND documents.user_id = (SELECT auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 2.3 Fix RLS Policies on OUTPUTS table (2 policies)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view outputs for their runs" ON public.outputs;
CREATE POLICY "Users can view outputs for their runs"
  ON public.outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.runs
      JOIN public.documents ON documents.id = runs.document_id
      WHERE runs.id = outputs.run_id
      AND documents.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert outputs for their runs" ON public.outputs;
CREATE POLICY "Users can insert outputs for their runs"
  ON public.outputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs
      JOIN public.documents ON documents.id = runs.document_id
      WHERE runs.id = outputs.run_id
      AND documents.user_id = (SELECT auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 2.4 Fix RLS Policies on BATCH_JOBS table (3 policies)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own batch jobs" ON public.batch_jobs;
CREATE POLICY "Users can view their own batch jobs"
  ON public.batch_jobs FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own batch jobs" ON public.batch_jobs;
CREATE POLICY "Users can create their own batch jobs"
  ON public.batch_jobs FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own batch jobs" ON public.batch_jobs;
CREATE POLICY "Users can update their own batch jobs"
  ON public.batch_jobs FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- ----------------------------------------------------------------------------
-- 2.5 Fix RLS Policies on BATCH_ANALYTICS table (1 policy)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view analytics for their batch jobs" ON public.batch_analytics;
CREATE POLICY "Users can view analytics for their batch jobs"
  ON public.batch_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.batch_jobs
      WHERE batch_jobs.id = batch_analytics.batch_job_id
      AND batch_jobs.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PART 3: REVIEW UNUSED INDEXES
-- ============================================================================
-- Note: Keeping unused indexes for now as they may be useful as the app scales
-- These indexes were created for specific query patterns that may not be used yet:
--
-- - idx_outputs_validation_levels: For filtering by validation status (json_valid, attributes_valid, formats_valid)
-- - idx_outputs_model: For filtering outputs by specific model
-- - idx_batch_jobs_status: For filtering batch jobs by status
-- - idx_outputs_valid_json: For filtering by json_valid flag
-- - idx_outputs_validation_passed: For filtering by validation_passed flag
-- - idx_batch_analytics_model: For filtering analytics by model
--
-- If these indexes remain unused after 3-6 months of production use, consider removing them.
-- For now, keeping them as they're not causing performance issues and may be needed soon.

-- Add comments to document the purpose of potentially unused indexes
COMMENT ON INDEX idx_outputs_validation_levels IS 'Composite index for 3-level validation filtering (may be used in future analytics queries)';
COMMENT ON INDEX idx_outputs_model IS 'Index for filtering outputs by model (may be used in model comparison features)';
COMMENT ON INDEX idx_batch_jobs_status IS 'Index for filtering batch jobs by status (may be used in dashboard views)';
COMMENT ON INDEX idx_outputs_valid_json IS 'Index for filtering by JSON validity (may be used in debugging/analytics)';
COMMENT ON INDEX idx_outputs_validation_passed IS 'Index for filtering by validation status (may be used in quality reports)';
COMMENT ON INDEX idx_batch_analytics_model IS 'Index for filtering analytics by model (may be used in model comparison)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- 1. Fixed 2 functions with mutable search_path (SECURITY DEFINER + SET search_path = '')
-- 2. Optimized 12 RLS policies across 5 tables (wrapped auth.uid() in SELECT)
-- 3. Documented 6 unused indexes (kept for future use)
--
-- Expected results:
-- - Improved security against search_path hijacking
-- - Better query performance at scale (auth.uid() cached per query)
-- - Clearer documentation for index usage
