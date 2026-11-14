# Campus Connect

Campus event discovery and organizer management with a Flask/Supabase backend and a standalone JavaScript frontend.

## Start locally

1. Install Python and Node.js 20+.
2. Create a Python environment: `python -m venv Backend/venv`.
3. Install backend dependencies: `Backend/venv/Scripts/python.exe -m pip install -r Backend/requirements.txt`.
4. Copy `Backend/.env.example` to `Backend/.env` and enter your Supabase project settings.
5. From the project root, run `node start.mjs`.
6. Open http://localhost:3000.

This prototype uses a Student/Organizer role switch and existing records in `public.users`; authentication is disabled by default. See the Backend and frontend READMEs for database requirements and API details.

## Database date migration

Event scheduling requires `Backend/migrations/001_event_dates.sql` to be applied in Supabase SQL Editor. The existing database does not have the `starts_at` column until this migration is applied. Do not run the initial `Backend/schema.sql` over an existing database.

## Project folders

- `Backend/`: Flask API, requirements, database scripts, and tests.
- `frontend/`: interface, local server, assets, and tests.
- `Design/`: original design references.

Environment files, credentials, virtual environments, and generated caches are excluded from Git.
