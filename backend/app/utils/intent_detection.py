import re
from typing import Any
import numpy as np
from app.services.agentic_rag.embedding_service import get_embedding_generator
from app.utils.scoring_config import get_scoring_config

_QUESTION_STARTERS = (
    "what", "how", "when", "where", "which", "can", "could", "do", "does", "is", "are",
    "kya", "kaise", "kab", "kahan", "eppadi", "ethu", "enga"
)

_URGENCY_PATTERNS = [
    "urgent", "asap", "today", "tomorrow", "immediately", "right now", "quickly",
    "by evening", "by morning", "fast", "இன்னைக்கு", "quick",
    "jaldi", "aaj", "kal", "seekiram", "udane", "fast delivery", "today itself"
]

_GREETING_TERMS = {
    "hi", "hello", "hey", "ok", "okay", "yes", "no", "hm", "hmm", "k", "ji", "ha", "haan", "sari"
}

_NEGATIVE_PHRASES = [
    "just checking", "just browsing", "not interested", "nevermind", "forget it",
    "no thanks", "dont want", "don't want", "wrong number", "stop", "unsubscribe",
    "nahi chahiye", "venam", "vendam", "stop message"
]

_CALLBACK_PATTERNS = [
    "call me", "call back", "contact me", "phone call", "talk to human", 
    "talk to support", "baat karo", "baat karna", "contact support", "agent", 
    "connect to agent", "call timing", "call details", "call please", "please call"
]

_DELIVERY_PATTERNS = [
    "delivery", "shipping", "deliver", "cod", "cash on delivery", "courier", 
    "send to", "delivr", "shipp", "delivery charges", "charges to", "speed post",
    "delivery details", "courier charges"
]

_URGENCY_RE = re.compile(r"\b(?:" + r"|".join(re.escape(p) for p in _URGENCY_PATTERNS) + r")\b", re.IGNORECASE)
_NEGATIVE_RE = re.compile(r"\b(?:" + r"|".join(re.escape(p) for p in _NEGATIVE_PHRASES) + r")\b", re.IGNORECASE)
_CALLBACK_RE = re.compile(r"\b(?:" + r"|".join(re.escape(p) for p in _CALLBACK_PATTERNS) + r")\b", re.IGNORECASE)
_DELIVERY_RE = re.compile(r"\b(?:" + r"|".join(re.escape(p) for p in _DELIVERY_PATTERNS) + r")\b", re.IGNORECASE)

_HAS_NUMBER_RE = re.compile(r"\d+")
_SHARED_PHONE_RE = re.compile(r"\b[6-9]\d{9}\b")
_SHARED_PHONE_INTL_RE = re.compile(r"\+\d{10,13}")
_SHARED_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_QUESTION_STARTER_RE = re.compile(r"^(?:" + r"|".join(re.escape(w) for w in _QUESTION_STARTERS) + r")\b", re.IGNORECASE)
_PINCODE_RE = re.compile(r"\b[1-9][0-9]{5}\b")

# PRICING INTENT added for MVP Tanglish/Hinglish structural matching
_PRICING_PATTERNS = [
    "price", "cost", "how much", "rate", "evlo", "evlo price", "enha vilai", "kitna", "kitne ka", "details"
]
_PRICING_RE = re.compile(r"\b(?:" + r"|".join(re.escape(p) for p in _PRICING_PATTERNS) + r")\b", re.IGNORECASE)

# Hybrid conversational intents
_PRICING_INTENT_PATTERNS = [
    r"\bprice\b", r"\bcost\b", r"\bhow much\b", r"\brate\b", r"\bevlo\b", r"\bkitna\b", r"\bkitne ka\b", r"\bwhat price\b", r"\bbest rate\b", r"\bfinal amount\b"
]
_PAYMENT_INTENT_PATTERNS = [
    r"\bhow to pay\b", r"\bgpay\b", r"\bupi\b", r"\bpayment link\b", r"\bpay link\b", r"\bg pay\b", r"\bgoogle pay\b", r"\bphonepe\b", r"\bpaytm\b", r"\bhow can i pay\b", r"\bpayment details\b"
]
_BUDGET_ACCEPTANCE_PATTERNS = [
    r"\bdeal\b", r"\bfine\b", r"\bagreed\b", r"\bdone\b",
    r"\b(?:\d+|[1-9]k)\s*(?:ok|okay|fine|deal|done|agreed)\b",
    r"\b(?:ok|okay|fine|deal|done|agreed)\s*(?:for\s*)?(?:\d+|[1-9]k)\b"
]

