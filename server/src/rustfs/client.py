from typing import Any, Dict, Optional
import io
from minio import Minio
from minio.error import S3Error
from datetime import timedelta
from config import settings


class RustfsClient:
    """Rustfs (MinIO) 文件存储客户端封装"""

    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket_name: str = "axiom",
        secure: bool = False,
    ):
        self.bucket_name = bucket_name
        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )

    def ensure_bucket_exists(self) -> None:
        """确保 Bucket 存在，不存在则创建"""
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)

    def upload(
        self,
        file_name: str,
        content: bytes,
        content_type: str = "application/octet-stream",
    ) -> Dict[str, Any]:
        """
        上传文件
        :param file_name: 文件名
        :param content: 文件内容
        :param content_type: MIME类型
        :return: 上传结果
        """
        try:
            # 转换为 BytesIO 对象
            data_stream = io.BytesIO(content)
            result = self.client.put_object(
                self.bucket_name,
                file_name,
                data_stream,
                length=len(content),
                content_type=content_type,
            )
            return {
                "bucket": result.bucket_name,
                "object": result.object_name,
                "etag": result.etag,
                "version_id": result.version_id,
            }
        except S3Error as e:
            raise Exception(f"Upload failed: {e}") from e

    def download(self, file_name: str) -> bytes:
        """
        下载文件
        :param file_name: 文件名
        :return: 文件二进制内容
        """
        try:
            response = self.client.get_object(self.bucket_name, file_name)
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()
        except S3Error as e:
            if e.code == "NoSuchKey":
                raise FileNotFoundError(f"File not found: {file_name}")
            raise Exception(f"Download failed: {e}") from e
    def delete(self, file_name: str) -> bool:
        """
        删除文件
        :param file_name: 文件名
        :return: 是否删除成功
        """
        try:
            self.client.remove_object(self.bucket_name, file_name)
            return True
        except S3Error as e:
            # MinIO remove_object 即使对象不存在也不会报错，这里捕获其他错误
            raise Exception(f"Delete failed: {e}") from e

    def presign(
        self,
        file_name: str,
        method: str = "GET",
        expires: int = 3600,
        response_headers: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        生成预签名 URL
        :param file_name: 文件名
        :param method: HTTP 方法（GET/PUT）
        :param expires: 过期秒数
        :param response_headers: 可选响应头（仅 GET 时常用）
        :return: 预签名 URL
        """
        method_upper = method.upper()
        expiry = timedelta(seconds=expires)
        try:
            if method_upper == "GET":
                return self.client.presigned_get_object(
                    self.bucket_name,
                    file_name,
                    expires=expiry,
                    response_headers=response_headers,
                )
            if method_upper == "PUT":
                return self.client.presigned_put_object(
                    self.bucket_name,
                    file_name,
                    expires=expiry,
                )
            raise ValueError(f"Unsupported presign method: {method}")
        except S3Error as e:
            raise Exception(f"Presign failed: {e}") from e



# 单例客户端
_client_instance = None

def get_rustfs_client() -> RustfsClient:
    global _client_instance
    if not _client_instance:
        conf = settings.storage
        _client_instance = RustfsClient(
            endpoint=conf.rustfs_endpoint,
            access_key=conf.access_key,
            secret_key=conf.secret_key,
            bucket_name=conf.bucket_name,
            secure=conf.secure,
        )
    return _client_instance
