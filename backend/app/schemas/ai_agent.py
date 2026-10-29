from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class AgentChannelConfig(BaseModel):
    enabled: bool = False
    config: Optional[Dict[str, Any]] = None


class AgentChannelSettings(BaseModel):
    auto_reply: bool = True
    sync_crm: bool = True
    channel_specific_tone: bool = True
    channel_tones: Optional[Dict[str, str]] = None


class AgentAIConfig(BaseModel):
    provider: str = Field(default="google", description="AI Provider (google, groq)")
    model: str = Field(default="gemini-1.5-flash", description="Model name")
    custom_base_url: Optional[str] = Field(default=None, description="Custom API endpoint base URL")
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=32768)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    response_format: str = Field(default="markdown", description="Response format (markdown, plain_text, json)")
    max_response_time: str = Field(default="normal", description="Response time profile (normal, fast, relaxed)")
    stream_response: bool = False
    structured_output: bool = False
    function_calling: bool = False
    tone: str = Field(default="Friendly & Professional", description="AI tone of voice and persona")
    system_prompt: Optional[str] = Field(default=None, description="Custom system prompt specifying behavior, personality and boundaries")
    example_user_message: Optional[str] = None
    api_key: Optional[str] = Field(default=None, description="Optional custom API key for this agent")


class ValidateKeyRequest(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None
    save_key: Optional[bool] = True


class ValidateKeyResponse(BaseModel):
    valid: bool
    models: List[Dict[str, Any]] = Field(default_factory=list)
    message: str = "Key validated successfully"


class FAQItem(BaseModel):
    id: Optional[str] = None
    question: str
    answer: str


class AgentKnowledgeConfig(BaseModel):
    collection: Optional[str] = Field(None, max_length=100, description="Dedicated vector DB collection tag")
    files: List[Dict[str, Any]] = Field(default_factory=list)
    website_urls: List[str] = Field(default_factory=list)
    faqs: List[Dict[str, Any]] = Field(default_factory=list)
    integrations: List[Dict[str, Any]] = Field(default_factory=list)
    settings: Dict[str, Any] = Field(default_factory=lambda: {
        "use_knowledge_base": True,
        "web_search": False,
    })


class AgentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    agent_type: str = Field(default="sales_assistant")
    avatar_url: Optional[str] = None
    language: str = Field(default="English (India)")
    tone_of_voice: str = Field(default="Friendly & Professional")
    business_name: Optional[str] = None
    website_url: Optional[str] = None
    channels_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    channel_settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    ai_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    knowledge_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_draft: bool = False


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    agent_type: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[str] = None
    tone_of_voice: Optional[str] = None
    business_name: Optional[str] = None
    website_url: Optional[str] = None
    channels_config: Optional[Dict[str, Any]] = None
    channel_settings: Optional[Dict[str, Any]] = None
    ai_config: Optional[Dict[str, Any]] = None
    knowledge_config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    is_draft: Optional[bool] = None


class AgentStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(active|paused|draft)$")


class AgentTestChatRequest(BaseModel):
    agent_id: Optional[str] = None
    channel: str = Field(default="whatsapp")
    message: Optional[str] = Field(default="", max_length=4000)
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    # Optional override for testing directly in draft mode
    draft_config: Optional[Dict[str, Any]] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[str] = None


class AgentTestChatResponse(BaseModel):
    reply: str
    channel: str
    model_used: str
    sources_used: List[str] = Field(default_factory=list)
    execution_time_ms: int = 0