_PRICING_INTENT_RE = re.compile("|".join(_PRICING_INTENT_PATTERNS), re.IGNORECASE)
_PAYMENT_INTENT_RE = re.compile("|".join(_PAYMENT_INTENT_PATTERNS), re.IGNORECASE)
_BUDGET_ACCEPTANCE_RE = re.compile("|".join(_BUDGET_ACCEPTANCE_PATTERNS), re.IGNORECASE)

PRICING_SEMANTIC_EXAMPLES = ["how much", "what price", "best rate", "final amount", "price", "cost", "rate", "evlo", "kitna", "kitne ka"]
PAYMENT_SEMANTIC_EXAMPLES = ["how to pay", "gpay", "upi", "payment link", "pay link", "make payment", "send link", "how can i pay"]
BUDGET_SEMANTIC_EXAMPLES = ["6000 okay", "okay for 5k", "deal", "fine", "agreed", "done", "ok", "okay"]

class IntentPrototypeManager:
    def __init__(self):
        self.prototypes = {}
        self.examples_map = {}
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
            
        generator = get_embedding_generator()
        
        self.prototypes["pricing"] = generator.generate_batch_embeddings(PRICING_SEMANTIC_EXAMPLES)
        self.examples_map["pricing"] = PRICING_SEMANTIC_EXAMPLES
        
        self.prototypes["payment"] = generator.generate_batch_embeddings(PAYMENT_SEMANTIC_EXAMPLES)
        self.examples_map["payment"] = PAYMENT_SEMANTIC_EXAMPLES
        
        self.prototypes["budget"] = generator.generate_batch_embeddings(BUDGET_SEMANTIC_EXAMPLES)
        self.examples_map["budget"] = BUDGET_SEMANTIC_EXAMPLES
        
        self._initialized = True

    def check_intent(self, message_embedding: np.ndarray, category: str, threshold: float = 75.0) -> tuple[bool, str, float]:
        if not self._initialized:
            self.initialize()
            
        if category not in self.prototypes:
            return False, "", 0.0
            
        prototypes = self.prototypes[category]
        examples = self.examples_map[category]
        
        # Calculate cosine similarity (embeddings are already normalized)
        similarities = np.dot(prototypes, message_embedding)
        
        best_idx = np.argmax(similarities)
        best_score = float(similarities[best_idx]) * 100.0  # scale to 0-100 to match previous scoring format
        best_match = examples[best_idx]
        
        return best_score >= threshold, best_match, best_score

_intent_manager = IntentPrototypeManager()

def _normalize_text(message: str) -> str:
    # Character normalization: limit repeating characters to 2 max (e.g. evloooo -> evloo), except digits
    text = message.strip()
    text = re.sub(r'([^\d])\1{2,}', r'\1\1', text)
    return text

def _word_tokens(message: str) -> list[str]:
    # Use \w+ for unicode support
    return re.findall(r"\w+", message)

