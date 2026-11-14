# Campus Connect frontend

A standalone frontend based on the four screens in your Stitch ZIP. Built with HTML, CSS, and JavaScript; no package installation required. Node.js 20+ is needed for the local server.

## Run

From the workspace root, run `node start.mjs` to start both servers together, then open http://localhost:3000. Live backend data loads by default. Use Ctrl+C to stop the servers started by this command.

Alternatively, start them separately:

Start your backend in one terminal, from the workspace root:

```powershell
cd Backend
.\venv\Scripts\python.exe app.py
```

Start the frontend in a second terminal:

```powershell
cd frontend
node server.mjs
```

Open http://localhost:3000. The frontend server proxies API requests to http://127.0.0.1:5000, so no Flask CORS changes are needed. Set BACKEND_URL or PORT environment variables to override these defaults.

## Features

- Student event discovery with keyword search, category filters, sorting, and event details.
- Top-right Student / Organizer switch, with no sign-in or password forms.
- Event registration and current-user registrations.
- Organizer dashboard, Create Event form, owned-event list, participant lists, and CSV export.
- Responsive layout following the supplied purple palette, typography, sidebar, cards, and event imagery.
- Explicit design preview mode with sample events and temporary registrations, available from the connection error screen.

The server reads Backend/.env for server configuration and does not serve that file. Authentication is disabled by default for this local prototype. Each request sends X-Role (student or organizer). The Viewing as dropdown selects an existing user of that role. Requests include X-User-Id, which the backend checks against X-Role. With no selection, the first user of that role is used. The Students & Organizers page lists database users. Organizer mode uses the matching organizer identity; ownership checks still apply. This role switch is a development convenience, not identity verification. No database policies are changed.

Restart both servers after this change and refresh the browser. Your existing users table must have a student and organizer. Your existing database is supported; do not rerun the initial schema over existing tables.

Organizers can create events with title and capacity using POST /api/events. New events have status upcoming and organizer_id is derived from the selected user. Event editing and deletion are not currently included. Participant lists show user UUIDs. Live categories are supported if events contain a category field; otherwise they appear as Campus Event. Live event images currently use the reference artwork as a fallback. Reference images and Google Fonts require internet access.

## Checks

```powershell
node --check app.js
node --check server.mjs
```

The static server serves only an explicit allowlist of frontend assets. Keep it bound to localhost for development.


## Performance and user management

Navigation reuses loaded data immediately. Concurrent identical GET requests are deduplicated, frontend reads are cached for 5 seconds, and API event/user lists have short caches invalidated by successful writes. The backend reuses HTTP connections in no-login mode. Event and registration saves update the visible page from the confirmed database response. Public views refresh in the background every 15 seconds while visible; other tabs on the same origin receive change notifications.

Event artwork and fonts are served locally from assets, with compression and browser caching. The first live data request still depends on network latency to Supabase; subsequent navigation does not require another full data load.

In Organizer mode, open Students & Organizers, choose Add Student, and enter an email. Student cards include Make organizer. These write to the existing public.users table; they do not create Supabase Auth credentials. POST /api/users creates a student and PATCH /api/users/{id}/role promotes one. Both endpoints check the selected organizer role. Event creation continues to save directly to public.events before showing success.
