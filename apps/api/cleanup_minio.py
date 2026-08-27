import boto3
import os

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

# Clean up test files
for key in ["test-direct-minio.txt", "test-proxy-upload.txt", "test-upload-via-proxy.txt"]:
    try:
        s3.delete_object(Bucket=bucket, Key=key)
        print(f"Deleted: {key}")
    except Exception as e:
        print(f"Error deleting {key}: {e}")

# List remaining
resp = s3.list_objects_v2(Bucket=bucket, MaxKeys=50)
contents = resp.get('Contents', [])
print(f"\nRemaining objects ({len(contents)}):")
for obj in contents:
    print(f"  Key: {obj['Key']}  Size: {obj['Size']}")
