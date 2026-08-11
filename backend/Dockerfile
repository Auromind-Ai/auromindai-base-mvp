# ==========================================
# STAGE 1: Shared Base Environment
# ==========================================
FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy production requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==========================================
# STAGE 2: Lightweight Application Stage (FastAPI & Celery Beat)
# ==========================================
FROM base AS app

# Copy application code
COPY . .

# Security Hardening: Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/temp_uploads /app/logs && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Default command for API server (overridden in docker-compose for beat)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1

# ==========================================
# STAGE 3: Worker Stage with Playwright/Chromium Scraping Engine
# ==========================================
FROM base AS worker

# Install Playwright & Chromium browser + OS dependencies ONLY for scraping worker
RUN playwright install chromium && \
    playwright install-deps chromium

# Copy application code
COPY . .

# Security Hardening: Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/temp_uploads /app/logs && \
    chown -R appuser:appuser /app
USER appuser

# Default command for worker
CMD celery -A app.core.celery_app worker --loglevel=info --pool=prefork --concurrency=2 -Q default,beat

# ==========================================
# STAGE 4: Security & Quality Checks (CI Target)
# ==========================================
FROM base AS security

# Install system dependencies needed for security scanners
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Gitleaks
RUN curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz | tar -xz -C /usr/local/bin gitleaks

# Install Trivy (auto-fetch latest available release)
RUN TRIVY_VERSION=$(curl -s https://api.github.com/repos/aquasecurity/trivy/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/') && \
    curl -sSfL https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz | tar -xz -C /usr/local/bin trivy

# Install k6
RUN curl -sSfL https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz | tar -xz -C /tmp && \
    mv /tmp/k6-v0.49.0-linux-amd64/k6 /usr/local/bin/k6 && \
    rm -rf /tmp/k6*

# Copy dev requirements and install full dev/security tools
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Copy application code
COPY . .

# Security Hardening: Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/temp_uploads /app/logs && \
    chown -R appuser:appuser /app
USER appuser

# Run local CI script
CMD ["sh", "/app/scripts/local-ci.sh"]
