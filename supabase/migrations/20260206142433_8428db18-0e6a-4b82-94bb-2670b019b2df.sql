
-- Table to store user backups with unique PIN codes
CREATE TABLE public.user_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_code TEXT NOT NULL UNIQUE,
  habits JSONB NOT NULL DEFAULT '[]'::jsonb,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert a backup (no auth required)
CREATE POLICY "Anyone can create a backup"
  ON public.user_backups
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read a backup by PIN (no auth required)
CREATE POLICY "Anyone can read backups"
  ON public.user_backups
  FOR SELECT
  USING (true);

-- Allow anyone to update their backup (matched by PIN in app logic)
CREATE POLICY "Anyone can update a backup"
  ON public.user_backups
  FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_backup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_backups_updated_at
  BEFORE UPDATE ON public.user_backups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_backup_updated_at();
