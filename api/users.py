from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from services.users import get_users, create_user, update_user, delete_user

router = APIRouter(prefix="/api/users", tags=["users"])


def _is_admin(request: Request) -> bool:
    role = getattr(request.state, "user_role", None)
    return role == "admin"


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


class UpdateUserRequest(BaseModel):
    password: str | None = None
    role: str | None = None


@router.get("")
def list_users(request: Request):
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="admin only")
    return [{"username": u["username"], "role": u["role"]} for u in get_users()]


@router.post("")
async def add_user(req: CreateUserRequest, request: Request):
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="admin only")
    if not req.username or not req.password:
        raise HTTPException(status_code=400, detail="username and password required")
    result = await create_user(req.username, req.password, req.role)
    if result is None:
        raise HTTPException(status_code=409, detail="user already exists")
    return result


@router.put("/{username}")
async def edit_user(username: str, req: UpdateUserRequest, request: Request):
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="admin only")
    result = await update_user(username, req.password, req.role)
    if result is None:
        raise HTTPException(status_code=404, detail="user not found")
    return result


@router.delete("/{username}")
async def remove_user(username: str, request: Request):
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="admin only")
    ok = await delete_user(username)
    if not ok:
        raise HTTPException(status_code=400, detail="cannot delete last admin")
    return {"ok": True}
