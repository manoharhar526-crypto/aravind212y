
-- Drop the unique constraint on pin_code since we now use pin_hash
ALTER TABLE public.user_backups DROP CONSTRAINT IF EXISTS user_backups_pin_code_key;

-- Migrate existing plain-text PINs to SHA-256 hashes
UPDATE public.user_backups 
SET pin_hash = encode(digest(pin_code, 'sha256'), 'hex')
WHERE pin_hash IS NULL AND pin_code IS NOT NULL AND pin_code != 'hashed';

-- Clear the plain-text PIN codes
UPDATE public.user_backups 
SET pin_code = 'hashed';

-- Add unique constraint on pin_hash instead
ALTER TABLE public.user_backups ADD CONSTRAINT user_backups_pin_hash_key UNIQUE (pin_hash);
