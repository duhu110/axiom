# main.py
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发时启用
        workers=1,     # 生产时可增加
        app_dir="src",
    )


# cd d:\project\FullStack\axiom\server\src
# celery -A knowledgebase.worker.celery_app worker -l info &
# celery -A knowledgebase.worker.celery_app worker -l info --pool=solo

# uv run python scripts/get_token.py 18997485868
