from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scalar_fastapi import get_scalar_api_reference

from config import settings
from exceptions import init_exception_handlers
from services.logging_service import init_logging
from auth import dependencies, models
from auth.router import router as auth_router
from rustfs.router import router as rustfs_router
from agent.router import router as agent_router
from knowledgebase.router import router as kb_router
from llm_usage.router import router as llm_usage_router
from agent.dependencies import init_agent_dependencies, close_agent_dependencies
from rustfs.client import get_rustfs_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期初始化与清理"""
    # 启动时初始化
    init_logging()
    
    # 初始化 Agent 依赖 (DB, Checkpointer, Store)
    await init_agent_dependencies()
    
    # 初始化 MinIO Bucket
    try:
        get_rustfs_client().ensure_bucket_exists()
    except Exception as e:
        # Log error but don't crash if MinIO is down (optional)
        pass 
        
    yield
    # 关闭时清理
    await close_agent_dependencies()


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境建议配置具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册异常处理器
init_exception_handlers(app)

# 注册路由
app.include_router(auth_router)
app.include_router(rustfs_router)
app.include_router(agent_router, prefix="/agent", tags=["agent"])
app.include_router(kb_router)
app.include_router(llm_usage_router)


@app.get("/docs", include_in_schema=False)
async def scalar_docs():
    """Scalar 文档入口"""
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=settings.app_name,
    )


@app.get("/info")
async def info(
    current_user: Annotated[models.User, Depends(dependencies.get_current_active_user)],
):
    """应用基础信息"""
    return {
        "app_name": settings.app_name,
        "env": settings.env,
    }
