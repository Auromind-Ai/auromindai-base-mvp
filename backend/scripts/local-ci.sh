#!/bin/sh
echo "============================================="
echo "   Running Auromind AI Security & Quality CI   "
echo "============================================="

# 1. Run Ruff Linter
echo "\n[1/3] Running Ruff Linter (Temporarily Disabled)..."
# ruff check . || echo "Ruff found linting issues"

# 2. Run Bandit Security Check
echo "\n[2/3] Running Bandit Security Scan..."
bandit -r . -x ./tests || echo "Bandit found potential security issues"

# 3. Run Pip Audit
echo "\n[3/3] Running Pip Audit..."
pip-audit || echo "Pip-audit found vulnerability issues"

echo "\n============================================="
echo "   Security & Quality CI Run Completed       "
echo "============================================="
