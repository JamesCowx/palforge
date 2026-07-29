import hashlib
import os
import secrets
import time

AUTH_USERNAME = os.getenv("AUTH_USERNAME", "Admin")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD", "Chloe")
SECRET = secrets.token_hex(32)
TOKEN_TTL = 86400 * 7


def make_token(username: str, password: str) -> str:
    h = hashlib.sha256(f"{username}:{password}:{SECRET}".encode()).hexdigest()
    return f"{h}:{int(time.time())}"


def verify_token(token: str) -> bool:
    try:
        h, ts = token.split(":", 1)
        age = time.time() - int(ts)
        expected = hashlib.sha256(f"{AUTH_USERNAME}:{AUTH_PASSWORD}:{SECRET}".encode()).hexdigest()
        return h == expected and age < TOKEN_TTL
    except (ValueError, TypeError):
        return False


def check_credentials(username: str, password: str) -> bool:
    return username == AUTH_USERNAME and password == AUTH_PASSWORD
