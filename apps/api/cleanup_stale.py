import boto3
import os
from plane.db.models import FileAsset

# Connect to MinIO directly
session = boto3.Session(
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    region_name="us-east-1",
)
s3 = session.client('s3', endpoint_url=os.environ.get("AWS_S3_ENDPOINT_URL"), config=boto3.session.Config(signature_version="s3v4"))
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")

# Get all keys in MinIO
resp = s3.list_objects_v2(Bucket=bucket, MaxKeys=1000)
minio_keys = set(obj['Key'] for obj in resp.get('Contents', []))
print(f"MinIO has {len(minio_keys)} objects:")
for k in minio_keys:
    print(f"  {k}")

# Find DB records whose asset key doesn't exist in MinIO
stale = []
for asset in FileAsset.objects.filter(is_deleted=False):
    if asset.asset not in minio_keys:
        stale.append(asset)
        print(f"\nSTALE: ID={asset.id}  Key={asset.asset}  is_uploaded={asset.is_uploaded}  entity_type={asset.entity_type}")

print(f"\nTotal stale records: {len(stale)}")

# Mark stale records as deleted
for asset in stale:
    asset.is_deleted = True
    asset.deleted_at = asset.deleted_at or __import__('django').utils.timezone.now()
    asset.save(update_fields=["is_deleted", "deleted_at"])
    print(f"Marked as deleted: {asset.id} ({asset.asset})")

print("\nDone.")
