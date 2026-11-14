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

## Database setup

Use the existing Supabase database. Do not run the initial `Backend/schema.sql` over existing tables. Event creation requires a title and capacity; organizers can open and close their events.

## Project folders

- `Backend/`: Flask API, requirements, database scripts, and tests.
- `frontend/`: interface, local server, assets, and tests.
- `Design/`: original design references.

Environment files, credentials, virtual environments, and generated caches are excluded from Git.

## Deploy the backend on Render

Use the Python runtime with these settings when deploying from the repository root:

- Root Directory: leave blank.
- Build Command: `pip install -r requirements.txt`.
- Start Command: `gunicorn --chdir Backend app:app --bind 0.0.0.0:$PORT`.

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Render's environment variables. This service deploys the backend API; the frontend is a separate Node.js service.

If Root Directory is set to `Backend` instead, use `pip install -r requirements.txt` and `gunicorn app:app --bind 0.0.0.0:$PORT`.
