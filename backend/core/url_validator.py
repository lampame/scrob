"""
URL validation for user-supplied service URLs (Plex, Jellyfin, Radarr, Sonarr).

Prevents SSRF attacks where a user sets a URL that causes the backend to make
server-side HTTP requests to internal or cloud-metadata endpoints.

We block cloud metadata IP ranges (169.254.0.0/16, etc.) which are the main
target for credential theft, while deliberately keeping RFC-1918 private ranges
allowed because Plex/Jellyfin/Radarr/Sonarr are typically LAN services.
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import HTTPException

# Link-local range — used by AWS IMDSv1, Azure IMDS, GCP metadata, etc.
_BLOCKED_IPV4_NETWORKS = [
    ipaddress.IPv4Network("169.254.0.0/16"),
]

# Specific IPs not covered by the network blocks above
_BLOCKED_IPV4_ADDRS = {
    ipaddress.IPv4Address("100.100.100.200"),  # Alibaba Cloud metadata
    ipaddress.IPv4Address("0.0.0.0"),
}

_BLOCKED_IPV6_NETWORKS = [
    ipaddress.IPv6Network("fe80::/10"),         # IPv6 link-local
    ipaddress.IPv6Network("fd00:ec2::/32"),      # AWS EC2 IPv6 metadata
]

# Hostnames that always resolve to blocked targets
_BLOCKED_HOSTNAMES = {
    "metadata.google.internal",
    "metadata.goog",
}


def _is_blocked_ip(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    if isinstance(addr, ipaddress.IPv4Address):
        if addr in _BLOCKED_IPV4_ADDRS:
            return True
        return any(addr in net for net in _BLOCKED_IPV4_NETWORKS)

    if isinstance(addr, ipaddress.IPv6Address):
        if any(addr in net for net in _BLOCKED_IPV6_NETWORKS):
            return True
        # IPv4-mapped IPv6 addresses (e.g. ::ffff:169.254.169.254) must also
        # be checked against the IPv4 block list.
        if addr.ipv4_mapped is not None:
            return _is_blocked_ip(str(addr.ipv4_mapped))
        return False

    return False


async def validate_service_url(url: str, field_name: str = "URL") -> str:
    """
    Validate a user-supplied service URL before storing or using it.

    Raises HTTPException(400) if the URL uses a non-http(s) scheme or resolves
    to a cloud metadata IP range. Returns the URL unchanged (minus trailing
    slash) when valid.
    """
    if not url:
        return url

    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail=f"{field_name}: malformed URL")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail=f"{field_name}: only http:// and https:// URLs are allowed",
        )

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise HTTPException(status_code=400, detail=f"{field_name}: missing hostname")

    if hostname in _BLOCKED_HOSTNAMES:
        raise HTTPException(status_code=400, detail=f"{field_name}: URL not allowed")

    # Resolve the hostname to its IP(s) and check each against the block list.
    # Run in a thread pool to avoid blocking the async event loop.
    try:
        infos: list = await asyncio.to_thread(socket.getaddrinfo, hostname, None)
        for info in infos:
            ip = info[4][0]
            if _is_blocked_ip(ip):
                raise HTTPException(status_code=400, detail=f"{field_name}: URL not allowed")
    except HTTPException:
        raise
    except OSError:
        # DNS resolution failed — let the actual connection attempt fail naturally.
        pass

    return url.rstrip("/")


async def is_safe_service_url(url: str) -> bool:
    """Non-raising form of validate_service_url. True when the URL is a well-formed
    http(s) URL that doesn't resolve to a blocked (cloud-metadata) range. Use to
    filter machine-supplied URL lists (e.g. Plex-advertised connection URIs)
    before the backend makes requests to them."""
    try:
        await validate_service_url(url)
        return True
    except HTTPException:
        return False
