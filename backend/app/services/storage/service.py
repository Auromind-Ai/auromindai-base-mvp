import asyncio
import os
from abc import ABC, abstractmethod
from typing import Optional
from urllib.parse import quote

try:
    from supabase import create_client  # type: ignore[import-untyped]
except ImportError:
    create_client = None

try:
    import boto3  # type: ignore[import-untyped]
    from botocore.exceptions import ClientError  # type: ignore[import-untyped]
except ImportError:
    boto3 = None
    ClientError = Exception


class StorageProvider(ABC):
    @abstractmethod
    async def save_file(self, file_path: str, content: bytes, content_type: str = None) -> str:
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        pass

    @abstractmethod
    def get_public_url(self, file_path: str) -> str:
        pass


class SupabaseStorageProvider(StorageProvider):
    def __init__(self):
        if create_client is None:
            raise ImportError("pip install supabase")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        self.bucket_name = os.getenv("SUPABASE_BUCKET", "uploads")
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        self.client = create_client(self.supabase_url, self.supabase_key)

    async def save_file(self, file_path: str, content: bytes, content_type: str = None) -> str:
        return await asyncio.to_thread(self._save_file_sync, file_path, content, content_type)

    def _save_file_sync(self, file_path: str, content: bytes, content_type: str = None) -> str:
        bucket = self.client.storage.from_(self.bucket_name)
        file_options = {"content-type": content_type} if content_type else {}
        try:
            bucket.upload(path=file_path, file=content, file_options=file_options)
        except Exception as e:
            try:
                bucket.update(path=file_path, file=content, file_options=file_options)
            except Exception as e2:
                raise RuntimeError(f"Upload failed: {e} | update failed: {e2}")
        return self.get_public_url(file_path)

    async def delete_file(self, file_path: str) -> bool:
        return await asyncio.to_thread(self._delete_file_sync, file_path)

    def _delete_file_sync(self, file_path: str) -> bool:
        try:
            self.client.storage.from_(self.bucket_name).remove([file_path])
            return True
        except Exception:
            return False

    def get_public_url(self, file_path: str) -> str:
        return f"{self.supabase_url}/storage/v1/object/public/{self.bucket_name}/{quote(file_path, safe='/')}"


class S3StorageProvider(StorageProvider):
    def __init__(self):
        if boto3 is None:
            raise ImportError("pip install boto3")
        self.bucket_name = os.getenv("AWS_S3_BUCKET")
        self.region = os.getenv("AWS_REGION")
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.endpoint_url = os.getenv("AWS_S3_ENDPOINT_URL")
        if not self.bucket_name or not self.access_key or not self.secret_key:
            raise ValueError("AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY must be set")
        self.client = boto3.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            endpoint_url=self.endpoint_url,
        )

    async def save_file(self, file_path: str, content: bytes, content_type: str = None) -> str:
        return await asyncio.to_thread(self._save_file_sync, file_path, content, content_type)

    def _save_file_sync(self, file_path: str, content: bytes, content_type: str = None) -> str:
        params = {"Bucket": self.bucket_name, "Key": file_path, "Body": content}
        if content_type:
            params["ContentType"] = content_type
        self.client.put_object(**params)
        return self.get_public_url(file_path)

    async def delete_file(self, file_path: str) -> bool:
        return await asyncio.to_thread(self._delete_file_sync, file_path)

    def _delete_file_sync(self, file_path: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except ClientError:
            return False

    def get_public_url(self, file_path: str) -> str:
        custom_base = os.getenv("AWS_S3_PUBLIC_BASE_URL")
        if custom_base:
            return f"{custom_base.rstrip('/')}/{quote(file_path, safe='/')}"
        if self.region:
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{quote(file_path, safe='/')}"
        return f"https://{self.bucket_name}.s3.amazonaws.com/{quote(file_path, safe='/')}"


class StorageService:
    def __init__(self, provider: Optional[StorageProvider] = None):
        self.provider = provider or self._build_provider()

    def _build_provider(self) -> StorageProvider:
        name = os.getenv("STORAGE_PROVIDER", "SUPABASE").upper()
        if name == "SUPABASE":
            return SupabaseStorageProvider()
        if name == "S3":
            return S3StorageProvider()
        raise ValueError(f"Unsupported STORAGE_PROVIDER: {name}")

    async def save_file(self, file_path: str, content: bytes, content_type: str = None) -> str:
        return await self.provider.save_file(file_path, content, content_type)

    async def delete_file(self, file_path: str) -> bool:
        return await self.provider.delete_file(file_path)

    def get_public_url(self, file_path: str) -> str:
        return self.provider.get_public_url(file_path)


# Singleton
_instance: Optional[StorageService] = None

def get_storage() -> StorageService:
    global _instance
    if _instance is None:
        _instance = StorageService()
    return _instance