import boto3
import os
import json
import requests

access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")
minio_endpoint = "http://plane-minio:9000"

# Step 1: Generate presigned POST with MinIO endpoint directly
session = boto3.Session(
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1",
)
# Use MinIO direct endpoint (no proxy)
s3 = session.client('s3', endpoint_url=minio_endpoint, config=boto3.session.Config(signature_version="s3v4"))

test_key = "test-direct-minio.txt"

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

print("Direct MinIO URL:", response['url'])

# Step 2: Upload directly to MinIO
files = {'file': b'Hello direct MinIO!'}
fields = response['fields']
r = requests.post(response['url'], data=fields, files=files)
print(f"Direct MinIO upload status: {r.status_code}")
print(f"Response: {r.text[:500]}")

# Step 3: Now test through the proxy (localhost:8000 endpoint)
s3_proxy = session.client('s3', endpoint_url="http://localhost:8000", config=boto3.session.Config(signature_version="s3v4"))
test_key2 = "test-proxy-upload.txt"
response2 = s3_proxy.generate_presigned_post(
    Bucket=bucket,
    Key=test_key2,
    Fields={"Content-Type": "text/plain"},
    Conditions=[
        {"bucket": bucket},
        ["content-length-range", 1, 1048576],
        {"Content-Type": "text/plain"},
        {"key": test_key2},
    ],
    ExpiresIn=300,
)

print("\nProxy URL:", response2['url'])
print("Proxy fields:", json.dumps(response2['fields'], indent=2))

# Upload through proxy
r2 = requests.post(response2['url'], data=response2['fields'], files={'file': b'Hello via proxy!'})
print(f"Proxy upload status: {r2.status_code}")
print(f"Response: {r2.text[:500]}")

# Step 4: Check what headers requests sends
print("\n=== Debug: checking what the proxy receives ===")
# Let's see what Django sees
