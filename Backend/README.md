# Current local prototype mode

Authentication is disabled by default, as requested. The frontend sends `X-Role: student` or `X-Role: organizer`. The backend selects the first existing `public.users` record of that role, ordered by `id`, and uses that user for registrations and organizer ownership checks. `GET /api/session` returns the selected ID and role. No tokens, password forms, or new database policies are required for the current database.

The frontend Viewing as dropdown selects a specific database user using X-User-Id, validated against the selected role. The Students & Organizers page lists existing users. This is for local development. Set `AUTH_ENABLED=true` to enable the retained backend bearer-token validation later; frontend sign-in is currently removed.

Start the backend with `venv\Scripts\python.exe app.py`. Restart after configuration or code changes. Start the frontend with `node server.mjs` from the frontend folder.

Your existing database contains `users`, `events`, and `registrations`. The initial `schema.sql` below is a reference for a fresh authenticated setup, not a migration for your current database. Do not run it over existing tables.

---

# Events API

1. Install dependencies: `pip install -r requirements.txt`.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `Backend/.env`.
3. For a fresh authenticated setup only, reconcile `schema.sql` with your schema before applying it.
4. Add events through the Supabase dashboard with an existing Supabase Auth user's UUID as `organizer_id`.
5. Start with `python app.py` (port 5000).

| Method | Endpoint | Authentication |
| --- | --- | --- |
| GET | `/api/events?limit=50&offset=0` | Public |
| GET | `/api/events/{id}` | Public |
| POST | `/api/registrations` | Bearer token |
| GET | `/api/me/registrations` | Bearer token |
| GET | `/api/events/{id}/registrations` | Owning organizer's bearer token |

IDs are UUIDs. Sign in through Supabase Auth and send `Authorization: Bearer <access_token>`. Tokens are validated using Supabase's [get_user](https://supabase.com/docs/reference/python/auth-getuser).

Registration body: `{"event_id":"<event UUID>"}`. The user ID comes from the verified token. Returns `201` with `{"registration": {...}}`, or `409` for duplicate registration. Missing/invalid tokens return `401`; other organizers receive `403`; missing events return `404`.

Lists return `{"events": [...]}` or `{"registrations": [...]}`. Details return `{"event": {...}}`. Attendees are registration records containing `user_id`. Current-user registrations include the nested event.

Run mocked tests with `python -m unittest discover -s tests -v`. These do not change Supabase.
