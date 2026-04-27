from app.core.logger import logger

class ConfigService:

    def __init__(self):
        self.logger = logger
        

        #DEFAULT CONFIG
        self.default_config = {
            "confidence_threshold": 0.3,
            "followup_limit": 3,
            "min_interval_hours": 24,
            "final_attempt_label": "final",

            "blocked_keywords": [],
            "sensitive_categories": [
                "legal",
                "payment",
                "complaint",
                "verification"
            ]
        }

        self.logger.info("ConfigService initialized")

    def get(self, key, default=None):
        return self.default_config.get(key, default)

    def get_config(self, workspace_id=None):
        # load workspace config
        return self.default_config