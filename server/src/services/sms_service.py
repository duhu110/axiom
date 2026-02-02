from typing import Protocol, runtime_checkable

from loguru import logger
from pydantic import BaseModel

from config import settings


class SmsSendResult(BaseModel):
    """短信发送结果"""
    success: bool
    message_id: str | None = None
    error: str | None = None


@runtime_checkable
class SmsProvider(Protocol):
    """短信服务提供商协议"""

    async def send(self, phone_number: str, params: dict[str, str]) -> SmsSendResult:
        ...


class MockSmsProvider:
    """Mock 短信服务提供商（开发/测试用）"""

    async def send(self, phone_number: str, params: dict[str, str]) -> SmsSendResult:
        logger.info(f"[Mock SMS] Sending to {phone_number}: {params}")
        return SmsSendResult(success=True, message_id="mock-msg-id")


class AliyunSmsProvider:
    """阿里云短信服务提供商（占位）"""

    def __init__(self, access_key: str, secret_key: str, sign_name: str, template_code: str):
        self.access_key = access_key
        self.secret_key = secret_key
        self.sign_name = sign_name
        self.template_code = template_code

    async def send(self, phone_number: str, params: dict[str, str]) -> SmsSendResult:
        # TODO: 集成阿里云 SDK
        logger.warning("[Aliyun SMS] Not implemented yet")
        return SmsSendResult(success=False, error="Not implemented")


class SmsService:
    """短信服务"""

    def __init__(self):
        self.config = settings.sms
        self.provider: SmsProvider = self._init_provider()

    def _init_provider(self) -> SmsProvider:
        if self.config.provider == "aliyun":
            return AliyunSmsProvider(
                access_key=self.config.access_key,
                secret_key=self.config.secret_key,
                sign_name=self.config.sign_name,
                template_code=self.config.template_code,
            )
        # 默认使用 Mock
        return MockSmsProvider()

    async def send_verification_code(self, phone_number: str, code: str) -> SmsSendResult:
        """发送验证码"""
        return await self.provider.send(phone_number, {"code": code})


# 全局单例
sms_service = SmsService()
