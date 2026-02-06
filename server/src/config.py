from pydantic import BaseModel
from pydantic_settings import BaseSettings


class DatabaseConfig(BaseModel):
    """数据库配置"""
    # 端口修正为 5432 (docker-compose 映射端口)
    uri_app: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/axiom_app"
    uri_kb: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/axiom_kb"
    uri_agent: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/axiom_agent"
    echo: bool = False
    pool_size: int = 10
    max_overflow: int = 20


class LoggingConfig(BaseModel):
    """日志配置"""
    level: str = "INFO"
    json_format: bool = False
    file_path: str = "logs/server.log"
    rotation: str = "500 MB"
    retention: str = "10 days"


class StorageConfig(BaseModel):
    """存储配置"""
    # MinIO API 端口通常为 9000
    rustfs_endpoint: str = "localhost:9000"
    bucket_name: str = "axiom"
    access_key: str = "axiom"
    secret_key: str = "axiom123"
    secure: bool = False  # 是否使用 HTTPS


class DocConfig(BaseModel):
    """文档配置"""
    enabled: bool = True
    url_prefix: str = "/docs"


class AuthConfig(BaseModel):
    """认证配置"""
    secret_key: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # Default for dev
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7


class SmsConfig(BaseModel):
    """短信服务配置"""
    provider: str = "mock"  # mock, aliyun, tencent
    access_key: str = ""
    secret_key: str = ""
    sign_name: str = ""
    template_code: str = ""


class AgentConfig(BaseModel):
    """Agent 配置"""
    openai_api_key: str = ""  # 请在此处填入 Key
    model: str = "gpt-4o"
    # DeepSeek 配置
    deepseek_api_key: str = "sk-69fb5637b84b4934a0c1be8e18f23643"
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_think_model: str = "deepseek-reasoner"


class KBConfig(BaseModel):
    """知识库配置"""
    embedding_model: str = "BAAI/bge-small-zh-v1.5"
    # 使用绝对路径，确保 Celery Worker 和 FastAPI 使用同一个缓存目录
    embedding_cache_dir: str = "D:/project/FullStack/axiom/server/models"
    chunk_size: int = 500
    chunk_overlap: int = 50


class CeleryConfig(BaseModel):
    """Celery 配置"""
    broker_url: str = "redis://localhost:6379/0"
    result_backend: str = "redis://localhost:6379/0"
    task_serializer: str = "json"
    result_serializer: str = "json"


class Settings(BaseSettings):
    """全局配置"""
    app_name: str = "Axiom Server"
    env: str = "dev"
    timezone: str = "Asia/Shanghai"

    db: DatabaseConfig = DatabaseConfig()
    log: LoggingConfig = LoggingConfig()
    storage: StorageConfig = StorageConfig()
    doc: DocConfig = DocConfig()
    auth: AuthConfig = AuthConfig()
    sms: SmsConfig = SmsConfig()
    agent: AgentConfig = AgentConfig()
    kb: KBConfig = KBConfig()
    celery: CeleryConfig = CeleryConfig()


settings = Settings()
