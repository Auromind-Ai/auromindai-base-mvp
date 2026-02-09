import os
import subprocess
import sys

# Shared Team Configuration
# Default to Localhost for Developer Safety (Hybrid Strategy)
ENV_CONTENT = """DATABASE_URL=postgresql://auromind:auromind@localhost:5432/auromind
GROQ_API_KEY=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
GOOGLE_API_KEY=
FRONTEND_URL=http://localhost:3000
SECRET_KEY=change_me_locally
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google OAuth Configuration (Add your credentials here)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback
"""

def main():
    print("🚀 Starting AuroMind Developer Setup...")

    # 1. Update Code from GitHub
    print("\n⬇️  Pulling latest code from GitHub...")
    try:
        # Fetch all branches
        subprocess.check_call(["git", "fetch", "origin"])
        # Switch to feature branch
        subprocess.check_call(["git", "checkout", "feature/unified-rag-ingestion"])
        # Pull latest changes
        subprocess.check_call(["git", "pull", "origin", "feature/unified-rag-ingestion"])
        print("   ✅ Code updated from feature/unified-rag-ingestion branch.")
    except Exception as e:
        print(f"   ⚠️  Could not pull code (you might have local changes or no git). Error: {e}")
        print("   👉 Continuing with setup...")

    # 2. Create .env file
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        print(f"📝 Creating .env file at {env_path}...")
        with open(env_path, "w") as f:
            f.write(ENV_CONTENT)
        print("   ✅ .env created with shared Cloud DB credentials.")
    else:
        print("   ℹ️  .env file already exists. Skipping creation.")

    # 3. Install Dependencies
    print("\n📦 Installing Python dependencies...")
    # Ensure we look for requirements.txt in the same folder as this script
    req_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_path])
        print("   ✅ Dependencies installed.")
    except subprocess.CalledProcessError:
        print("   ❌ Failed to install dependencies.")

    # 4. Run Database Migrations
    print("\n🗄️  Running database migrations...")
    migration_script = os.path.join(os.path.dirname(__file__), "app", "scripts", "create_integrations_table.py")
    if os.path.exists(migration_script):
        try:
            subprocess.check_call([sys.executable, migration_script])
            print("   ✅ Database migrations completed.")
        except subprocess.CalledProcessError:
            print("   ⚠️  Migration failed (table might already exist).")
    else:
        print("   ℹ️  No migration script found, skipping...")

    print("\n🎉 Setup Complete!")
    print("   👉 Configure Google OAuth:")
    print("      1. Go to https://console.cloud.google.com/")
    print("      2. Create OAuth 2.0 credentials")
    print("      3. Add credentials to backend/.env")
    print("")
    print("   👉 Run the app:")
    print("      cd backend") 
    print("      uvicorn app.main:app --reload --port 8000")

if __name__ == "__main__":
    main()
