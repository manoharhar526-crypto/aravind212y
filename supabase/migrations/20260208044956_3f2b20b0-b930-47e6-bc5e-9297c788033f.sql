
-- Add pin_hash column to store hashed PINs instead of plain text
ALTER TABLE public.user_backups ADD COLUMN pin_hash text;

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create a backup" ON public.user_backups;
DROP POLICY IF EXISTS "Anyone can read backups" ON public.user_backups;
DROP POLICY IF EXISTS "Anyone can update a backup" ON public.user_backups;

-- Create restrictive policies that deny all direct client access
-- Only the service role (used by edge functions) can access this table
CREATE POLICY "Deny direct select" ON public.user_backups FOR SELECT USING (false);
CREATE POLICY "Deny direct insert" ON public.user_backups FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny direct update" ON public.user_backups FOR UPDATE USING (false);
CREATE POLICY "Deny direct delete" ON public.user_backups FOR DELETE USING (false);
