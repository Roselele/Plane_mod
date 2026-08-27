import boto3
import os
import json

access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
endpoint = os.environ.get("AWS_S3_ENDPOINT_URL") or os.environ.get("MINIO_ENDPOINT_URL")
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")

# Create S3 client with the same endpoint as S3Storage would when request is provided
# When request is available, S3Storage uses f"{request.scheme}://{request.get_host()}" = "http://localhost:8000"
session = boto3.Session(
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1",
)
# Use localhost:8000 as endpoint (same as what browser sees)
s3 = session.client('s3', endpoint_url="http://localhost:8000", config=boto3.session.Config(signature_version="s3v4"))

test_key = "test-upload-via-proxy.txt"

# Generate presigned POST
response = s3.generate_presigned_post(
    Bucket=bucket,
    Key=test_key,
    Fields={"Content-Type": "text/plain"},
    Conditions=[
        {"bucket": bucket},
        ["content-length-range", 1, 1048576],
        {"Content-Type": "text/plain"},
        {"key": test_key},
    ],
    ExpiresIn=300,
)

print("Presigned POST URL:", response['url'])
print("Fields:", json.dumps(response['fields'], indent=2))
print()
print("=== curl command to test ===")
print(f"curl -X POST '{response['url']}' \\")
for k, v in response['fields'].items():
    print(f"  -F '{k}={v}' \\")
print(f"  -F 'file=@test.txt'")
