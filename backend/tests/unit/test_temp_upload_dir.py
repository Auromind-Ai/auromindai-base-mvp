import os
import unittest
from unittest.mock import patch, mock_open
from app.routers.brain import get_temp_upload_dir

def test_get_temp_upload_dir_success():
    # Test that the default directory is returned when it is fully writable
    with patch("os.makedirs") as mock_makedirs, \
         patch("builtins.open", mock_open()) as mock_file, \
         patch("os.remove") as mock_remove:
        
        res = get_temp_upload_dir()
        assert "temp_uploads" in res

def test_get_temp_upload_dir_fallback():
    # Test that the helper falls back to the system temp directory when default is not writable
    with patch("os.makedirs") as mock_makedirs, \
         patch("builtins.open", side_effect=PermissionError("Permission Denied")), \
         patch("tempfile.gettempdir", return_value="/custom_tmp"):
        
        res = get_temp_upload_dir()
        assert "/custom_tmp" in res
