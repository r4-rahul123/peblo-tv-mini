from app.core.config import settings
from app.services.storage.base import StorageProvider

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    boto3 = None
    ClientError = Exception


class CloudflareR2StorageProvider(StorageProvider):
    """
    Production-grade Cloudflare R2 / S3 storage abstraction.
    R2 is S3-compatible, so we use boto3 configured for Cloudflare R2 endpoints.
    """

    def __init__(self):
        if boto3 is None:
            raise RuntimeError(
                "boto3 package is required for Cloudflare R2 storage backend. Install via 'pip install boto3'."
            )
        self.endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        self.bucket_name = settings.R2_BUCKET_NAME
        self.public_url = (
            settings.R2_PUBLIC_URL or f"https://pub-{settings.R2_ACCOUNT_ID}.r2.dev"
        )
        self.client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )

    async def save_file(
        self,
        file_content: bytes,
        destination_path: str,
        content_type: str = "image/jpeg",
    ) -> str:
        clean_key = destination_path.lstrip("/").replace("storage/", "")
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=clean_key,
            Body=file_content,
            ContentType=content_type,
        )
        return f"{self.public_url}/{clean_key}"

    async def read_file(self, path: str) -> bytes:
        clean_key = path.lstrip("/").replace("storage/", "")
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=clean_key)
            return response["Body"].read()
        except ClientError as e:
            raise FileNotFoundError(f"R2 Object {path} not found: {e}")

    async def atomic_write(self, content: str | bytes, destination_path: str) -> str:
        clean_key = destination_path.lstrip("/").replace("storage/", "")
        data = content.encode("utf-8") if isinstance(content, str) else content
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=clean_key,
            Body=data,
            ContentType="application/json",
        )
        return f"{self.public_url}/{clean_key}"

    async def file_exists(self, path: str) -> bool:
        clean_key = path.lstrip("/").replace("storage/", "")
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=clean_key)
            return True
        except ClientError:
            return False
