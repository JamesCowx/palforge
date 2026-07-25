import asyncio
import platform
import socket

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


async def get_public_ip() -> str:
    for url in (
        "https://api.ipify.org",
        "https://ifconfig.me/ip",
        "https://icanhazip.com",
    ):
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(url.replace("https://", ""), 443, ssl=True),
                timeout=5,
            )
            request = (
                f"GET {'/' if 'ipify' in url else '/ip' if 'ifconfig' in url else '/'} HTTP/1.1\r\n"
                f"Host: {url.replace('https://', '')}\r\n"
                "User-Agent: PalWorldManager/1.0\r\n"
                "Connection: close\r\n\r\n"
            )
            writer.write(request.encode())
            await writer.drain()
            response = (await reader.read()).decode()
            writer.close()
            await writer.wait_closed()
            body = response.split("\r\n\r\n", 1)[-1].strip()
            if body and len(body) < 50 and "." in body:
                return body
        except Exception:
            continue
    return "Unknown"


def get_system_info() -> dict:
    info = {
        "os": platform.system(),
        "os_release": platform.release(),
        "python_version": platform.python_version(),
        "cpu_count": 0,
        "cpu_percent": 0.0,
        "memory_total_gb": 0.0,
        "memory_used_gb": 0.0,
        "memory_percent": 0.0,
        "disk_free_gb": 0.0,
        "local_ip": get_local_ip(),
    }
    if HAS_PSUTIL:
        info["cpu_count"] = psutil.cpu_count()
        info["cpu_percent"] = round(psutil.cpu_percent(interval=0.1), 1)
        mem = psutil.virtual_memory()
        info["memory_total_gb"] = round(mem.total / (1024 ** 3), 1)
        info["memory_used_gb"] = round(mem.used / (1024 ** 3), 1)
        info["memory_percent"] = mem.percent
        disk = psutil.disk_usage("/")
        info["disk_free_gb"] = round(disk.free / (1024 ** 3), 1)
    return info