def detect_intent_signals(message: str) -> dict[str, Any]:
    text = _normalize_text(message)
    text_lower = text.lower()

    word_tokens = _word_tokens(text_lower)
    word_count = len(word_tokens)
    message_length = len(text)

    # 1. Pricing intent check
    pricing_intent = bool(_PRICING_INTENT_RE.search(text_lower))
    pricing_score = 100.0 if pricing_intent else 0.0
    pricing_match_ex = ""
    
    # 2. Payment intent check
    payment_intent = bool(_PAYMENT_INTENT_RE.search(text_lower))
    payment_score = 100.0 if payment_intent else 0.0
    payment_match_ex = ""
    
    # 3. Budget acceptance check
    budget_acceptance = bool(_BUDGET_ACCEPTANCE_RE.search(text_lower))
    budget_score = 100.0 if budget_acceptance else 0.0
    budget_match_ex = ""

    # Check semantics using embedding if any of the intents aren't matched by regex
    message_embedding = None
    if not pricing_intent or not payment_intent or not budget_acceptance:
        generator = get_embedding_generator()
        message_embedding = generator.generate_query_embedding(text_lower)

    if not pricing_intent:
        pricing_intent, pricing_match_ex, pricing_score = _intent_manager.check_intent(message_embedding, "pricing")
    
    if not payment_intent:
        payment_intent, payment_match_ex, payment_score = _intent_manager.check_intent(message_embedding, "payment")
        
    if not budget_acceptance:
        budget_acceptance, budget_match_ex, budget_score = _intent_manager.check_intent(message_embedding, "budget")

    # Legacy has_pricing checks or combined checks
    pricing_match = _PRICING_RE.search(text_lower)
    has_pricing = bool(pricing_match) or pricing_intent or payment_intent
    
    pricing_snippet = ""
    if pricing_match:
        pricing_snippet = pricing_match.group(0)
    elif pricing_intent:
        pricing_snippet = pricing_match_ex or "pricing intent"
    elif payment_intent:
        pricing_snippet = payment_match_ex or "payment intent"

    number_match = _HAS_NUMBER_RE.search(text)
    has_number = bool(number_match) or (budget_acceptance and bool(re.search(r"\d+", text)))
    number_snippet = number_match.group(0) if number_match else ""

    urgency_match = _URGENCY_RE.search(text_lower)
    has_urgency = bool(urgency_match)
    urgency_snippet = urgency_match.group(0) if urgency_match else ""

    question_match = _QUESTION_STARTER_RE.search(text_lower)
    has_question = bool(question_match or "?" in text)
    if question_match:
        question_snippet = question_match.group(0)
    elif "?" in text:
        question_snippet = "?"
    else:
        question_snippet = ""

    phone_match = _SHARED_PHONE_RE.search(text)
    phone_intl_match = _SHARED_PHONE_INTL_RE.search(text)
    email_match = _SHARED_EMAIL_RE.search(text)
    shared_contact = bool(phone_match or phone_intl_match or email_match)
    if phone_match:
        contact_snippet = phone_match.group(0)
    elif phone_intl_match:
        contact_snippet = phone_intl_match.group(0)
    elif email_match:
        contact_snippet = email_match.group(0)
    else:
        contact_snippet = ""

    callback_match = _CALLBACK_RE.search(text_lower)
    callback_request = bool(callback_match)
    callback_snippet = callback_match.group(0) if callback_match else ""

    pincode_match = _PINCODE_RE.search(text)
    pincode_shared = bool(pincode_match)
    pincode_snippet = pincode_match.group(0) if pincode_shared else ""

    delivery_match = _DELIVERY_RE.search(text_lower)
    delivery_interest = bool(delivery_match)
    delivery_snippet = delivery_match.group(0) if delivery_interest else ""

    negative_match = _NEGATIVE_RE.search(text_lower)
    negative_intent = bool(negative_match)
    negative_snippet = negative_match.group(0) if negative_intent else ""

    is_vague = (
        word_count < 5
        and not has_number
        and not has_question
        and not has_pricing
        and not callback_request
        and not pincode_shared
        and not delivery_interest
        and word_count > 0
        and all(token in _GREETING_TERMS for token in word_tokens)
    )

    signal_count = sum(
        bool(value)
        for value in (has_number, has_urgency, has_question, has_pricing, shared_contact, callback_request, pincode_shared, delivery_interest, negative_intent, pricing_intent, payment_intent, budget_acceptance)
    )
    is_specific = word_count > 30 or signal_count >= 2

    if word_count > 30:
        is_specific = True
        is_vague = False

    if is_vague and is_specific:
        is_specific = False

    cfg = get_scoring_config()
    weights = cfg.get_weights()

    active_signals = {
        "has_pricing"      : has_pricing,
        "callback_request" : callback_request,
        "shared_contact"   : shared_contact,
        "has_number"       : has_number,
        "has_urgency"      : has_urgency,
        "has_question"     : has_question,
        "pincode_shared"   : pincode_shared,
        "delivery_interest": delivery_interest,
        "is_specific"      : is_specific,
        "is_vague"         : is_vague,
        "pricing_intent"   : pricing_intent,
        "payment_intent"   : payment_intent,
        "budget_acceptance": budget_acceptance,
    }

    if negative_intent:
        semantic_intent_score = cfg.get_cap("intent_min")
    else:
        semantic_intent_score = sum(
            weights.get(signal, 0)
            for signal, is_active in active_signals.items()
            if is_active
        )
        semantic_intent_score = max(
            min(semantic_intent_score, cfg.get_cap("intent_max")),
            cfg.get_cap("intent_min")
        )

    return {
        "signals": {
            "has_number": {
                "value": has_number,
                "snippet": number_snippet,
                "explanation": "Budget mentioned",
                "reasoning": f"Numeric pattern matched: '{number_snippet}'" if has_number else ""
            },
            "has_urgency": {
                "value": has_urgency,
                "snippet": urgency_snippet,
                "explanation": "Urgency detected",
                "reasoning": f"Urgency keyword matched: '{urgency_snippet}'" if has_urgency else ""
            },
            "has_question": {
                "value": has_question,
                "snippet": question_snippet,
                "explanation": "Asked a clear question",
                "reasoning": f"Question phrase matched: '{question_snippet}'" if has_question else ""
            },
            "has_pricing": {
                "value": has_pricing,
                "snippet": pricing_snippet,
                "explanation": "Pricing/budget inquiry",
                "reasoning": f"Pricing/budget term matched: '{pricing_snippet}'" if has_pricing else ""
            },
            "shared_contact": {
                "value": shared_contact,
                "snippet": contact_snippet,
                "explanation": "Shared contact details",
                "reasoning": f"Contact info matched: '{contact_snippet}'" if shared_contact else ""
            },
            "callback_request": {
                "value": callback_request,
                "snippet": callback_snippet,
                "explanation": "Callback request",
                "reasoning": f"Callback phrasing matched: '{callback_snippet}'" if callback_request else ""
            },
            "pincode_shared": {
                "value": pincode_shared,
                "snippet": pincode_snippet,
                "explanation": "Pincode shared",
                "reasoning": f"PIN code detected: '{pincode_snippet}'" if pincode_shared else ""
            },
            "delivery_interest": {
                "value": delivery_interest,
                "snippet": delivery_snippet,
                "explanation": "Delivery interest",
                "reasoning": f"Delivery keyword matched: '{delivery_snippet}'" if delivery_interest else ""
            },
            "is_specific": {
                "value": is_specific,
                "snippet": text[:40] + "..." if len(text) > 40 else text,
                "explanation": "Specific query details",
                "reasoning": f"Long detailed query ({word_count} words)" if is_specific else ""
            },
            "is_vague": {
                "value": is_vague,
                "snippet": text,
                "explanation": "Vague greeting",
                "reasoning": "Message contains only brief greetings" if is_vague else ""
            },
            "negative_intent": {
                "value": negative_intent,
                "snippet": negative_snippet,
                "explanation": "Negative intent expressed",
                "reasoning": f"Negative expression matched: '{negative_snippet}'" if negative_intent else ""
            },
            "pricing_intent": {
                "value": pricing_intent,
                "snippet": pricing_match_ex if pricing_match_ex else ("Regex matched" if pricing_intent else ""),
                "explanation": "Pricing intent detected",
                "reasoning": f"Fuzzy matched pricing: '{pricing_match_ex}' (score={pricing_score:.1f})" if pricing_match_ex else ("Pricing regex matched" if pricing_intent else "")
            },
            "payment_intent": {
                "value": payment_intent,
                "snippet": payment_match_ex if payment_match_ex else ("Regex matched" if payment_intent else ""),
                "explanation": "Payment intent detected",
                "reasoning": f"Fuzzy matched payment: '{payment_match_ex}' (score={payment_score:.1f})" if payment_match_ex else ("Payment regex matched" if payment_intent else "")
            },
            "budget_acceptance": {
                "value": budget_acceptance,
                "snippet": budget_match_ex if budget_match_ex else ("Regex matched" if budget_acceptance else ""),
                "explanation": "Budget acceptance detected",
                "reasoning": f"Fuzzy matched budget acceptance: '{budget_match_ex}' (score={budget_score:.1f})" if budget_match_ex else ("Budget acceptance regex matched" if budget_acceptance else "")
            }
        },
        "semantic_intent_score": semantic_intent_score,
        "word_count": word_count,
        "message_length": message_length,
    }
