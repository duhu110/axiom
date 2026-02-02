import importlib
import pytest
import database

def test_sync_engine_creation():
    """同步引擎可创建且可用。"""
    if importlib.util.find_spec("sqlalchemy") is None:
        pytest.skip("sqlalchemy 未安装")

    engine = database.get_engine("sqlite+pysqlite:///:memory:")
    assert engine is not None
    assert "sqlite" in str(engine.url)

def test_sync_session_dependency():
    """同步 Session 依赖可用。"""
    if importlib.util.find_spec("sqlalchemy") is None:
        pytest.skip("sqlalchemy 未安装")

    session_generator = database.get_session("sqlite+pysqlite:///:memory:")
    session = next(session_generator)
    assert session is not None
    session.close()
