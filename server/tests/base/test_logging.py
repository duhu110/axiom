import logging
import pytest

def test_init_logging():
    """日志初始化返回可用 logger。"""
    from services import logging_service
    
    logger = logging_service.init_logging()
    assert logger is not None

def test_standard_logging_bridge():
    """标准 logging 可正常输出。"""
    from services import logging_service
    
    logging_service.init_logging()
    std_logger = logging.getLogger("base_test")
    # 如果拦截生效，这里应该不会报错，且会输出到 loguru
    std_logger.info("base logging ready")
