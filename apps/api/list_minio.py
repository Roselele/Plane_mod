import boto3
import os

access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
region = os.environ.get("AWS_REGION") or "us-east-1"
endpoint = os.environ.get("AWS_S3_ENDPOINT_URL") or os.environ.get("MINIO_ENDPOINT_URL")
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")

print(f"Access Key: {access_key}")
print(f"Region: {region}")
print(f"Endpoint: {endpoint}")
print(f"Bucket: {bucket}")

session = boto3.Session(
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name=region,
)
s3 = session.client('s3', endpoint_url=endpoint, config=boto3.session.Config(signature_version="s3v4"))

# List all buckets
try:
    resp = s3.list_buckets()
    print("\nBuckets:")
    for b in resp.get('Buckets', []):
        print(f"  {b['Name']}  Created: {b['CreationDate']}")
except Exception as e:
    print(f"Error listing buckets: {e}")

# List objects in uploads bucket
try:
    obj_resp = s3.list_objects_v2(Bucket=bucket, MaxKeys=50)
    contents = obj_resp.get('Contents', [])
    print(f"\nObjects in '{bucket}' ({len(contents)} found):")
    for obj in contents:
        print(f"  Key: {obj['Key']}  Size: {obj['Size']}  LastModified: {obj['LastModified']}")
    if not contents:
        print("  (empty)")
except Exception as e:
    print(f"Error listing objects: {e}")

# Check if the specific test key exists
test_key = "b4c9d847-2121-438c-9704-5ec5dccae312/ba2cb07e0758458cb26cda346a344f9d-欧仁布丹.jpg"
try:
    head = s3.head_object(Bucket=bucket, Key=test_key)
    print(f"\nTest key EXISTS! Content-Type: {head.get('ContentType')}, Size: {head.get('ContentLength')}")
except Exception as e:
    print(f"\nTest key does NOT exist: {e}")

# Also check FileAsset records in DB
from plane.db.models import FileAsset
assets = FileAsset.objects.all().order_by('-created_at')[:10]
print(f"\nLast 10 FileAsset records in DB:")
for a in assets:
    print(f"  ID: {a.id}  Asset: {a.asset}  Attributes: {a.attributes}")
