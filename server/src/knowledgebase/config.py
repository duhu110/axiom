"""
知识库模块配置

Embedding 模型和文档切分参数
"""


class KBConfig:
    """知识库配置"""
    
    # Embedding 模型
    EMBEDDING_MODEL: str = "BAAI/bge-small-zh-v1.5"
    
    # 文档切分参数
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
