from fastapi import APIRouter

from services.system import get_system_info, get_local_ip, get_public_ip

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("")
def system_info():
    return get_system_info()


@router.get("/network")
async def network_info():
    return {
        "local_ip": get_local_ip(),
        "public_ip": await get_public_ip(),
    }
