import logging
import sys
from typing import Any

from loguru import logger

from config import settings


class InterceptHandler(logging.Handler):
    """
    将标准 logging 日志拦截并转发到 loguru
    """

    def emit(self, record: logging.LogRecord) -> None:
        # 获取对应的 loguru level
        try:
            level: str | int = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # 查找调用者的帧，以便 loguru 能正确显示文件名和行号
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back  # type: ignore
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def init_logging() -> Any:
    """
    初始化日志配置
    1. 配置 loguru
    2. 接管标准 logging
    """
    log_config = settings.log

    # 移除 loguru 默认的 handler
    logger.remove()

    # 添加控制台输出
    logger.add(
        sys.stderr,
        level=log_config.level,
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
        serialize=log_config.json_format,
    )

    # 添加文件输出
    logger.add(
        log_config.file_path,
        level=log_config.level,
        rotation=log_config.rotation,
        retention=log_config.retention,
        serialize=log_config.json_format,
        enqueue=True,  # 异步写入
        backtrace=True,
        diagnose=True,
    )

    # 配置标准 logging 拦截
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # 将 uvicorn 和 fastapi 的日志也重定向
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
        # 保持原有 level 或设为 INFO，避免过于啰嗦
        logging_logger.propagate = False

    return logger


def get_logger() -> Any:
    """获取 logger 实例"""
    return logger
