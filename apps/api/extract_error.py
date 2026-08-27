import boto3
import os
from urllib.parse import quote
import uuid

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

import requests
r = requests.get(url)
# Extract text and look for exception info
text = r.text
# Find exception type and value
import re
# Look for "Exception Value" in Django debug page
exception_match = re.search(r'Exception Value.*?<pre.*?>(.*?)</pre>', text, re.DOTALL)
if exception_match:
    print("Exception Value:", exception_match.group(1).strip()[:500])

# Look for "Exception Type"
type_match = re.search(r'Exception Type.*?<.*?>(.*?)<', text, re.DOTALL)
if type_match:
    print("Exception Type:", type_match.group(1).strip())

# Also search for traceback frames
frames = re.findall(r'File "([^"]*)".*?in.*?<', text)
for f in frames[:10]:
    print(f"Frame: {f}")

# Search for the actual error message more broadly
# Look for UnicodeEncodeError or other specific errors
if 'UnicodeEncodeError' in text:
    print("\nFound UnicodeEncodeError!")
    idx = text.index('UnicodeEncodeError')
    print(text[idx:idx+300])

if 'SignatureDoesNotMatch' in text:
    print("\nFound SignatureDoesNotMatch!")

# Save the text for analysis
with open('/tmp/error_page.html', 'w', encoding='utf-8') as f:
    f.write(text)
print(f"\nSaved error page to /tmp/error_page.html ({len(text)} chars)")

# Also extract the traceback section
tb_match = re.search(r'Traceback.*?</div>', text, re.DOTALL)
if tb_match:
    cleaned = re.sub(r'<[^>]+>', '', tb_match.group(0))
    print("\nTraceback:")
    print(cleaned[:1000])
