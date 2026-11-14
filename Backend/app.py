import os
import re
import time
from threading import RLock
from functools import wraps
from uuid import UUID, uuid4
from datetime import datetime, timezone

from flask import Flask, g, jsonify, request
from supabase import create_client, ClientOptions
from httpx import Client as HttpClient, Limits, RequestError
from supabase_auth.errors import AuthApiError
from postgrest import APIError
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
app = Flask(__name__)
app.config['AUTH_ENABLED'] = os.getenv('AUTH_ENABLED', 'false').lower() == 'true'
transport = HttpClient(limits=Limits(max_connections=30, max_keepalive_connections=20, keepalive_expiry=60), timeout=8)
_cache = {}
_cache_lock = RLock()
_load_locks = {}
_cache_generation = 0


def cached(key, seconds, loader):
    if app.testing:
        return loader()
    with _cache_lock:
        lock = _load_locks.setdefault(key, RLock())
    # Different resources load concurrently; identical reads share a single fetch.
    with lock:
        with _cache_lock:
            entry = _cache.get(key)
            if entry and entry[0] > time.monotonic():
                return entry[1]
            generation = _cache_generation
        value = loader()
        with _cache_lock:
            if generation == _cache_generation:
                _cache[key] = (time.monotonic() + seconds, value)
        return value


def invalidate_cache():
    global _cache_generation
    with _cache_lock:
        _cache_generation += 1
        _cache.clear()


def get_db():
    # Never share authenticated clients between requests.
    if 'db' not in g:
        g.db = create_client(
            os.environ['SUPABASE_URL'], os.environ['SUPABASE_PUBLISHABLE_KEY'],
            options=ClientOptions(postgrest_client_timeout=8, postgrest_client_retry=False, httpx_client=transport if not app.config['AUTH_ENABLED'] else None, persist_session=False, auto_refresh_token=False),
        )
    return g.db


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not app.config['AUTH_ENABLED']:
            role = request.headers.get('X-Role', 'student').lower()
            if role not in ('student', 'organizer'):
                return jsonify(error='Choose student or organizer.'), 400
            query = get_db().table('users').select('id, role').eq('role', role)
            selected_id = request.headers.get('X-User-Id')
            if selected_id:
                try:
                    selected_id = str(UUID(selected_id))
                except ValueError:
                    return jsonify(error='Selected user ID must be a UUID.'), 400
                query = query.eq('id', selected_id)
            users = query.order('id').limit(1).execute().data
            if not users:
                return jsonify(error=f'No matching {role} user found. Choose another user.'), 409
            g.user_id = str(users[0]['id'])
            g.role = role
            return view(*args, **kwargs)
        parts = request.headers.get('Authorization', '').split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify(error='A Bearer access token is required.'), 401
        db = get_db()
        try:
            user = db.auth.get_user(parts[1]).user
        except AuthApiError:
            return jsonify(error='Invalid or expired access token.'), 401
        if not user:
            return jsonify(error='Invalid or expired access token.'), 401
        g.user_id = str(user.id)
        g.role = None
        db.postgrest.auth(parts[1])
        return view(*args, **kwargs)
    return wrapped


@app.errorhandler(RequestError)
def connection_error(error):
    app.logger.warning('Supabase connection failed: %s', type(error).__name__)
    return jsonify(error='Cannot reach Supabase. Check your internet connection and retry.'), 503


@app.errorhandler(APIError)
def database_error(error):
    if error.code in ('42703', 'PGRST204') and 'starts_at' in str(error):
        return jsonify(error='Event dates need the database migration. Run Backend/migrations/001_event_dates.sql in Supabase SQL Editor.'), 503
    if error.code == '23505':
        if request.endpoint == 'create_user':
            return jsonify(error='A user with this email already exists.'), 409
        return jsonify(error='You are already registered for this event.'), 409
    if error.code == '23503':
        return jsonify(error='The referenced event or user does not exist.'), 404
    if error.code == '42501':
        return jsonify(error='You do not have permission for this action.'), 403
    app.logger.exception('Database request failed')
    return jsonify(error='Database request failed.'), 500


