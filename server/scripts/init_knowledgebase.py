"""
知识库初始化脚本

功能:
1. 下载 Embedding 模型 (BAAI/bge-small-zh-v1.5) 到 server/models/
2. 连接 axiom_kb 数据库，初始化 PGVector 扩展和表结构
3. 验证模型和数据库连接正常

执行命令:
    cd server
    uv run python scripts/init_knowledgebase.py
"""

import os
import sys

# 添加 src 目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from fastembed import TextEmbedding
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_postgres.vectorstores import PGVector
from langchain_core.documents import Document

from config import settings


def get_sync_kb_uri() -> str:
    """获取 axiom_kb 的同步连接字符串"""
    uri = settings.db.uri_kb
    # asyncpg -> psycopg
    if "+asyncpg" in uri:
        uri = uri.replace("+asyncpg", "+psycopg")
    return uri


def download_embedding_model():
    """下载 Embedding 模型到本地"""
    model_name = settings.kb.embedding_model
    cache_dir = settings.kb.embedding_cache_dir
    
    os.makedirs(cache_dir, exist_ok=True)
    print(f"Step 1: Downloading embedding model '{model_name}' to '{cache_dir}'...")
    
    # 使用 fastembed 下载模型
    model = TextEmbedding(model_name=model_name, cache_dir=cache_dir)
    
    # 触发一次 embed 确保模型完整加载
    test_result = list(model.embed(["测试文本 test text"]))
    print(f"  - Model loaded successfully, embedding dimension: {len(test_result[0])}")
    print("  - Model downloaded successfully!")
    
    return model


def init_vector_store():
    """初始化 axiom_kb 数据库中的向量存储"""
    print("\nStep 2: Initializing vector store in axiom_kb...")
    
    kb_uri = get_sync_kb_uri()
    print(f"  - Connecting to: {kb_uri.split('@')[1] if '@' in kb_uri else kb_uri}")
    
    # 创建 Embeddings 实例
    embeddings = FastEmbedEmbeddings(
        model_name=settings.kb.embedding_model,
        cache_dir=settings.kb.embedding_cache_dir,
    )
    
    # 初始化 PGVector (会自动创建扩展和表)
    vector_store = PGVector(
        embeddings=embeddings,
        collection_name="axiom_kb_vectors",
        connection=kb_uri,
        use_jsonb=True,
    )
    
    print("  - Vector store initialized successfully!")
    return vector_store


def verify_setup(vector_store: PGVector):
    """验证设置是否正确"""
    print("\nStep 3: Verification...")
    
    # 添加测试文档
    test_docs = [
        Document(
            page_content="这是一个初始化测试文档，用于验证向量存储功能。",
            metadata={"test": True, "purpose": "initialization"}
        )
    ]
    
    ids = vector_store.add_documents(test_docs)
    print(f"  - Test document added with id: {ids[0]}")
    
    # 测试检索
    results = vector_store.similarity_search("测试文档", k=1)
    if results and len(results) > 0:
        print(f"  - Search test passed, found: '{results[0].page_content[:30]}...'")
    else:
        print("  - Warning: Search returned no results")
    
    # 清理测试数据
    vector_store.delete(ids)
    print("  - Test data cleaned up")
    
    print("\n" + "=" * 50)
    print("All checks passed! Knowledge base is ready.")
    print("=" * 50)


def main():
    print("=" * 50)
    print("Knowledge Base Initialization Script")
    print("=" * 50 + "\n")
    
    try:
        # Step 1: 下载模型
        download_embedding_model()
        
        # Step 2: 初始化向量存储
        vector_store = init_vector_store()
        
        # Step 3: 验证
        verify_setup(vector_store)
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
