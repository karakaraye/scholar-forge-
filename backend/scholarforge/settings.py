"""
Django settings for ScholarForge AI Stage 1.
"""

from pathlib import Path
import os
import sys
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'scholarforge-insecure-dev-key-change-in-production-2026-stage1'
)

DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

# True while running the automated test suite (pytest or `manage.py test`).
# Enables deterministic offline behaviour such as the mock AI engine.
TESTING = (
    os.environ.get('DJANGO_TESTING', '').lower() in ('true', '1', 'yes')
    or 'pytest' in sys.modules
    or (len(sys.argv) > 1 and sys.argv[1] == 'test')
)

ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    'localhost,127.0.0.1,0.0.0.0'
).split(',')

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

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

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
SESSION_COOKIE_SECURE = not DEBUG  # True in production
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 days

CSRF_COOKIE_NAME = 'scholarforge_csrftoken'
CSRF_COOKIE_HTTPONLY = False  # Allows frontend client to read CSRF header for mutating requests
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# Email settings for password reset simulation
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'support@scholarforge.ai'
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
