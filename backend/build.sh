#!/usr/bin/env bash
# ==========================================
# Render Deployment Build Script for Django
# ==========================================
set -o errexit

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Collect static files via WhiteNoise
python manage.py collectstatic --no-input

# Run database migrations
python manage.py migrate
