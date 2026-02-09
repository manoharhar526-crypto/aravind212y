
-- Add user_id column to user_backups
ALTER TABLE public.user_backups ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique constraint so each user has one backup
ALTER TABLE public.user_backups ADD CONSTRAINT unique_user_backup UNIQUE (user_id);

-- Create unique constraint on pin_hash so PINs are unique across all users
ALTER TABLE public.user_backups ADD CONSTRAINT unique_pin_hash UNIQUE (pin_hash);

-- Drop old restrictive RLS policies
DROP POLICY IF EXISTS "Deny direct delete" ON public.user_backups;
DROP POLICY IF EXISTS "Deny direct insert" ON public.user_backups;
DROP POLICY IF EXISTS "Deny direct select" ON public.user_backups;
DROP POLICY IF EXISTS "Deny direct update" ON public.user_backups;

-- New policies: users can manage their own backup
CREATE POLICY "Users can view own backup"
ON public.user_backups FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backup"
ON public.user_backups FOR DELETE
USING (auth.uid() = user_id);
