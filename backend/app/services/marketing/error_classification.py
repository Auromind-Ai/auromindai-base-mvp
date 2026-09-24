
from typing import Dict, Any, Optional

META_ERROR_CATALOG: Dict[str, Dict[str, Any]] = {
    "131026": {
        "category": "RECIPIENT_UNDELIVERABLE",
        "title": "Recipient cannot receive this message",
        "what_this_means": (
            "WhatsApp was unable to deliver the message to this number. "
            "This usually happens when the phone number is not registered on WhatsApp, "
            "the recipient's device is turned off or has no internet connection for an extended period, "
            "or the recipient has blocked business messaging. "
            "The exact underlying reason may not always be disclosed by Meta to protect user privacy."
        ),
        "what_you_can_do": (
            "Check whether this number is active on WhatsApp before sending again. "
            "You may also reach out to the customer via SMS or phone call to verify their contact details."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "131049": {
        "category": "MARKETING_RECIPIENT_LIMIT",
        "title": "Marketing message limit reached",
        "what_this_means": (
            "Meta limited delivery to protect the WhatsApp user experience. "
            "This recipient has already reached their marketing-message delivery cap set by Meta "
            "to prevent user fatigue and ensure healthy ecosystem engagement."
        ),
        "what_you_can_do": (
            "Do not retry sending the same marketing message immediately. "
            "Try sending at a later date, or switch to an approved Utility or Service template if applicable."
        ),
        "is_retryable": True,
        "severity": "warning",
    },
    "131047": {
        "category": "CUSTOMER_SERVICE_WINDOW_EXPIRED",
        "title": "Customer service window expired",
        "what_this_means": (
            "More than 24 hours have passed since the customer last replied. "
            "Meta requires an approved WhatsApp template message instead of a free-form session message."
        ),
        "what_you_can_do": (
            "Send an approved WhatsApp template message to re-open the 24-hour customer conversation window."
        ),
        "is_retryable": False,
        "severity": "warning",
    },
    "131056": {
        "category": "RECIPIENT_PAIR_RATE_LIMIT",
        "title": "Too many messages sent to recipient too quickly",
        "what_this_means": (
            "WhatsApp temporarily limited messages to this recipient because too many messages were dispatched "
            "to this specific recipient pair in a short period of time."
        ),
        "what_you_can_do": (
            "Slow down message frequency to this number and try again after a few hours."
        ),
        "is_retryable": True,
        "severity": "warning",
    },
    "130429": {
        "category": "THROUGHPUT_RATE_LIMIT",
        "title": "Sending speed limit reached",
        "what_this_means": (
            "Your WhatsApp Business number reached its current message throughput limit (messages per second). "
            "This is an overall account sending throughput constraint, not an individual recipient issue."
        ),
        "what_you_can_do": (
            "Lower the campaign messages-per-minute sending rate. The system will automatically pace and continue when capacity is available."
        ),
        "is_retryable": True,
        "severity": "warning",
    },
    "131009": {
        "category": "INVALID_PARAMETER",
        "title": "Parameter value is invalid",
        "what_this_means": (
            "One or more variable values or parameters supplied in the message template do not match "
            "the expected format, length, or character requirements."
        ),
        "what_you_can_do": (
            "Review your campaign variable mapping and ensure recipient fields (such as name or amounts) do not contain excessive length, empty values, or invalid characters."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "131008": {
        "category": "REQUIRED_PARAMETER_MISSING",
        "title": "Required parameter is missing",
        "what_this_means": (
            "The approved template expects parameters (e.g. {{1}}, {{2}}), but one or more values were not provided."
        ),
        "what_you_can_do": (
            "Verify that every placeholder in the template has a corresponding variable mapped in your audience."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "131051": {
        "category": "UNSUPPORTED_MESSAGE_TYPE",
        "title": "Unsupported message type",
        "what_this_means": (
            "The message type or attachment format is not supported by WhatsApp Business API."
        ),
        "what_you_can_do": (
            "Ensure attachments use supported formats (JPEG, PNG, MP4, PDF) and stay within Meta's file size limits (16MB for audio/video, 100MB for documents)."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "131052": {
        "category": "MEDIA_DOWNLOAD_ERROR",
        "title": "Media download error",
        "what_this_means": (
            "WhatsApp servers were unable to download media from the provided URL."
        ),
        "what_you_can_do": (
            "Ensure the media URL is publicly accessible over HTTPS and does not require private authentication."
        ),
        "is_retryable": True,
        "severity": "error",
    },
    "131053": {
        "category": "MEDIA_UPLOAD_ERROR",
        "title": "Media upload error",
        "what_this_means": (
            "WhatsApp failed to process or store the uploaded media asset."
        ),
        "what_you_can_do": (
            "Verify that the media file is not corrupted and try uploading the file again."
        ),
        "is_retryable": True,
        "severity": "error",
    },
    "132000": {
        "category": "TEMPLATE_NOT_FOUND",
        "title": "Template does not exist",
        "what_this_means": (
            "The template name or language code does not exist in your WhatsApp Business Account."
        ),
        "what_you_can_do": (
            "Verify the template name and language in Meta WhatsApp Manager and synchronize your templates."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "132001": {
        "category": "TEMPLATE_NOT_APPROVED",
        "title": "Template is not approved",
        "what_this_means": (
            "The template has not been approved by Meta yet, or has been paused or rejected."
        ),
        "what_you_can_do": (
            "Check template approval status in WhatsApp Manager. Messages can only be dispatched using APPROVED templates."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "132005": {
        "category": "TEMPLATE_VARIABLE_MISMATCH",
        "title": "Template variable count mismatch",
        "what_this_means": (
            "The number of variable values provided does not match the placeholder count in the template definition."
        ),
        "what_you_can_do": (
            "Ensure the number of values passed exactly matches the template's placeholders."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "130428": {
        "category": "CLOUD_API_RATE_LIMIT",
        "title": "Cloud API rate limit hit",
        "what_this_means": (
            "Your application has temporarily exceeded the Meta Cloud API request rate limit."
        ),
        "what_you_can_do": (
            "The system will automatically back off and retry. Consider lowering the campaign dispatch speed."
        ),
        "is_retryable": True,
        "severity": "warning",
    },
    "131057": {
        "category": "ACCOUNT_RESTRICTED",
        "title": "Account sending restricted",
        "what_this_means": (
            "Your WhatsApp Business phone number has been temporarily restricted due to policy or quality rating violations."
        ),
        "what_you_can_do": (
            "Check WhatsApp Manager quality rating and review Meta policy notifications."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "133010": {
        "category": "PHONE_NUMBER_NOT_REGISTERED",
        "title": "Phone number not registered",
        "what_this_means": (
            "The recipient's phone number is not registered on WhatsApp."
        ),
        "what_you_can_do": (
            "Remove this contact from the campaign audience or verify their active phone number."
        ),
        "is_retryable": False,
        "severity": "error",
    },
    "SKIPPED_INVALID": {
        "category": "INVALID_PHONE_NUMBER",
        "title": "Invalid phone number format",
        "what_this_means": (
            "The phone number is missing a valid country code or has an incorrect number of digits."
        ),
        "what_you_can_do": (
            "Format numbers in standard E.164 format with country code (e.g. +91 98765 43210)."
        ),
        "is_retryable": False,
        "severity": "warning",
    },
    "SKIPPED_OPTED_OUT": {
        "category": "CONTACT_OPTED_OUT",
        "title": "Contact opted out",
        "what_this_means": (
            "The recipient previously requested to unsubscribe or opt out from marketing communications."
        ),
        "what_you_can_do": (
            "Do not contact this recipient for marketing purposes. Respect customer communication preferences."
        ),
        "is_retryable": False,
        "severity": "info",
    },
    "PORTFOLIO_TIER_LIMIT": {
        "category": "PORTFOLIO_DAILY_LIMIT",
        "title": "24-hour portfolio limit reached",
        "what_this_means": (
            "Your Meta WhatsApp Business account reached its daily unique recipient tier limit."
        ),
        "what_you_can_do": (
            "The campaign is paused and will automatically resume once the 24-hour window rolls over."
        ),
        "is_retryable": True,
        "severity": "warning",
    },
}

DEFAULT_ERROR = {
    "category": "GENERAL_DELIVERY_FAILURE",
    "title": "Message delivery failed",
    "what_this_means": (
        "The message could not be delivered to the recipient. "
        "Meta returned an error during transmission or delivery reconciliation."
    ),
    "what_you_can_do": (
        "Check recipient phone number validity and inspect the technical error details before retrying."
    ),
    "is_retryable": True,
    "severity": "error",
}


class ErrorClassificationService:
    @classmethod
    def classify(cls, error_code: Optional[str], raw_message: Optional[str] = None) -> Dict[str, Any]:
        """
        Takes raw error code (and optional message string) and returns complete structured explanation.
        """
        code_str = str(error_code or "").strip().upper()

        # Direct code lookup
        if code_str in META_ERROR_CATALOG:
            data = dict(META_ERROR_CATALOG[code_str])
            data["error_code"] = code_str
            return data

        # Check for textual matches in error message if code is generic (e.g. "FAILED")
        raw_lower = str(raw_message or "").lower()
        if "131049" in raw_lower or "engagement" in raw_lower or "marketing" in raw_lower and "limit" in raw_lower:
            data = dict(META_ERROR_CATALOG["131049"])
            data["error_code"] = "131049"
            return data
        if "131026" in raw_lower or "undeliverable" in raw_lower or "cannot receive" in raw_lower:
            data = dict(META_ERROR_CATALOG["131026"])
            data["error_code"] = "131026"
            return data
        if "131047" in raw_lower or "window" in raw_lower:
            data = dict(META_ERROR_CATALOG["131047"])
            data["error_code"] = "131047"
            return data
        if "rate limit" in raw_lower or "too many" in raw_lower or "131056" in raw_lower:
            data = dict(META_ERROR_CATALOG["131056"])
            data["error_code"] = "131056"
            return data
        if "invalid" in raw_lower and "number" in raw_lower or "skipped_invalid" in raw_lower:
            data = dict(META_ERROR_CATALOG["SKIPPED_INVALID"])
            data["error_code"] = "SKIPPED_INVALID"
            return data
        if "opt_out" in raw_lower or "opted out" in raw_lower:
            data = dict(META_ERROR_CATALOG["SKIPPED_OPTED_OUT"])
            data["error_code"] = "SKIPPED_OPTED_OUT"
            return data

        # Fallback with original message if provided
        data = dict(DEFAULT_ERROR)
        data["error_code"] = code_str or "FAILED"
        if raw_message and raw_message.strip():
            # If the raw message is informative, use it as title or details
            clean_msg = raw_message.split(":")[0].strip()
            if len(clean_msg) < 60 and clean_msg.lower() not in ("failed", "delivery failed", "unknown"):
                data["title"] = clean_msg
        return data
