import hashlib
import json
import secrets
import time
from services.users import authenticate as db_authenticate, get_users

SECRET = secrets.token_hex(32)
TOKEN_TTL = 86400 * 7


def make_token(username: str, password: str) -> str:
    h = hashlib.sha256(f"{username}:{password}:{SECRET}".encode()).hexdigest()
    return f"{h}:{int(time.time())}:{username}"


def verify_token(token: str) -> dict | None:
    try:
        h, ts, username = token.split(":", 2)
        age = time.time() - int(ts)
        if age > TOKEN_TTL:
            return None
        users = get_users()
        for u in users:
            expected = hashlib.sha256(f"{u['username']}:{u['password']}:{SECRET}".encode()).hexdigest()
            if h == expected and u["username"] == username:
                return {"username": u["username"], "role": u["role"]}
        return None
    except (ValueError, TypeError):
        return None


def check_credentials(username: str, password: str) -> dict | None:
    return db_authenticate(username, password)
