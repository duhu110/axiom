import pytest
from config import settings

def test_settings_has_required_fields():
    """配置对象包含必需字段和分组。"""
    
    # 验证顶层字段
    assert hasattr(settings, "app_name")
    assert hasattr(settings, "env")
    assert hasattr(settings, "timezone")
    
    # 验证分组存在
    assert hasattr(settings, "db")
    assert hasattr(settings, "log")
    assert hasattr(settings, "storage")
    assert hasattr(settings, "doc")

    # 验证数据库配置
    assert hasattr(settings.db, "uri_app")
    assert hasattr(settings.db, "uri_kb")
    assert hasattr(settings.db, "uri_agent")
    assert isinstance(settings.db.uri_app, str)
    assert isinstance(settings.db.pool_size, int)

    # 验证日志配置
    assert hasattr(settings.log, "level")
    assert hasattr(settings.log, "json_format")
    
    # 验证存储配置
    assert hasattr(settings.storage, "rustfs_endpoint")
    assert hasattr(settings.storage, "bucket_name")
    
    # 验证文档配置
    assert hasattr(settings.doc, "enabled")
