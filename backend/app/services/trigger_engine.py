import difflib
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional


_MULTISPACE_RE = re.compile(r"\s+")


@dataclass
class TriggerMatchResult:
    matched: bool
    match_type: str
    matched_keyword: Optional[str] = None
    confidence: float = 0.0


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""

    chars: list[str] = []
    for char in value.lower():
        category = unicodedata.category(char)
        if category.startswith("So") or category.startswith("Cs"):
            continue
        if category.startswith("P"):
            chars.append(" ")
            continue
        chars.append(char)

    normalized = "".join(chars)
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = _MULTISPACE_RE.sub(" ", normalized).strip()
    return normalized


def _sequence_ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(a=a, b=b).ratio()


def _word_set(value: str) -> set[str]:
    return {part for part in value.split(" ") if part}


def _iter_keywords(keywords: Iterable[str]) -> list[str]:
    return [normalize_text(keyword) for keyword in keywords if normalize_text(keyword)]


def match_trigger(
    trigger_node: Dict[str, Any],
    *,
    event: str,
    message: Optional[str],
    fuzzy_threshold: float = 0.82,
) -> TriggerMatchResult:
    config = trigger_node.get("config", {})
    if config.get("event") != event:
        return TriggerMatchResult(False, config.get("match_type", "word_match"))

    keywords = _iter_keywords(config.get("keywords", []))
    if event == "msg_recv" and not keywords:
        return TriggerMatchResult(False, config.get("match_type", "word_match"))

    normalized_message = normalize_text(message)
    match_type = config.get("match_type", "word_match")

    if match_type == "exact":
        for keyword in keywords:
            if normalized_message == keyword:
                return TriggerMatchResult(True, "exact", keyword, 1.0)
        return TriggerMatchResult(False, "exact")

    if match_type == "contains":
        for keyword in keywords:
            if keyword and keyword in normalized_message:
                return TriggerMatchResult(True, "contains", keyword, 0.95)
        return TriggerMatchResult(False, "contains")

    if match_type == "word_match":
        words = _word_set(normalized_message)
        for keyword in keywords:
            keyword_words = _word_set(keyword)
            if keyword_words and keyword_words.issubset(words):
                return TriggerMatchResult(True, "word_match", keyword, 0.9)
        return TriggerMatchResult(False, "word_match")

    if match_type == "fuzzy":
        best_keyword = None
        best_score = 0.0
        for keyword in keywords:
            score = max(
                _sequence_ratio(normalized_message, keyword),
                max((_sequence_ratio(word, keyword) for word in _word_set(normalized_message)), default=0.0),
            )
            if score > best_score:
                best_score = score
                best_keyword = keyword
        return TriggerMatchResult(best_score >= fuzzy_threshold, "fuzzy", best_keyword, best_score)

    return TriggerMatchResult(False, match_type)


def match_button_target(
    buttons: list[Dict[str, Any]],
    *,
    inbound_text: Optional[str],
    interactive_value: Optional[str],
    interactive_label: Optional[str],
    fuzzy_threshold: float = 0.78,
) -> Optional[Dict[str, Any]]:
    normalized_value = normalize_text(interactive_value)
    normalized_label = normalize_text(interactive_label)
    normalized_text = normalize_text(inbound_text)

    for button in buttons:
        if normalize_text(button.get("value")) == normalized_value and normalized_value:
            return button

    for button in buttons:
        if normalize_text(button.get("label")) == normalized_label and normalized_label:
            return button

    best_button = None
    best_score = 0.0
    for button in buttons:
        button_label = normalize_text(button.get("label"))
        button_value = normalize_text(button.get("value"))
        score = max(
            _sequence_ratio(normalized_text, button_label),
            _sequence_ratio(normalized_text, button_value),
            1.0 if button_label and button_label in normalized_text else 0.0,
            1.0 if button_value and button_value in normalized_text else 0.0,
        )
        if score > best_score:
            best_score = score
            best_button = button

    if best_button and best_score >= fuzzy_threshold:
        return best_button
    return None