def find_event(event_id):
    rows = get_db().table('events').select('*').eq('id', str(event_id)).limit(1).execute().data
    return rows[0] if rows else None


@app.get('/')
def index():
    return jsonify(message='Events API', events='/api/events')


@app.get('/api/session')
@require_auth
def current_session():
    return jsonify(user={'id': g.user_id, 'role': g.role}, authentication_enabled=app.config['AUTH_ENABLED'])


@app.get('/api/users')
def list_users():
    # User switching is available only in the explicitly requested no-login mode.
    if app.config['AUTH_ENABLED']:
        return jsonify(error='The development user directory is disabled.'), 403
    role = request.args.get('role')
    if role is not None and role not in ('student', 'organizer'):
        return jsonify(error='Choose student or organizer.'), 400
    def load():
        users = []
        for offset in range(0, 1000000, 1000):
            query = get_db().table('users').select('id, email, role').order('id')
            if role:
                query = query.eq('role', role)
            rows = query.range(offset, offset + 999).execute().data
            users.extend(rows)
            if len(rows) < 1000:
                break
        return users
    users = cached(('users', role), 5, load)
    return jsonify(users=users)


def is_organizer():
    if g.role is not None:
        return g.role == 'organizer'
    users = get_db().table('users').select('role').eq('id', g.user_id).limit(1).execute().data
    return bool(users and users[0]['role'] == 'organizer')


@app.post('/api/users')
@require_auth
def create_user():
    if not is_organizer():
        return jsonify(error='Only organizers can create students.'), 403
    body = request.get_json(silent=True)
    email = body.get('email') if isinstance(body, dict) else None
    if not isinstance(email, str) or len(email.strip()) > 254 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email.strip()):
        return jsonify(error='Enter a valid email address.'), 400
    if body.get('role', 'student') != 'student':
        return jsonify(error='Create a student first, then use Make organizer.'), 400
    user = {'id': str(uuid4()), 'email': email.strip().lower(), 'role': 'student'}
    rows = get_db().table('users').insert(user).execute().data
    invalidate_cache()
    return jsonify(user=rows[0]), 201


@app.patch('/api/users/<uuid:user_id>/role')
@require_auth
def promote_user(user_id):
    if not is_organizer():
        return jsonify(error='Only organizers can promote students.'), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or body.get('role') != 'organizer':
        return jsonify(error='Set role to organizer to promote a student.'), 400
    rows = get_db().table('users').update({'role': 'organizer'}).eq('id', str(user_id)).eq('role', 'student').execute().data
    if not rows:
        return jsonify(error='Student not found or already an organizer.'), 404
    invalidate_cache()
    return jsonify(user=rows[0])


@app.get('/api/events')
def list_events():
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify(error='limit and offset must be integers.'), 400
    if not 1 <= limit <= 100 or offset < 0:
        return jsonify(error='limit must be 1–100 and offset must be nonnegative.'), 400
    rows = cached(('events', limit, offset), 3, lambda: get_db().table('events').select('*').neq('status', 'closed').order('id').range(offset, offset + limit - 1).execute().data)
    return jsonify(events=rows, limit=limit, offset=offset)


@app.get('/api/organizer/events')
@require_auth
def organizer_events():
    if not is_organizer():
        return jsonify(error='Only organizers can manage events.'), 403
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify(error='limit and offset must be integers.'), 400
    if not 1 <= limit <= 100 or offset < 0:
        return jsonify(error='Invalid pagination.'), 400
    rows = get_db().table('events').select('*').eq('organizer_id', g.user_id).order('id').range(offset, offset + limit - 1).execute().data
    return jsonify(events=rows, limit=limit, offset=offset)


def parse_event_date(value):
    if not isinstance(value, str):
        raise ValueError('An event date and time are required.')
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise ValueError('Enter a valid event date and time.') from None
    if date.tzinfo is None:
        raise ValueError('Event date must include a timezone.')
    return date.astimezone(timezone.utc).isoformat()


