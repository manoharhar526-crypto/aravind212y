
-- 1. Add SELECT policy on user_backups (only own backups)
CREATE POLICY "Users can view own backup"
ON public.user_backups
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix DELETE policy: drop the old public-role one and recreate for authenticated only
DROP POLICY IF EXISTS "Users can delete own backup" ON public.user_backups;
CREATE POLICY "Users can delete own backup"
ON public.user_backups
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Remove plaintext pin_code column (all data uses pin_hash now)
ALTER TABLE public.user_backups ALTER COLUMN pin_code DROP NOT NULL;
ALTER TABLE public.user_backups ALTER COLUMN pin_code SET DEFAULT NULL;
ALTER TABLE public.user_backups ALTER COLUMN pin_hash SET NOT NULL;

-- 4. Add restrictive write policies on user_roles (admin only)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Remove user_backups from Realtime (access is via edge function)
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_backups;
