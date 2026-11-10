# ScholarForge AI - Django API image (used for the web, worker and migrate services)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_MEDIA_ROOT=/app/media

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Collect Django admin / DRF static assets for WhiteNoise. The key is only used for this step.
RUN DJANGO_SECRET_KEY=collectstatic-only-not-a-secret python manage.py collectstatic --noinput

RUN useradd --create-home --uid 1000 scholarforge \
    && mkdir -p /app/media \
    && chown -R scholarforge:scholarforge /app/media
USER scholarforge

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/v1/health/ || exit 1

# Web process. The worker and migrate services override this command in docker-compose.yml.
CMD ["gunicorn", "scholarforge.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120", \
     "--forwarded-allow-ips", "*", \
     "--access-logfile", "-"]
