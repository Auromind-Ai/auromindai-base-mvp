"""One-shot script: seed default model configs + disable sonnet/opus if no Anthropic key."""
import os
from app.database import SessionLocal
from app.services.model_config_service import ModelConfigService

db = SessionLocal()
try:
    svc = ModelConfigService(db)
    svc.seed_default_configs()

    # If no Anthropic key is set, disable Claude models so auto mode skips
    # straight to Groq without wasting a retry.
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not anthropic_key:
        from app.models.model_configs import ModelConfig
        db.query(ModelConfig).filter(
            ModelConfig.provider == "claude"
        ).update({"is_active": False})
        db.commit()
        print("No ANTHROPIC_API_KEY found — Claude models disabled.")

    all_configs = svc.get_all_configs()
    print("Current model configs:")
    for c in all_configs:
        print(f"  {c['name']:15s} provider={c['provider']:8s} active={c['is_active']}")
finally:
    db.close()
