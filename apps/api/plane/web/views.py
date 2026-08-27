# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
3# See the LICENSE file for details.

import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import quote

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt


def health_check(request):
    return JsonResponse({"status": "OK"})


def robots_txt(request):
    return HttpResponse("User-agent: *\nDisallow: /", content_type="text/plain")


@csrf_exempt
def uploads_proxy(request, path=""):
    """Proxy /uploads/ requests to MinIO.

    In production, nginx handles this routing. In local development
    (no nginx), we proxy through Django so presigned upload/download
    URLs continue to work.

    IMPORTANT: We preserve the original Host header because S3v4
    presigned URLs sign the Host header. If we let urllib set
    Host to plane-minio:9000, MinIO will reject with SignatureDoesNotMatch.
    """
    minio_host = os.environ.get("MINIO_PROXY_HOST", "plane-minio:9000")
    # Django URL-decodes the path (e.g. %E6%AC%A7 → 欧), so we must
    # re-encode it so that urllib and MinIO see the same percent-encoded
    # path that was used to compute the S3v4 presigned signature.
    safe_path = quote(path, safe="/") if path else ""
    target_url = f"http://{minio_host}/uploads{safe_path}" if safe_path else f"http://{minio_host}/uploads"

    if request.META.get("QUERY_STRING"):
        target_url += f"?{request.META['QUERY_STRING']}"

    method = request.method
    body = request.body if method in ("POST", "PUT", "PATCH") else None

    headers = {}
    if "CONTENT_TYPE" in request.META:
        headers["Content-Type"] = request.META["CONTENT_TYPE"]
    # Preserve the original Host header for S3v4 signature verification.
    # Presigned URLs are generated with request.get_host() (e.g. localhost:8000);
    # if we let urllib override it to plane-minio:9000, the signature won't match.
    headers["Host"] = request.get_host()

    req = Request(target_url, data=body, headers=headers, method=method)

    try:
        response = urlopen(req)
        # Collect response headers, skip hop-by-hop ones and Content-Type
        # (Content-Type is passed via the content_type parameter below to
        # avoid Django's "headers must not contain Content-Type" ValueError).
        resp_headers = {}
        for k, v in response.headers.items():
            if k.lower() not in ("transfer-encoding", "connection", "keep-alive", "content-type"):
                resp_headers[k] = v
        return HttpResponse(
            response.read(),
            status=response.status,
            content_type=response.headers.get("Content-Type", "application/octet-stream"),
            headers=resp_headers,
        )
    except HTTPError as e:
        error_body = e.read() if hasattr(e, "read") else b""
        return HttpResponse(
            error_body,
            status=e.code,
            content_type=e.headers.get("Content-Type", "application/octet-stream") if e.headers else "application/octet-stream",
        )
    except URLError as e:
        return HttpResponse(
            f"Proxy error: {e.reason}",
            status=502,
            content_type="text/plain",
        )
