from app.core.logger import logger


def lead_agent_local(user_id, message):
    logger.warning(
        "lead_agent_local is disabled because it used unsafe process-local conversation state"
    )
    return "This fallback lead agent is disabled in production."


def get_all_conversations():
    return []


def get_messages(user_id):
    return []
