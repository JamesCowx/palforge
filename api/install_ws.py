from fastapi import APIRouter, WebSocket

from services.steamcmd import install_palworld_server, update_palworld_server, is_steamcmd_installed, install_steamcmd
from services.server_manager import server_manager

router = APIRouter()


@router.websocket("/ws/install/{server_id}")
async def install_websocket(websocket: WebSocket, server_id: str):
    server = server_manager.get_server(server_id)
    if not server:
        await websocket.close(code=4004, reason="Server not found")
        return

    await websocket.accept()

    if not await is_steamcmd_installed():
        await websocket.send_text("SteamCMD not found. Installing SteamCMD...")
        ok = await install_steamcmd()
        if not ok:
            await websocket.send_text("ERROR: Failed to install SteamCMD")
            await websocket.close()
            return
        await websocket.send_text("SteamCMD installed successfully.")

    async def progress(line: str):
        await websocket.send_text(line)

    await websocket.send_text("Installing PalWorld server...")
    ok = await install_palworld_server(server.install_dir, on_progress=progress)

    if ok:
        server_manager.mark_installed(server_id)
        await websocket.send_text("__COMPLETE__: Installation successful")
    else:
        await websocket.send_text("ERROR: Installation failed")

    await websocket.close()


@router.websocket("/ws/update/{server_id}")
async def update_websocket(websocket: WebSocket, server_id: str):
    server = server_manager.get_server(server_id)
    if not server or not server.installed:
        await websocket.close(code=4004, reason="Server not found or not installed")
        return

    await websocket.accept()

    async def progress(line: str):
        await websocket.send_text(line)

    await websocket.send_text("Updating PalWorld server...")
    ok = await update_palworld_server(server.install_dir, on_progress=progress)

    if ok:
        await websocket.send_text("__COMPLETE__: Update successful")
    else:
        await websocket.send_text("ERROR: Update failed")

    await websocket.close()
