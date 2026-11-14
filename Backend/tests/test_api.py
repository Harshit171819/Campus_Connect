import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from postgrest import APIError
from supabase_auth.errors import AuthApiError
from app import app, cached, invalidate_cache

EVENT = '11111111-1111-4111-8111-111111111111'
USER = '22222222-2222-4222-8222-222222222222'
HEADERS = {'Authorization': 'Bearer test-token'}


class ApiTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        previous_auth = app.config['AUTH_ENABLED']
        app.config['AUTH_ENABLED'] = True
        self.addCleanup(lambda: app.config.update(AUTH_ENABLED=previous_auth))
        self.client = app.test_client()
        self.db = MagicMock()
        self.db.auth.get_user.return_value = SimpleNamespace(user=SimpleNamespace(id=USER))
        self.query = MagicMock()
        self.db.table.return_value = self.query
        for method in ('select', 'eq', 'limit', 'order', 'range', 'insert', 'update', 'neq'):
            getattr(self.query, method).return_value = self.query
        self.query.execute.return_value = SimpleNamespace(data=[])
        self.patcher = patch('app.get_db', return_value=self.db)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def test_public_events_and_details(self):
        self.assertEqual(self.client.get('/api/events').status_code, 200)
        self.query.execute.return_value.data = [{'id': EVENT}]
        response = self.client.get('/api/events/' + EVENT)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['event']['id'], EVENT)
        self.db.auth.get_user.assert_not_called()

    def test_missing_event(self):
        self.assertEqual(self.client.get('/api/events/' + EVENT).status_code, 404)

    def test_private_endpoints_require_auth(self):
        for method, path in [('post', '/api/registrations'), ('get', '/api/me/registrations'),
                             ('get', '/api/events/' + EVENT + '/registrations')]:
            self.assertEqual(getattr(self.client, method)(path).status_code, 401)

    def test_invalid_token(self):
        self.db.auth.get_user.side_effect = AuthApiError('Invalid token', 401, 'bad_jwt')
        self.assertEqual(self.client.get('/api/me/registrations', headers=HEADERS).status_code, 401)

    def test_registration_uses_authenticated_user(self):
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': EVENT}]),
                                          SimpleNamespace(data=[{'id': 'registration'}])]
        response = self.client.post('/api/registrations', headers=HEADERS,
                                    json={'event_id': EVENT, 'user_id': 'spoofed'})
        self.assertEqual(response.status_code, 201)
        self.query.insert.assert_called_once_with({'event_id': EVENT, 'user_id': USER})
        self.db.postgrest.auth.assert_called_once_with('test-token')

    def test_duplicate_registration(self):
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': EVENT}]),
            APIError({'code': '23505', 'message': 'duplicate', 'details': '', 'hint': ''})]
        self.assertEqual(self.client.post('/api/registrations', headers=HEADERS,
                                         json={'event_id': EVENT}).status_code, 409)

    def test_invalid_registration_body(self):
        for body in ([], {}, {'event_id': 'invalid'}):
            self.assertEqual(self.client.post('/api/registrations', headers=HEADERS, json=body).status_code, 400)

    def test_registration_missing_event(self):
        self.assertEqual(self.client.post('/api/registrations', headers=HEADERS,
                                         json={'event_id': EVENT}).status_code, 404)
        self.query.insert.assert_not_called()

    def test_organizer_access(self):
        path = '/api/events/' + EVENT + '/registrations'
        self.query.execute.return_value.data = [{'id': EVENT, 'organizer_id': 'someone-else'}]
        self.assertEqual(self.client.get(path, headers=HEADERS).status_code, 403)
        self.query.execute.return_value.data = [{'id': EVENT, 'organizer_id': USER}]
        self.assertEqual(self.client.get(path, headers=HEADERS).status_code, 200)

    def test_my_registrations_filter(self):
        self.assertEqual(self.client.get('/api/me/registrations', headers=HEADERS).status_code, 200)
        self.query.eq.assert_called_with('user_id', USER)

    def test_invalid_pagination(self):
        for query in ('limit=no', 'limit=0', 'limit=101', 'offset=-1'):
            self.assertEqual(self.client.get('/api/events?' + query).status_code, 400)

    def test_no_login_session_uses_selected_role(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'organizer'}]
        response = self.client.get('/api/session', headers={'X-Role': 'organizer'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['user']['id'], USER)
        self.assertFalse(response.json['authentication_enabled'])
        self.query.eq.assert_called_with('role', 'organizer')
        self.db.auth.get_user.assert_not_called()

    def test_no_login_student_can_register(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': USER, 'role': 'student'}]),
            SimpleNamespace(data=[{'id': EVENT}]), SimpleNamespace(data=[{'id': 'registration'}])]
        response = self.client.post('/api/registrations', headers={'X-Role': 'student'}, json={'event_id': EVENT})
        self.assertEqual(response.status_code, 201)
        self.query.insert.assert_called_with({'event_id': EVENT, 'user_id': USER})
        self.db.auth.get_user.assert_not_called()

    def test_no_login_organizer_cannot_register_as_student(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'organizer'}]
        response = self.client.post('/api/registrations', headers={'X-Role': 'organizer'}, json={'event_id': EVENT})
        self.assertEqual(response.status_code, 403)

    def test_no_login_invalid_role(self):
        app.config['AUTH_ENABLED'] = False
        self.assertEqual(self.client.get('/api/session', headers={'X-Role': 'admin'}).status_code, 400)

    def test_no_login_missing_role_user(self):
        app.config['AUTH_ENABLED'] = False
        self.assertEqual(self.client.get('/api/session').status_code, 409)

    def test_user_directory(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'email': 'student@example.com', 'role': 'student'}]
        response = self.client.get('/api/users?role=student')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['users'][0]['email'], 'student@example.com')
        self.query.eq.assert_called_with('role', 'student')

    def test_directory_disabled_with_auth(self):
        self.assertEqual(self.client.get('/api/users').status_code, 403)

    def test_selected_user_is_scoped_to_role(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'student'}]
        response = self.client.get('/api/session', headers={'X-Role': 'student', 'X-User-Id': USER})
        self.assertEqual(response.status_code, 200)
        self.query.eq.assert_any_call('id', USER)
        self.query.eq.assert_any_call('role', 'student')

    def test_selected_user_missing_or_wrong_role(self):
        app.config['AUTH_ENABLED'] = False
        response = self.client.get('/api/session', headers={'X-Role': 'organizer', 'X-User-Id': USER})
        self.assertEqual(response.status_code, 409)

    def test_selected_user_invalid_id(self):
        app.config['AUTH_ENABLED'] = False
        self.assertEqual(self.client.get('/api/session', headers={'X-User-Id': 'invalid'}).status_code, 400)

    def test_organizer_creates_event_with_selected_owner(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': USER, 'role': 'organizer'}]),
            SimpleNamespace(data=[{'id': EVENT, 'title': 'Workshop', 'capacity': 50, 'organizer_id': USER}])]
        response = self.client.post('/api/events', headers={'X-Role': 'organizer', 'X-User-Id': USER},
            json={'title': '  Workshop  ', 'capacity': 50, 'organizer_id': 'spoofed'})
        self.assertEqual(response.status_code, 201)
        inserted = self.query.insert.call_args.args[0]
        self.assertEqual(inserted['organizer_id'], USER)
        self.assertEqual(inserted['title'], 'Workshop')
        self.assertEqual(inserted['capacity'], 50)
        self.assertEqual(inserted['status'], 'upcoming')

    def test_student_cannot_create_event(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'student'}]
        response = self.client.post('/api/events', json={'title': 'Workshop', 'capacity': 50})
        self.assertEqual(response.status_code, 403)
        self.query.insert.assert_not_called()

    def test_event_creation_validates_fields(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'organizer'}]
        for body in ([], {}, {'title': ' ', 'capacity': 5}, {'title': 'A'*201, 'capacity': 5},
                     {'title': 'Workshop', 'capacity': 0}, {'title': 'Workshop', 'capacity': True},
                     {'title': 'Workshop', 'capacity': 1.5}, {'title': 'Workshop', 'capacity': '50'}):
            with self.subTest(body=body):
                self.assertEqual(self.client.post('/api/events', headers={'X-Role': 'organizer'}, json=body).status_code, 400)
        self.query.insert.assert_not_called()

    def test_authenticated_student_cannot_create_event(self):
        self.query.execute.return_value.data = [{'role': 'student'}]
        self.assertEqual(self.client.post('/api/events', headers=HEADERS,
            json={'title': 'Workshop', 'capacity': 50}).status_code, 403)

    def test_organizer_creates_student(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': USER, 'role': 'organizer'}]),
            SimpleNamespace(data=[{'id': EVENT, 'email': 'student@example.com', 'role': 'student'}])]
        response = self.client.post('/api/users', headers={'X-Role': 'organizer'}, json={'email': ' Student@Example.com '})
        self.assertEqual(response.status_code, 201)
        user = self.query.insert.call_args.args[0]
        self.assertEqual(user['email'], 'student@example.com')
        self.assertEqual(user['role'], 'student')

    def test_student_cannot_manage_users(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'student'}]
        self.assertEqual(self.client.post('/api/users', json={'email': 'a@example.com'}).status_code, 403)
        self.assertEqual(self.client.patch('/api/users/'+EVENT+'/role', json={'role': 'organizer'}).status_code, 403)
        self.query.insert.assert_not_called()
        self.query.update.assert_not_called()

    def test_create_student_validation(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.return_value.data = [{'id': USER, 'role': 'organizer'}]
        for body in ([], {}, {'email': 'bad'}, {'email': 'a@example.com', 'role': 'organizer'}):
            with self.subTest(body=body):
                self.assertEqual(self.client.post('/api/users', headers={'X-Role': 'organizer'}, json=body).status_code, 400)

    def test_promote_student(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': USER, 'role': 'organizer'}]),
            SimpleNamespace(data=[{'id': EVENT, 'role': 'organizer'}])]
        response = self.client.patch('/api/users/'+EVENT+'/role', headers={'X-Role': 'organizer'}, json={'role': 'organizer'})
        self.assertEqual(response.status_code, 200)
        self.query.update.assert_called_once_with({'role': 'organizer'})
        self.query.eq.assert_any_call('id', EVENT)
        self.query.eq.assert_any_call('role', 'student')

    def test_promote_missing_student(self):
        app.config['AUTH_ENABLED'] = False
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': USER, 'role': 'organizer'}]), SimpleNamespace(data=[])]
        self.assertEqual(self.client.patch('/api/users/'+EVENT+'/role', headers={'X-Role': 'organizer'}, json={'role': 'organizer'}).status_code, 404)

    def test_public_cache_reuses_read_and_invalidates(self):
        previous_testing = app.testing
        app.testing = False
        self.addCleanup(lambda: app.config.update(TESTING=previous_testing))
        self.addCleanup(invalidate_cache)
        invalidate_cache()
        loader = MagicMock(return_value=['first'])
        self.assertEqual(cached('test-events', 3, loader), ['first'])
        self.assertEqual(cached('test-events', 3, loader), ['first'])
        loader.assert_called_once()
        invalidate_cache()
        loader.return_value = ['newly saved event']
        self.assertEqual(cached('test-events', 3, loader), ['newly saved event'])
        self.assertEqual(loader.call_count, 2)

    def test_event_save_invalidates_cached_lists(self):
        import app as backend
        app.config['AUTH_ENABLED'] = False
        backend._cache['events-test'] = (999999999999, ['old'])
        self.addCleanup(invalidate_cache)
        self.query.execute.side_effect = [SimpleNamespace(data=[{'id': USER, 'role': 'organizer'}]),
            SimpleNamespace(data=[{'id': EVENT, 'title': 'New event'}])]
        response = self.client.post('/api/events', headers={'X-Role': 'organizer'}, json={'title': 'New event', 'capacity': 30})
        self.assertEqual(response.status_code, 201)
        self.assertNotIn('events-test', backend._cache)


if __name__ == '__main__':
    unittest.main()
