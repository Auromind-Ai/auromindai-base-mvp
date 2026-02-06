import os
import subprocess
import sys

# Shared Team Configuration
ENV_CONTENT = """DATABASE_URL=postgresql://54674d3e1d0e411ba46e33e704bf13ed74fab9e911c34e6b1c569e07097bc3b8:sk_pPZlQuZROizt_ZNqg2p0Y@db.prisma.io:5432/postgres?sslmode=require
GROQ_API_KEY=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
GOOGLE_API_KEY=
FRONTEND_URL=http://localhost:3000
SECRET_KEY=change_me_locally
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
"""

def main():
    print("🚀 Starting AuroMind Developer Setup...")

    # 1. Update Code from GitHub
    print("\n⬇️  Pulling latest code from GitHub...")
    try:
        subprocess.check_call(["git", "pull", "origin", "main"])
        print("   ✅ Code updated.")
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

    # 2. Install Dependencies
    print("\n📦 Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("   ✅ Dependencies installed.")
    except subprocess.CalledProcessError:
        print("   ❌ Failed to install dependencies. Please run 'pip install -r requirements.txt' manually.")

    print("\n🎉 Setup Complete!")
    print("   👉 Run the app with: uvicorn app.main:app --reload --port 8000")

if __name__ == "__main__":
    main()
