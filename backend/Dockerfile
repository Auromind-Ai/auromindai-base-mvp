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

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==========================================
# STAGE 2: Main Backend Application
# ==========================================
FROM base AS app

# Install Playwright
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY . .

# Security Hardening: Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/temp_uploads /app/logs && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run uvicorn server
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1

# ==========================================
# STAGE 3: Security & Quality Checks (CI)
# ==========================================
FROM base AS security

# Install system dependencies needed for security scanners
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Gitleaks
RUN curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz | tar -xz -C /usr/local/bin gitleaks

# Install Trivy
RUN curl -sSfL https://github.com/aquasecurity/trivy/releases/download/v0.69.3/trivy_0.69.3_Linux-64bit.tar.gz | tar -xz -C /usr/local/bin trivy

# Install k6
RUN curl -sSfL https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz | tar -xz -C /tmp && \
    mv /tmp/k6-v0.49.0-linux-amd64/k6 /usr/local/bin/k6 && \
    rm -rf /tmp/k6*

# Install additional security dependencies
RUN pip install --no-cache-dir ruff mypy bandit pip-audit pytest-cov requests

# Copy application code
COPY . .

# Security Hardening: Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/temp_uploads /app/logs && \
    chown -R appuser:appuser /app
USER appuser

# Run local CI script
CMD ["sh", "/app/scripts/local-ci.sh"]
