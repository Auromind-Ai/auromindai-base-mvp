# 🚀 Developer Setup Guide

## 1. One-Click Setup 🚀
Run this command from the root folder:
```bash
python3 backend/setup_dev.py
```
*   ✅ Creates your `.env` file automatically (with Shared Cloud DB & Keys).
*   ✅ Installs all required libraries (`pip install`).
*   ✅ Verifies the connection to the Cloud Database.

## 2. Run the Server
## 3. Run the Server
```bash
uvicorn app.main:app --reload --port 8000
```
