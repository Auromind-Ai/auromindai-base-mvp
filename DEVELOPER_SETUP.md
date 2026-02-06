

## 1. One-Click Setup 
Run this command from the root folder:
```bash
python3 backend/setup_dev.py
```
*   ✅ **Auto-Updates** your code (runs `git pull` for you).
*   ✅ Creates your `.env` file automatically (with Shared Cloud DB & Keys).
*   ✅ Installs all required libraries (`pip install`).
*   ✅ Verifies the connection to the Cloud Database.

## 2. Run the Server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

## 3. How to Submit Code 📝
**Do NOT push directly to `main`.** 



1.  **Create YOUR Branch** (name it after what you are building):
    ```bash
    git checkout -b feature-my-new-login-page
    ```
2.  **Make Changes & Push:**
    ```bash
    git add .
    git commit -m "Added login page"
    git push origin feature-my-new-login-page
    ```
3.  **Go to GitHub:** Click **"Create Pull Request"**.
    *   **YOU** (the developer) create this request.
    *   **The Team Lead** will review and merge it.
