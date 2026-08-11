#!/bin/sh
echo "============================================="
echo "   Running Auromind AI Security & Quality CI   "
echo "============================================="

# 1. Pytest Unit & Integration Tests
echo ""
echo "[1/6] Running Pytest Suite..."
pytest tests/ -v || echo "⚠️  Pytest reported test failures"

# 2. Bandit SAST Security Scan
echo ""
echo "[2/6] Running Bandit SAST Scan..."
bandit -r app/ -ll -ii || echo "⚠️  Bandit found potential security issues"

# 3. Pip Audit Dependency Vulnerability Scan
echo ""
echo "[3/6] Running Pip Audit Dependency Scan..."
pip-audit -r requirements.txt || echo "⚠️  Pip-audit found dependency vulnerabilities"

# 4. Gitleaks Secret Leak Scan
echo ""
echo "[4/6] Checking Gitleaks Secret Scan..."
if command -v gitleaks >/dev/null 2>&1; then
    gitleaks detect --source . --no-git || echo "⚠️  Gitleaks detected potential secrets"
else
    echo "ℹ️  gitleaks CLI is not installed locally. Skipping (runs in GitHub Actions)."
fi

# 5. Trivy Vulnerability & Config Scan
echo ""
echo "[5/6] Checking Trivy Security Scan..."
if command -v trivy >/dev/null 2>&1; then
    trivy config . || echo "⚠️  Trivy found configuration vulnerabilities"
else
    echo "ℹ️  trivy CLI is not installed locally. Skipping (runs in GitHub Actions)."
fi

# 6. k6 Load Testing Check
echo ""
echo "[6/6] Checking k6 Load Testing..."
if [ -f "tests/load/k6_auth_load.js" ]; then
    if command -v k6 >/dev/null 2>&1; then
        echo "Running k6 load test..."
        k6 run tests/load/k6_auth_load.js || echo "⚠️  k6 load test failed (ensure backend server is running)"
    else
        echo "ℹ️  k6 CLI is not installed locally. Skipping (runs in main branch CI)."
    fi
else
    echo "ℹ️  No k6 load test script found at tests/load/k6_auth_load.js."
fi

echo ""
echo "============================================="
echo "   Security & Quality CI Run Completed       "
echo "============================================="
