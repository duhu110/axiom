import pytest
from rustfs import client as rustfs_client

def test_client_has_required_methods():
    """客户端包含 upload/download/delete/presign 方法。"""

    # MinIO endpoint 不应包含协议头
    client = rustfs_client.RustfsClient(
        endpoint="localhost:9000",
        access_key="test",
        secret_key="test",
    )
    for method_name in ("upload", "download", "delete", "presign"):
        assert hasattr(client, method_name)
