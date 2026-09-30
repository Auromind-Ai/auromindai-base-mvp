"""Run billing regressions against disposable memory DB with external network blocked.
Usage: python tests/run_member_billing_checks.py [additional pytest options]
"""
import os
import sys
import socket
import inspect
from pathlib import Path
from unittest.mock import patch

backend = Path(__file__).resolve().parents[1]
os.chdir(backend)
sys.path.insert(0, str(backend))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "testing"
os.environ["REDIS_URL"] = "redis://127.0.0.1:1/0"

original_connect = socket.socket.connect

def isolated_connect(sock, address):
    # Windows asyncio uses a local socketpair to wake its event loop.
    caller = inspect.currentframe().f_back
    if caller.f_code.co_name == "socketpair" and caller.f_globals.get("__name__") == "socket":
        return original_connect(sock, address)
    raise OSError("External network disabled for billing tests")

if __name__ == "__main__":
    import pytest
    import faulthandler
    faulthandler.dump_traceback_later(30, repeat=True)
    files = [
        "tests/unit/test_member_workspace_billing.py",
        "tests/unit/test_wcc_e2e_messaging_deduction.py",
        "tests/unit/test_campaign_engine.py",
        "tests/unit/test_credit_canonical_accounting.py",
        "tests/unit/test_ai_chat_workspace_selection.py",
        "tests/unit/test_workspace_access_regressions.py",
        "tests/unit/test_page_feature_access.py",
    ]
    with patch.object(socket.socket, "connect", isolated_connect):
        raise SystemExit(pytest.main(["--noconftest", *files, "-q", "--tb=short", "--disable-warnings", *sys.argv[1:]]))
