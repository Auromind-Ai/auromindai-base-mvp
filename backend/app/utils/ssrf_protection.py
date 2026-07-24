import socket
import ipaddress
from urllib.parse import urlparse, urljoin
import requests
import httpx

def is_safe_url(url: str) -> bool:
    
    try:
        if not url:
            return False
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False
        
        hostname_lower = hostname.lower()
        if hostname_lower in ("localhost", "0.0.0.0", "127.0.0.1", "::1", "metadata.google.internal"):
            return False
        
        addr_info = socket.getaddrinfo(hostname, None)
        if not addr_info:
            return False
            
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
                or ip_obj.is_unspecified
            ):
                return False
        return True
    except Exception:
        return False


def safe_requests_get(url: str, max_redirects: int = 5, **kwargs) -> requests.Response:
    
    current_url = url
    kwargs["allow_redirects"] = False

    for _ in range(max_redirects + 1):
        if not is_safe_url(current_url):
            raise ValueError(f"SSRF Protection: Target URL or redirect destination '{current_url}' is not allowed.")
        
        response = requests.get(current_url, **kwargs)
        
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            redirect_url = response.headers.get("Location")
            if not redirect_url:
                break
            current_url = urljoin(current_url, redirect_url)
        else:
            return response

    raise ValueError("SSRF Protection: Exceeded maximum allowed redirects.")


def safe_httpx_sync_get(client: httpx.Client, url: str, max_redirects: int = 5, **kwargs) -> httpx.Response:
   
    current_url = url
    
    for _ in range(max_redirects + 1):
        if not is_safe_url(current_url):
            raise ValueError(f"SSRF Protection: Target URL or redirect destination '{current_url}' is not allowed.")
        
        response = client.get(current_url, follow_redirects=False, **kwargs)
        
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            redirect_url = response.headers.get("Location")
            if not redirect_url:
                break
            current_url = urljoin(current_url, redirect_url)
        else:
            return response

    raise ValueError("SSRF Protection: Exceeded maximum allowed redirects.")


async def safe_httpx_get(client: httpx.AsyncClient, url: str, max_redirects: int = 5, **kwargs) -> httpx.Response:
   
    current_url = url
    
    for _ in range(max_redirects + 1):
        if not is_safe_url(current_url):
            raise ValueError(f"SSRF Protection: Target URL or redirect destination '{current_url}' is not allowed.")
        
        response = await client.get(current_url, follow_redirects=False, **kwargs)
        
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            redirect_url = response.headers.get("Location")
            if not redirect_url:
                break
            current_url = urljoin(current_url, redirect_url)
        else:
            return response

    raise ValueError("SSRF Protection: Exceeded maximum allowed redirects.")
