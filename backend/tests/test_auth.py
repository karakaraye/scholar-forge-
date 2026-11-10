import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, AcademicLevel
from workspaces.models import Workspace


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        email='researcher@university.edu',
        password='SecurePassword123!',
        first_name='Elena',
        last_name='Vance',
        academic_level=AcademicLevel.PHD,
        institution='Oxford University'
    )
    Workspace.objects.create(name="Elena's Workspace", owner=user, is_personal=True)
    return user


@pytest.mark.django_db
class TestAuthentication:
    def test_user_registration_success(self, api_client):
        url = reverse('auth-register')
        payload = {
            'email': 'newresearcher@harvard.edu',
            'first_name': 'Marcus',
            'last_name': 'Chen',
            'password': 'StrongPassword2026!',
            'password_confirm': 'StrongPassword2026!',
            'academic_level': AcademicLevel.MASTERS,
            'institution': 'Harvard University'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert response.data['user']['email'] == 'newresearcher@harvard.edu'
        assert User.objects.filter(email='newresearcher@harvard.edu').exists()

        # Check default workspace creation
        user = User.objects.get(email='newresearcher@harvard.edu')
        assert Workspace.objects.filter(owner=user).exists()

    def test_user_registration_password_mismatch(self, api_client):
        url = reverse('auth-register')
        payload = {
            'email': 'mismatch@test.edu',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'Password123!',
            'password_confirm': 'DifferentPassword456!',
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password_confirm' in response.data

    def test_user_login_success(self, api_client, test_user):
        url = reverse('auth-login')
        payload = {
            'email': 'researcher@university.edu',
            'password': 'SecurePassword123!'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user']['email'] == test_user.email

    def test_user_login_invalid_password(self, api_client, test_user):
        url = reverse('auth-login')
        payload = {
            'email': 'researcher@university.edu',
            'password': 'WrongPassword999'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_logout(self, api_client, test_user):
        api_client.force_login(test_user)
        url = reverse('auth-logout')
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK

    def test_get_me_profile_authenticated(self, api_client, test_user):
        api_client.force_login(test_user)
        url = reverse('auth-me')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == test_user.email
        assert response.data['academic_level'] == AcademicLevel.PHD

    def test_get_me_unauthenticated_forbidden(self, api_client):
        url = reverse('auth-me')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_me_profile(self, api_client, test_user):
        api_client.force_login(test_user)
        url = reverse('auth-me')
        payload = {
            'institution': 'Cambridge University',
            'orcid_id': '0000-0002-1825-0097'
        }
        response = api_client.patch(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['institution'] == 'Cambridge University'
        assert response.data['orcid_id'] == '0000-0002-1825-0097'

    def test_password_reset_flow(self, api_client, test_user):
        # 1. Request reset
        request_url = reverse('auth-password-reset')
        resp = api_client.post(request_url, {'email': test_user.email}, format='json')
        assert resp.status_code == status.HTTP_200_OK
        uid = resp.data['dev_reset_data']['uid']
        token = resp.data['dev_reset_data']['token']

        # 2. Confirm reset
        confirm_url = reverse('auth-password-reset-confirm')
        confirm_payload = {
            'uid': uid,
            'token': token,
            'new_password': 'BrandNewPassword2026!'
        }
        confirm_resp = api_client.post(confirm_url, confirm_payload, format='json')
        assert confirm_resp.status_code == status.HTTP_200_OK

        # 3. Verify login with new password
        login_url = reverse('auth-login')
        login_resp = api_client.post(login_url, {
            'email': test_user.email,
            'password': 'BrandNewPassword2026!'
        }, format='json')
        assert login_resp.status_code == status.HTTP_200_OK