@app.get('/api/events/<uuid:event_id>')
def event_details(event_id):
    event = find_event(event_id)
    if event is None:
        return jsonify(error='Event not found.'), 404
    return jsonify(event=event)


@app.post('/api/events')
@require_auth
def create_event():
    if not is_organizer():
        return jsonify(error='Only organizers can create events.'), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error='A JSON object with title and capacity is required.'), 400
    title = body.get('title')
    capacity = body.get('capacity')
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 200:
        return jsonify(error='Title must contain 1 to 200 characters.'), 400
    if type(capacity) is not int or not 1 <= capacity <= 2147483647:
        return jsonify(error='Capacity must be a positive whole number up to 2147483647.'), 400
    event = {
        'id': str(uuid4()), 'organizer_id': g.user_id,
        'title': title.strip(), 'capacity': capacity, 'status': 'upcoming',
    }
    if 'starts_at' in body:
        try:
            event['starts_at'] = parse_event_date(body['starts_at'])
        except ValueError as error:
            return jsonify(error=str(error)), 400
    rows = get_db().table('events').insert(event).execute().data
    invalidate_cache()
    return jsonify(event=rows[0]), 201


@app.patch('/api/events/<uuid:event_id>')
@require_auth
def update_event(event_id):
    if not is_organizer():
        return jsonify(error='Only organizers can update events.'), 403
    event = find_event(event_id)
    if event is None:
        return jsonify(error='Event not found.'), 404
    if str(event['organizer_id']) != g.user_id:
        return jsonify(error='Only the owning organizer can update this event.'), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not body or set(body) - {'status', 'starts_at'}:
        return jsonify(error='Provide status and/or starts_at.'), 400
    updates = {}
    if 'status' in body:
        if body['status'] not in ('upcoming', 'closed'):
            return jsonify(error='Status must be upcoming (open) or closed.'), 400
        updates['status'] = body['status']
    if 'starts_at' in body:
        try:
            updates['starts_at'] = parse_event_date(body['starts_at'])
        except ValueError as error:
            return jsonify(error=str(error)), 400
    rows = get_db().table('events').update(updates).eq('id', str(event_id)).eq('organizer_id', g.user_id).execute().data
    if not rows:
        return jsonify(error='Event could not be updated.'), 409
    invalidate_cache()
    return jsonify(event=rows[0])


@app.post('/api/registrations')
@require_auth
def create_registration():
    if not app.config['AUTH_ENABLED'] and g.role != 'student':
        return jsonify(error='Switch to Student mode to register for events.'), 403
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error='A JSON object with event_id is required.'), 400
    try:
        event_id = str(UUID(str(body.get('event_id', ''))))
    except ValueError:
        return jsonify(error='event_id must be a valid UUID.'), 400
    event = find_event(event_id)
    if event is None:
        return jsonify(error='Event not found.'), 404
    if event.get('status') == 'closed':
        return jsonify(error='This event is closed for registration.'), 409
    rows = get_db().table('registrations').insert({'event_id': event_id, 'user_id': g.user_id}).execute().data
    return jsonify(registration=rows[0]), 201


@app.get('/api/me/registrations')
@require_auth
def my_registrations():
    rows = get_db().table('registrations').select('*, event:events(*)').eq('user_id', g.user_id).order('created_at', desc=True).execute().data
    return jsonify(registrations=rows)


@app.get('/api/events/<uuid:event_id>/registrations')
@require_auth
def event_registrations(event_id):
    event = find_event(event_id)
    if event is None:
        return jsonify(error='Event not found.'), 404
    if str(event['organizer_id']) != g.user_id:
        return jsonify(error='Only the owning organizer can view attendees.'), 403
    rows = get_db().table('registrations').select('*').eq('event_id', str(event_id)).order('created_at').execute().data
    return jsonify(registrations=rows)


@app.errorhandler(404)
def not_found(error):
    return jsonify(error='Resource not found.'), 404


if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_DEBUG') == '1')
