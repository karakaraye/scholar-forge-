"""
Django settings for ScholarForge AI.

Every deployment-sensitive value is read from the environment (see .env.example).
Production is the default: DEBUG is off unless DJANGO_DEBUG=True.
"""

from pathlib import Path
import os
import sys
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None or value.strip() == '':
        return default
    return value.strip().lower() in ('true', '1', 'yes', 'on')


def env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


DEBUG = env_bool('DJANGO_DEBUG', False)

# True while running the automated test suite (pytest or `manage.py test`).
# Enables deterministic offline behaviour such as the mock AI engine.
TESTING = (
    env_bool('DJANGO_TESTING', False)
    or 'pytest' in sys.modules
    or (len(sys.argv) > 1 and sys.argv[1] == 'test')
)

_DEV_SECRET_KEY = 'scholarforge-insecure-dev-key-never-use-in-production'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '').strip()
if not SECRET_KEY:
    if DEBUG or TESTING:
        SECRET_KEY = _DEV_SECRET_KEY
    else:
        raise ImproperlyConfigured(
            'DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false. '
            'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
        )

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'corsheaders',

    # Local ScholarForge apps
    'accounts.apps.AccountsConfig',
    'workspaces.apps.WorkspacesConfig',
    'disciplines.apps.DisciplinesConfig',
    'projects.apps.ProjectsConfig',
    'documents.apps.DocumentsConfig',
    'research.apps.ResearchConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'scholarforge.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'scholarforge.wsgi.application'

# Database configuration
# Supports PostgreSQL with graceful local sqlite fallback for development/testing
DB_ENGINE = os.environ.get('DB_ENGINE', 'postgresql' if os.environ.get('POSTGRES_DB') else 'sqlite')

if DB_ENGINE == 'postgresql' or os.environ.get('POSTGRES_DB'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('POSTGRES_DB', 'scholarforge_db'),
            'USER': os.environ.get('POSTGRES_USER', 'scholarforge_user'),
            'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'scholarforge_secure_pass'),
            'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
            'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (Django admin / DRF assets), served by WhiteNoise in production.
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {
        'BACKEND': (
            'django.contrib.staticfiles.storage.StaticFilesStorage'
            if DEBUG or TESTING
            else 'whitenoise.storage.CompressedManifestStaticFilesStorage'
        ),
    },
}

# Private user files: uploaded datasets, source documents, supervisor feedback,
# guideline files and generated DOCX/PDF exports. Never served directly; exports are
# streamed through the authorized download endpoint. Keep this outside the source tree
# in production by setting DJANGO_MEDIA_ROOT (e.g. a mounted volume).
MEDIA_ROOT = Path(os.environ.get('DJANGO_MEDIA_ROOT', BASE_DIR / 'media')).resolve()
MEDIA_URL = '/media/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%SZ',
}

# Cookie, Session & CSRF Security
# Secure HttpOnly session cookies, appropriate CSRF protection, no tokens stored in localStorage
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'scholarforge_sessionid'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days

CSRF_COOKIE_NAME = 'scholarforge_csrftoken'
CSRF_COOKIE_HTTPONLY = False  # Allows frontend client to read CSRF header for mutating requests
CSRF_COOKIE_SAMESITE = 'Lax'

# Secure (HTTPS-only) cookies default on outside DEBUG. Set both to False only for a
# production-mode stack served over plain HTTP on localhost.
SESSION_COOKIE_SECURE = env_bool('SESSION_COOKIE_SECURE', not DEBUG)
CSRF_COOKIE_SECURE = env_bool('CSRF_COOKIE_SECURE', not DEBUG)

# Public origin of the web app, used for links in emails (invitations, password reset).
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')

_LOCAL_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', _LOCAL_ORIGINS)
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', _LOCAL_ORIGINS)
for _origin in (FRONTEND_URL,):
    if _origin and _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)
    if _origin and _origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_origin)

# HTTPS hardening (behind a TLS-terminating reverse proxy such as Caddy or nginx).
if not DEBUG and not TESTING:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = env_bool('DJANGO_SECURE_SSL_REDIRECT', True)
    SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool('DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS', True)
    SECURE_HSTS_PRELOAD = env_bool('DJANGO_SECURE_HSTS_PRELOAD', False)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'same-origin'
    X_FRAME_OPTIONS = 'DENY'

# Email: console output by default; set EMAIL_HOST (+ credentials) to send real mail via SMTP.
EMAIL_HOST = os.environ.get('EMAIL_HOST', '').strip()
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend' if EMAIL_HOST
    else 'django.core.mail.backends.console.EmailBackend',
)
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
EMAIL_USE_SSL = env_bool('EMAIL_USE_SSL', False)
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', '15'))
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'ScholarForge AI <no-reply@scholarforge.ai>')

# Password-reset responses include the raw uid/token only in local development so the flow
# can be exercised without a mail server. Never enabled outside DEBUG.
EXPOSE_DEV_RESET_LINKS = DEBUG and env_bool('EXPOSE_DEV_RESET_LINKS', True)

# Document export execution: 'sync' renders inside the request (development/tests);
# 'worker' queues jobs for `python manage.py run_export_worker`.
EXPORT_JOB_MODE = os.environ.get('EXPORT_JOB_MODE', 'sync' if (DEBUG or TESTING) else 'worker').strip().lower()
if EXPORT_JOB_MODE not in ('sync', 'worker'):
    raise ImproperlyConfigured("EXPORT_JOB_MODE must be 'sync' or 'worker'.")
EXPORT_JOB_STALE_MINUTES = int(os.environ.get('EXPORT_JOB_STALE_MINUTES', '30'))

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {'format': '%(asctime)s %(levelname)s %(name)s: %(message)s'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'standard'},
    },
    'root': {'handlers': ['console'], 'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO')},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}
