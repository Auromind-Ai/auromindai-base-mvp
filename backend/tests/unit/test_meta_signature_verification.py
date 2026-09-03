import hmac
import hashlib
import pytest
from app.services.inbox.webhook_service import WebhookService


def test_verify_meta_signature_single_valid():
    secret = "test_meta_secret_12345"
    raw_body = b'{"object": "instagram", "entry": []}'
    signature = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    header = f"sha256={signature}"

    assert WebhookService.verify_meta_signature(raw_body, header, secret) is True


def test_verify_meta_signature_single_invalid():
    secret = "test_meta_secret_12345"
    raw_body = b'{"object": "instagram", "entry": []}'
    header = "sha256=wrong_signature_1234567890abcdef1234567890abcdef1234567890abcdef1234"

    assert WebhookService.verify_meta_signature(raw_body, header, secret) is False


def test_verify_meta_signature_candidate_secrets_matching_first():
    secret_ig = "ig_secret_alpha"
    secret_meta = "meta_secret_beta"
    raw_body = b'{"object": "instagram", "entry": [{"id": "123"}]}'
    signature = hmac.new(secret_ig.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    header = f"sha256={signature}"

    assert WebhookService.verify_meta_signature(raw_body, header, [secret_ig, secret_meta]) is True


def test_verify_meta_signature_candidate_secrets_matching_second():
    secret_ig = "ig_secret_alpha"
    secret_meta = "meta_secret_beta"
    raw_body = b'{"object": "instagram", "entry": [{"id": "123"}]}'
    signature = hmac.new(secret_meta.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    header = f"sha256={signature}"

    assert WebhookService.verify_meta_signature(raw_body, header, [secret_ig, secret_meta]) is True


def test_verify_meta_signature_candidate_secrets_none_matching():
    secret_ig = "ig_secret_alpha"
    secret_meta = "meta_secret_beta"
    raw_body = b'{"object": "instagram", "entry": [{"id": "123"}]}'
    signature = hmac.new(b"another_unknown_secret", raw_body, hashlib.sha256).hexdigest()
    header = f"sha256={signature}"

    assert WebhookService.verify_meta_signature(raw_body, header, [secret_ig, secret_meta]) is False


def test_verify_meta_signature_missing_secret():
    raw_body = b'{"object": "instagram"}'
    header = "sha256=anything"

    assert WebhookService.verify_meta_signature(raw_body, header, None) is True
    assert WebhookService.verify_meta_signature(raw_body, header, []) is True


def test_verify_meta_signature_missing_header():
    secret = "test_secret"
    raw_body = b'{"object": "instagram"}'

    assert WebhookService.verify_meta_signature(raw_body, None, secret) is False


def test_verify_meta_signature_invalid_format():
    secret = "test_secret"
    raw_body = b'{"object": "instagram"}'
    header = "invalid_format_without_sha256_prefix"

    assert WebhookService.verify_meta_signature(raw_body, header, secret) is False
