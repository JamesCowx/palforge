import hashlib
import os
import secrets
import time

AUTH_PASSWORD = os.getenv("AUTH_PASSWORD", "palforge")
SECRET = secrets.token_hex(32)
TOKEN_TTL = 86400 * 7


def make_token(password: str) -> str:
    h = hashlib.sha256(f"{password}:{SECRET}".encode()).hexdigest()
    return f"{h}:{int(time.time())}"


def verify_token(token: str) -> bool:
    try:
        h, ts = token.split(":", 1)
        age = time.time() - int(ts)
        expected = hashlib.sha256(f"{AUTH_PASSWORD}:{SECRET}".encode()).hexdigest()
        return h == expected and age < TOKEN_TTL
    except (ValueError, TypeError):
        return False


def check_password(password: str) -> bool:
    return password == AUTH_PASSWORD
