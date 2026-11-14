-- Run once in the Supabase SQL Editor before using the API.
create table public.events (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    location text,
    starts_at timestamptz,
    organizer_id uuid not null references auth.users(id),
    created_at timestamptz not null default now()
);
create table public.registrations (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (event_id, user_id)
);
create index registrations_user_id_idx on public.registrations(user_id);
alter table public.events enable row level security;
alter table public.registrations enable row level security;
grant select on public.events to anon, authenticated;
grant select, insert on public.registrations to authenticated;
revoke all on public.registrations from anon;
create policy "Anyone can browse events" on public.events
    for select to anon, authenticated using (true);
create policy "Users can register themselves" on public.registrations
    for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users and owning organizers can read registrations"
    on public.registrations for select to authenticated
    using (user_id = (select auth.uid()) or exists (
        select 1 from public.events e
        where e.id = registrations.event_id and e.organizer_id = (select auth.uid())
    ));
