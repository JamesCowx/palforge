import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional

from services.server_manager import server_manager
from services.config_manager import get_default_settings, get_presets

logger = logging.getLogger("palforge")
router = APIRouter(prefix="/api/servers", tags=["servers"])


class CreateServerRequest(BaseModel):
    name: str
    port: int = 8211


class RenameServerRequest(BaseModel):
    name: str


class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, Any]


class SendCommandRequest(BaseModel):
    command: str


@router.get("")
def list_servers():
    return [s.to_dict() for s in server_manager.list_servers()]


@router.post("")
async def create_server(req: CreateServerRequest):
    try:
        server = await server_manager.create_server(req.name, req.port)
        return server.to_dict()
    except Exception as e:
        logger.exception("Failed to create server")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{server_id}")
async def delete_server(server_id: str):
    ok = await server_manager.delete_server(server_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"ok": True}


@router.get("/{server_id}")
def get_server(server_id: str):
    server = server_manager.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server.to_dict()


@router.put("/{server_id}/rename")
async def rename_server(server_id: str, req: RenameServerRequest):
    ok = await server_manager.rename_server(server_id, req.name)
    if not ok:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"ok": True}


@router.post("/{server_id}/start")
async def start_server(server_id: str):
    ok = await server_manager.start_server(server_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot start server")
    return {"ok": True}


@router.post("/{server_id}/stop")
async def stop_server(server_id: str):
    ok = await server_manager.stop_server(server_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot stop server")
    return {"ok": True}


@router.post("/{server_id}/restart")
async def restart_server(server_id: str):
    ok = await server_manager.restart_server(server_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot restart server")
    return {"ok": True}


@router.get("/defaults/settings")
def get_defaults():
    return get_default_settings()


@router.get("/defaults/presets")
def get_preset_list():
    return get_presets()


@router.get("/{server_id}/settings")
def get_settings(server_id: str):
    settings = server_manager.get_settings(server_id)
    if settings is None:
        raise HTTPException(status_code=404, detail="Server not found")
    return settings


@router.put("/{server_id}/settings")
async def update_settings(server_id: str, req: UpdateSettingsRequest):
    try:
        ok = await server_manager.update_settings(server_id, req.settings)
        if not ok:
            raise HTTPException(status_code=404, detail="Server not found")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update settings")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{server_id}/logs")
def get_logs(server_id: str):
    return server_manager.get_logs(server_id)


@router.post("/{server_id}/command")
async def send_command(server_id: str, req: SendCommandRequest):
    ok = await server_manager.send_command(server_id, req.command)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot send command")
    return {"ok": True}


class KickPlayerRequest(BaseModel):
    steam_id: str
    reason: str = ""


@router.get("/{server_id}/players")
async def get_players(server_id: str):
    players = await server_manager.show_players(server_id)
    return {"players": players}


@router.post("/{server_id}/players/kick")
async def kick_player(server_id: str, req: KickPlayerRequest):
    ok = await server_manager.kick_player(server_id, req.steam_id, req.reason)
    if not ok:
        raise HTTPException(status_code=400, detail="Cannot kick player")
    return {"ok": True}
