CREATE TABLE public.admin_secret (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_hash text NOT NULL,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_secret TO service_role;

ALTER TABLE public.admin_secret ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to admin secret"
ON public.admin_secret
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE TRIGGER update_admin_secret_updated_at
BEFORE UPDATE ON public.admin_secret
FOR EACH ROW EXECUTE FUNCTION public.update_backup_updated_at();

INSERT INTO public.admin_secret (code_hash)
VALUES ('a3ca38ef0e8554b39ce6fd34b011f9aa197cda1f17e2b08b1816142c4bc67199');