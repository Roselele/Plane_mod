import boto3
import os
from urllib.parse import quote
import uuid
import requests

access_key = os.environ.get("AWS_ACCESS_KEY_ID")
secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
bucket = os.environ.get("AWS_S3_BUCKET_NAME", "uploads")

session = boto3.Session(
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1",
)
s3 = session.client('s3', endpoint_url="http://localhost:8000", config=boto3.session.Config(signature_version="s3v4"))

the_key = "b4c9d847-2121-438c-9704-5ec5dccae312/730a94696a85491d9f9f63a1ccc3427c-欧仁布丹.jpg"

content_disposition = f"inline; filename*=UTF-8''{quote(uuid.uuid4().hex)}"
url = s3.generate_presigned_url(
    'get_object',
    Params={
        'Bucket': bucket,
        'Key': the_key,
        'ResponseContentDisposition': content_disposition,
    },
    ExpiresIn=300,
)

r = requests.get(url)
print(f"Status: {r.status_code}")
print(f"Content-Type: {r.headers.get('Content-Type')}")
print(f"Content-Length: {len(r.content)}")
print(f"Content-Disposition: {r.headers.get('Content-Disposition')}")
print(f"First bytes (hex): {r.content[:16].hex()}")
if r.status_code == 200:
    print("SUCCESS! Image loaded correctly.")
else:
    print(f"FAILED! Response: {r.text[:300]}")
