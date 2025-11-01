-- Add DELETE policy for batch_jobs table
-- This was missing and preventing users from deleting their own batches

DROP POLICY IF EXISTS "Users can delete their own batch jobs" ON public.batch_jobs;

CREATE POLICY "Users can delete their own batch jobs"
  ON public.batch_jobs FOR DELETE
  USING (user_id = (SELECT auth.uid()));
