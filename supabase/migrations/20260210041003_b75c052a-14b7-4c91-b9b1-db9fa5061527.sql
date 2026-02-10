-- 1. Fix profiles: restrict SELECT to own profile only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a function to check username availability (replaces public SELECT)
CREATE OR REPLACE FUNCTION public.check_username_available(target_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = lower(trim(target_username))
  );
$$;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Harden handle_new_user trigger with username validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NOT ((NEW.raw_user_meta_data ->> 'username') ~ '^[a-z0-9_]{3,30}$') THEN
    RAISE EXCEPTION 'Invalid username format';
  END IF;
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  RETURN NEW;
END;
$function$;

-- 3. Add username format constraint to profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_format;
ALTER TABLE public.profiles ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,30}$');