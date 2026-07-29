from fastapi import APIRouter, HTTPException

from services.steamcmd import (
    install_palworld_server,
    is_steamcmd_installed,
    install_steamcmd,
    update_palworld_server,
)
from services.server_manager import server_manager

router = APIRouter(prefix="/api/install", tags=["install"])


@router.get("/steamcmd/status")
async def steamcmd_status():
    installed = await is_steamcmd_installed()
    return {"installed": installed}


@router.post("/steamcmd")
async def do_install_steamcmd():
    ok = await install_steamcmd()
    return {"ok": ok}


@router.post("/server/{server_id}")
async def install_server(server_id: str):
    server = server_manager.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if not await is_steamcmd_installed():
        raise HTTPException(status_code=400, detail="SteamCMD not installed")

    ok = await install_palworld_server(server.install_dir)
    if ok:
        await server_manager.mark_installed(server_id)
    return {"ok": ok}


@router.post("/server/{server_id}/update")
async def update_server(server_id: str):
    server = server_manager.get_server(server_id)
    if not server or not server.installed:
        raise HTTPException(status_code=404, detail="Server not found or not installed")

    ok = await update_palworld_server(server.install_dir)
    return {"ok": ok}
