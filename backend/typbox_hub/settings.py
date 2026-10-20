"""
Django settings for typbox_hub project.
"""

import os
from datetime import timedelta
from pathlib import Path

# Load environment variables from .env if present
try:
    from dotenv import load_dotenv
    BASE_DIR = Path(__file__).resolve().parent.parent
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-z)ao(w5q0xo()-+bf+56&lkpmqwq!2athe@$ks-i^1zbs=4n&#'
)

# SECURITY WARNING: don't run with debug turned on in production!
is_render = os.getenv('RENDER', '').lower() == 'true'
default_debug = 'False' if is_render else 'True'
DEBUG = os.getenv('DEBUG', default_debug).lower() in ('true', '1', 'yes')

allowed_hosts_raw = os.getenv(
    'ALLOWED_HOSTS',
    'localhost,127.0.0.1,.onrender.com,typbox-dev.onrender.com,typbox.me,www.typbox.me,.typbox.me'
)
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]
for default_host in ('typbox.me', 'www.typbox.me', '.typbox.me'):
    if default_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(default_host)

# Automatically add Render's external hostname if provided by the environment
render_external_hostname = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if render_external_hostname and render_external_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_external_hostname)


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',

    # Local apps
    'tracker.apps.TrackerConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # WhiteNoise for high-performance static files in production
    'corsheaders.middleware.CorsMiddleware',      # CORS middleware placed as high as possible
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'typbox_hub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'typbox_hub.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases
# Default local database: SQLite
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# If DATABASE_URL is set (e.g. Render with Neon PostgreSQL), automatically switch to PostgreSQL
database_url = os.getenv('DATABASE_URL')
if database_url and database_url.strip():
    try:
        import dj_database_url
        conn_max_age = int(os.getenv('CONN_MAX_AGE', '600'))
        DATABASES['default'] = dj_database_url.parse(
            database_url.strip(),
            conn_max_age=conn_max_age,
            conn_health_checks=True,
            ssl_require=True,
        )
    except Exception as e:
        print(f"Warning: Failed to parse DATABASE_URL: {e}")


# Password validation
# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
# STATICFILES_STORAGE was removed in Django 5.1; STORAGES is the replacement.
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ==========================================
# Django REST Framework & JWT Configuration
# ==========================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '600/minute',
        # Dedicated, tighter scopes for the credential-stuffing / brute-force
        # / spam-prone auth endpoints — the generic 120/min anon rate above
        # is far too loose for login or password-reset specifically.
        'login': '10/minute',
        'register': '10/minute',
        'password_reset': '5/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ==========================================
# CORS & CSRF Configuration
# ==========================================

cors_raw = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,https://typbox.me,https://www.typbox.me,https://rikutomikado.tech'
)
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_raw.split(',') if origin.strip()]
# rikutomikado.tech pulls the read-only /api/portfolio/feed/.
for default_origin in ('https://typbox.me', 'https://www.typbox.me', 'https://rikutomikado.tech'):
    if default_origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(default_origin)

CORS_ALLOW_CREDENTIALS = True

# Automatically allow all onrender.com, typbox.me domains, and local dev ports
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.onrender\.com$",
    r"^https:\/\/(www\.)?typbox\.me$",
    r"^https:\/\/.*\.typbox\.me$",
    r"^http:\/\/localhost:\d+$",
    r"^http:\/\/127\.0\.0\.1:\d+$",
]

csrf_raw = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'https://typbox-dev.onrender.com,https://*.onrender.com,https://typbox.me,https://www.typbox.me,https://*.typbox.me'
)
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_raw.split(',') if origin.strip()]
for default_csrf in (
    'https://typbox.me',
    'https://www.typbox.me',
    'https://*.typbox.me',
):
    if default_csrf not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(default_csrf)


# ==========================================
# Email & Password Reset Configuration
# ==========================================

EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').strip()

# Automatically use SMTP when EMAIL_HOST_USER is configured, otherwise fallback to console output in dev
default_email_backend = (
    'django.core.mail.backends.smtp.EmailBackend'
    if EMAIL_HOST_USER
    else 'django.core.mail.backends.console.EmailBackend'
)
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', default_email_backend)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 'yes')
DEFAULT_FROM_EMAIL = os.getenv(
    'DEFAULT_FROM_EMAIL',
    f'TYPBOX <{EMAIL_HOST_USER}>' if EMAIL_HOST_USER else 'TYPBOX <noreply@typbox.me>'
)
FRONTEND_URL = os.getenv(
    'FRONTEND_URL',
    'http://localhost:5173' if DEBUG else 'https://typbox.me'
).rstrip('/')

# New sign-ups via /api/auth/register/ are closed unless explicitly enabled.
ALLOW_REGISTRATION = os.getenv('ALLOW_REGISTRATION', 'False').lower() in ('true', '1', 'yes')

# Only this user's logs appear in /api/portfolio/feed/ (rikutomikado.tech).
PORTFOLIO_USERNAME = os.getenv('PORTFOLIO_USERNAME', '').strip() or 'rikuto_dev'
# The feed covers the last N days including today, in that user's timezone.
PORTFOLIO_FEED_DAYS = int(os.getenv('PORTFOLIO_FEED_DAYS', '').strip() or '30')

# Password reset token validity in seconds (default: 1 hour)
PASSWORD_RESET_TIMEOUT = int(os.getenv('PASSWORD_RESET_TIMEOUT', '3600'))


# ==========================================
# Production Security Hardening
# ==========================================

if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() == 'true'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True



