MODEL_CONFIGS = {
    "sonnet": {
        "provider": "claude",
        "model": "claude-3-sonnet-20240229",
        "temperature": 0.7,
        "max_tokens": 800
    },
    "opus": {
        "provider": "claude",
        "model": "claude-3-opus-20240229",
        "temperature": 0.6,
        "max_tokens": 1200
    },
    "groq": {
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "temperature": 0.8,
        "max_tokens": 500
    },
    "gemini_flash": {
        "provider": "gemini",
        "model": "gemini-1.5-flash",
        "temperature": 0.7,
        "max_tokens": 600
    }
}