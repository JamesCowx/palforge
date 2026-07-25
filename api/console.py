import asyncio
from fastapi import APIRouter, WebSocket

from services.server_manager import server_manager

router = APIRouter()


@router.websocket("/ws/console/{server_id}")
async def console_websocket(websocket: WebSocket, server_id: str):
    server = server_manager.get_server(server_id)
    if not server:
        await websocket.close(code=4004, reason="Server not found")
        return

    await websocket.accept()

    # Send existing logs
    for line in server.log_lines[-200:]:
        await websocket.send_text(line)

    queue = asyncio.Queue()

    async def log_handler(sid: str, line: str):
        if sid == server_id:
            await queue.put(line)

    server.log_callback = log_handler

    try:
        while True:
            try:
                line = await asyncio.wait_for(queue.get(), timeout=30)
                await websocket.send_text(line)
            except asyncio.TimeoutError:
                await websocket.send_text("__PING__")
    except WebSocketDisconnect:
        pass
    finally:
        if server.log_callback == log_handler:
            server.log_callback = None
