-- Create GOD admin account
-- Uses pgcrypto (already enabled) to hash the password the same way Supabase auth does

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'god@admin.internal') THEN
    RETURN;
  END IF;

  -- Create auth user
  admin_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data,
    role, aud, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'god@admin.internal',
    crypt('iamgod', gen_salt('bf')),
    now(),
    '{"username": "GOD"}'::jsonb,
    'authenticated', 'authenticated',
    now(), now(),
    '', '', '', ''
  );

  -- Profile is auto-created by handle_new_user trigger.
  -- Assign admin role.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT DO NOTHING;

END $$;
