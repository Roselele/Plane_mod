import boto3
import os
import io

access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
endpoint = os.environ.get("AWS_S3_ENDPOINT_URL") or os.environ.get("MINIO_ENDPOINT_URL")
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")

session = boto3.Session(
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1",
)
s3 = session.client('s3', endpoint_url=endpoint, config=boto3.session.Config(signature_version="s3v4"))

# Test: upload a small test file
test_key = "test-direct-upload.txt"
test_data = b"Hello from direct boto3 upload!"
try:
    s3.put_object(Bucket=bucket, Key=test_key, Body=test_data, ContentType="text/plain")
    print("Direct upload SUCCESS!")
except Exception as e:
    print(f"Direct upload FAILED: {e}")

# Verify it's there
try:
    resp = s3.get_object(Bucket=bucket, Key=test_key)
    print(f"Read back: {resp['Body'].read()}")
except Exception as e:
    print(f"Read back FAILED: {e}")

# List objects again
try:
    resp = s3.list_objects_v2(Bucket=bucket, MaxKeys=10)
    contents = resp.get('Contents', [])
    print(f"\nObjects after direct upload ({len(contents)} found):")
    for obj in contents:
        print(f"  Key: {obj['Key']}  Size: {obj['Size']}")
except Exception as e:
    print(f"List FAILED: {e}")

# Clean up test file
try:
    s3.delete_object(Bucket=bucket, Key=test_key)
    print("\nTest file cleaned up.")
except Exception as e:
    print(f"Cleanup FAILED: {e}")
