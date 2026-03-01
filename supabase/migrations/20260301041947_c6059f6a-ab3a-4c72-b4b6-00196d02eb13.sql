
-- Update check_username_available to use case-sensitive matching for new username rules
CREATE OR REPLACE FUNCTION public.check_username_available(target_username text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = trim(target_username)
  );
$function$;
