import boto3
import os

access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
minio_endpoint = os.environ.get("AWS_S3_ENDPOINT_URL") or os.environ.get("MINIO_ENDPOINT_URL")
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")

# Use MinIO direct endpoint for management operations
session = boto3.Session(
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1",
)
s3_direct = session.client('s3', endpoint_url=minio_endpoint, config=boto3.session.Config(signature_version="s3v4"))

# List objects
resp = s3_direct.list_objects_v2(Bucket=bucket, MaxKeys=50)
contents = resp.get('Contents', [])
print(f"Objects in MinIO ({len(contents)} found):")
for obj in contents:
    print(f"  Key: {obj['Key']}  Size: {obj['Size']}")

# Now use localhost:8000 endpoint for presigned URLs (what browser sees)
s3_proxy = session.client('s3', endpoint_url="http://localhost:8000", config=boto3.session.Config(signature_version="s3v4"))

if contents:
    the_key = contents[0]['Key']
    print(f"\n--- Testing with file: {the_key} ---")
    
    # Check head_object via direct MinIO
    try:
        head = s3_direct.head_object(Bucket=bucket, Key=the_key)
        print(f"\nHead object (direct MinIO):")
        print(f"  ContentType: {head.get('ContentType')}")
        print(f"  ContentLength: {head.get('ContentLength')}")
    except Exception as e:
        print(f"Head error: {e}")
    
    # Generate presigned URL via localhost:8000 (what S3Storage does)
    url = s3_proxy.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': the_key, 'ResponseContentDisposition': 'inline'},
        ExpiresIn=300,
    )
    print(f"\nPresigned URL (localhost:8000):")
    print(url[:150] + "...")
    
    # Generate with ResponseContentType
    url2 = s3_proxy.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket, 
            'Key': the_key, 
            'ResponseContentDisposition': 'inline',
            'ResponseContentType': 'image/jpeg',
        },
        ExpiresIn=300,
    )
    print(f"\nPresigned URL with ResponseContentType=image/jpeg:")
    print(url2[:150] + "...")

# Also list DB assets and compare with MinIO
from plane.db.models import FileAsset
print("\n--- DB Assets (is_uploaded=True) ---")
for a in FileAsset.objects.filter(is_uploaded=True, is_deleted=False):
    in_minio = any(c['Key'] == a.asset for c in contents)
    print(f"  ID: {a.id}  Key: {a.asset}  In MinIO: {in_minio}")
