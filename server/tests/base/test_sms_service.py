import pytest
from unittest.mock import patch
from services.sms_service import SmsService, MockSmsProvider, AliyunSmsProvider

@pytest.mark.asyncio
async def test_mock_provider_send():
    """测试 Mock 提供商发送短信"""
    
    # 确保配置为 mock
    with patch("config.settings.sms.provider", "mock"):
        service = SmsService()
        assert isinstance(service.provider, MockSmsProvider)
        
        result = await service.send_verification_code("13800138000", "123456")
        assert result.success
        assert result.message_id == "mock-msg-id"

@pytest.mark.asyncio
async def test_aliyun_provider_init():
    """测试阿里云提供商初始化"""
    
    with patch("config.settings.sms.provider", "aliyun"):
        service = SmsService()
        assert isinstance(service.provider, AliyunSmsProvider)
