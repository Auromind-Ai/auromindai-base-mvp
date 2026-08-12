from unittest.mock import MagicMock, patch
from app.services.inbox_agents.instagram_service import InstagramService
from app.services.inbox.channel_service import ChannelService
from app.models.workspace import Workspace

def test_instagram_service_send_interactive_quick_replies():
    service = InstagramService(access_token="fake_token", page_id="123456")
    
    with patch("requests.post") as mock_post:
        mock_post.return_value.json.return_value = {"recipient_id": "999", "message_id": "mid.123"}
        
        buttons = [
            {"label": "step1", "value": "step1"},
            {"label": "Option 2", "value": "Option 2"}
        ]
        res = service.send_interactive_buttons("999", "welcome", buttons)
        
        assert res == {"recipient_id": "999", "message_id": "mid.123"}
        mock_post.assert_called_once()
        
        _, kwargs = mock_post.call_args
        payload = kwargs["json"]
        assert payload["recipient"]["id"] == "999"
        assert payload["message"]["text"] == "welcome"
        assert len(payload["message"]["quick_replies"]) == 2
        assert payload["message"]["quick_replies"][0]["title"] == "step1"
        assert payload["message"]["quick_replies"][0]["payload"] == "step1"
        assert payload["message"]["quick_replies"][1]["title"] == "Option 2"

def test_channel_service_send_instagram_buttons():
    workspace = MagicMock(spec=Workspace)
    workspace.meta_access_token = "fake_token"
    workspace.meta_business_id = "123456"
    
    metadata = {
        "buttons": [
            {"label": "step1", "value": "step1"},
            {"label": "Option 2", "value": "Option 2"}
        ]
    }
    
    with patch.object(InstagramService, "send_interactive_buttons") as mock_send_interactive:
        mock_send_interactive.return_value = {"recipient_id": "999", "message_id": "mid.456"}
        
        msg_id = ChannelService._send_instagram_message(
            workspace=workspace,
            recipient_id="999",
            body="welcome",
            metadata=metadata
        )
        
        assert msg_id == "mid.456"
        mock_send_interactive.assert_called_once_with("999", "welcome", metadata["buttons"])
