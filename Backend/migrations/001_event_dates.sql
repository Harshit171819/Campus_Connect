-- Add event dates to the existing events table without changing existing rows.
alter table public.events add column if not exists starts_at timestamptz;
notify pgrst, 'reload schema';
