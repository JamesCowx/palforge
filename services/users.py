import json
import os
import asyncio

USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "users.json")
_lock = asyncio.Lock()

DEFAULT_USERS = [{"username": "Admin", "password": "Chloe", "role": "admin"}]


def _load():
    if os.path.exists(USERS_FILE) and os.path.isfile(USERS_FILE):
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return list(DEFAULT_USERS)


async def _save(users):
    async with _lock:
        tmp = USERS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
        try:
            os.replace(tmp, USERS_FILE)
        except OSError:
            import shutil
            shutil.move(tmp, USERS_FILE)


def get_users():
    return _load()


async def create_user(username: str, password: str, role: str = "user") -> dict | None:
    users = _load()
    if any(u["username"] == username for u in users):
        return None
    user = {"username": username, "password": password, "role": role}
    users.append(user)
    await _save(users)
    return {"username": username, "role": role}


async def update_user(username: str, password: str | None, role: str | None) -> dict | None:
    users = _load()
    for u in users:
        if u["username"] == username:
            if password is not None:
                u["password"] = password
            if role is not None:
                u["role"] = role
            await _save(users)
            return {"username": u["username"], "role": u["role"]}
    return None


async def delete_user(username: str) -> bool:
    users = _load()
    for i, u in enumerate(users):
        if u["username"] == username:
            if u["role"] == "admin" and sum(1 for x in users if x["role"] == "admin") <= 1:
                return False
            users.pop(i)
            await _save(users)
            return True
    return False


def authenticate(username: str, password: str) -> dict | None:
    users = _load()
    for u in users:
        if u["username"] == username and u["password"] == password:
            return {"username": u["username"], "role": u["role"]}
    return None
