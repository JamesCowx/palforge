import asyncio
import json
import os
import platform
import re
import signal
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from services.config_manager import DEFAULT_PALWORLD_SETTINGS, get_default_settings, read_config, write_config

SERVERS_DATA_FILE = os.path.join(os.environ.get("DATA_DIR", os.path.dirname(os.path.dirname(__file__))), "servers.json")
_save_lock = asyncio.Lock()


@dataclass
class ServerInstance:
    id: str
    name: str
    status: str = "stopped"
    port: int = 8211
    settings: Dict[str, Any] = field(default_factory=get_default_settings)
    installed: bool = False
    created_at: float = field(default_factory=time.time)
    uptime_start: Optional[float] = None
    player_count: int = 0
    max_players_seen: int = 0
    connected_players: List[str] = field(default_factory=list)
    process: Any = None
    log_lines: List[str] = field(default_factory=list)
    log_callback: Optional[Callable] = None

    @property
    def install_dir(self) -> str:
        base = os.environ.get("SERVER_DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "servers"))
        return os.path.abspath(os.path.join(base, self.id))

    @property
    def config_path(self) -> str:
        config_subdir = "WindowsServer" if platform.system() == "Windows" else "LinuxServer"
        return os.path.join(
            self.install_dir, "Pal", "Saved", "Config", config_subdir, "PalWorldSettings.ini"
        )

    @property
    def executable_path(self) -> str:
        if platform.system() == "Windows":
            return os.path.join(self.install_dir, "PalServer.exe")
        return os.path.join(self.install_dir, "PalServer.sh")

    @property
    def uptime_seconds(self) -> float:
        if self.status == "running" and self.uptime_start:
            return time.time() - self.uptime_start
        return 0.0

    @property
    def memory_mb(self) -> float:
        if not self.process or self.status != "running":
            return 0.0
        try:
            import psutil
            proc = psutil.Process(self.process.pid)
            return proc.memory_info().rss / (1024 * 1024)
        except Exception:
            return 0.0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "port": self.port,
            "settings": self.settings,
            "installed": self.installed,
            "install_dir": self.install_dir,
            "created_at": self.created_at,
            "uptime_seconds": self.uptime_seconds,
            "player_count": self.player_count,
            "max_players_seen": self.max_players_seen,
            "memory_mb": round(self.memory_mb, 1),
        }


class ServerManager:
    def __init__(self):
        self._servers: Dict[str, ServerInstance] = {}
        self._load()

    def _load(self):
        if os.path.exists(SERVERS_DATA_FILE) and os.path.isfile(SERVERS_DATA_FILE):
            try:
                with open(SERVERS_DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                print(f"[PalForge] Failed to load servers.json: {e}")
                data = []
            for sdata in data:
                instance = ServerInstance(
                    id=sdata["id"],
                    name=sdata["name"],
                    port=sdata.get("port", 8211),
                    settings=sdata.get("settings", get_default_settings()),
                    installed=sdata.get("installed", False),
                    created_at=sdata.get("created_at", time.time()),
                    player_count=sdata.get("player_count", 0),
                    max_players_seen=sdata.get("max_players_seen", 0),
                )
                self._servers[instance.id] = instance

    async def _save(self):
        async with _save_lock:
            data = [s.to_dict() for s in self._servers.values()]
            tmp = SERVERS_DATA_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            try:
                os.replace(tmp, SERVERS_DATA_FILE)
            except OSError:
                import shutil
                shutil.move(tmp, SERVERS_DATA_FILE)

    def list_servers(self) -> List[ServerInstance]:
        return list(self._servers.values())

    def get_server(self, server_id: str) -> Optional[ServerInstance]:
        return self._servers.get(server_id)

    async def create_server(self, name: str, port: int = 8211) -> ServerInstance:
        server_id = str(uuid.uuid4())
        instance = ServerInstance(id=server_id, name=name, port=port)
        self._servers[server_id] = instance
        await self._save()
        return instance

    async def rename_server(self, server_id: str, name: str) -> bool:
        server = self._servers.get(server_id)
        if not server:
            return False
        server.name = name
        await self._save()
        return True

    async def delete_server(self, server_id: str) -> bool:
        server = self._servers.pop(server_id, None)
        if server:
            await self._save()
            return True
        return False

    async def update_settings(self, server_id: str, settings: Dict[str, Any]) -> bool:
        server = self._servers.get(server_id)
        if not server:
            return False
        server.settings = {**server.settings, **settings}
        if server.installed and os.path.exists(server.install_dir):
            write_config(server.config_path, server.settings)
        await self._save()
        return True

    def get_settings(self, server_id: str) -> Optional[Dict[str, Any]]:
        server = self._servers.get(server_id)
        if not server:
            return None
        if server.installed and os.path.exists(server.config_path):
            file_settings = {**DEFAULT_PALWORLD_SETTINGS, **read_config(server.config_path)}
            return file_settings
        return dict(server.settings)

    async def start_server(self, server_id: str) -> bool:
        server = self._servers.get(server_id)
        if not server or not server.installed or server.status == "running":
            return False

        config_path = server.config_path
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        write_config(config_path, server.settings)

        server.status = "starting"
        server.log_lines = []
        server.player_count = 0
        server.max_players_seen = 0

        env = os.environ.copy()
        env["Path"] = env.get("Path", "") + os.pathsep + os.path.dirname(server.executable_path)

        try:
            if not os.path.exists(server.executable_path):
                server.status = "stopped"
                server.log_lines.append("[ERROR] Server executable not found")
                return False

            subprocess_kwargs = dict(
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                stdin=asyncio.subprocess.PIPE,
                cwd=os.path.dirname(server.executable_path),
                env=env,
            )
            if platform.system() == "Windows":
                server.process = await asyncio.create_subprocess_exec(
                    server.executable_path,
                    "-port", str(server.port),
                    "-players", str(server.settings.get("ServerPlayerMaxNum", 32)),
                    "-log",
                    **subprocess_kwargs,
                )
            else:
                os.chmod(server.executable_path, 0o755)
                server.process = await asyncio.create_subprocess_exec(
                    server.executable_path,
                    "-port", str(server.port),
                    "-players", str(server.settings.get("ServerPlayerMaxNum", 32)),
                    "-log",
                    **subprocess_kwargs,
                )

            server.uptime_start = time.time()
            asyncio.create_task(self._read_output(server))
            server.status = "running"
            await self._save()
            return True
        except Exception as e:
            server.status = "stopped"
            server.log_lines.append(f"[ERROR] Failed to start: {e}")
            return False

    async def stop_server(self, server_id: str) -> bool:
        server = self._servers.get(server_id)
        if not server or server.status != "running" or not server.process:
            return False

        server.status = "stopping"
        try:
            if platform.system() == "Windows":
                server.process.terminate()
            else:
                server.process.send_signal(signal.SIGINT)

            try:
                await asyncio.wait_for(server.process.wait(), timeout=15)
            except asyncio.TimeoutError:
                server.process.kill()
                await server.process.wait()
        except ProcessLookupError:
            pass

        server.process = None
        server.uptime_start = None
        server.status = "stopped"
        await self._save()
        return True

    async def restart_server(self, server_id: str) -> bool:
        await self.stop_server(server_id)
        await asyncio.sleep(2)
        return await self.start_server(server_id)

    async def send_command(self, server_id: str, command: str) -> bool:
        server = self._servers.get(server_id)
        if not server or not server.process or server.status != "running":
            return False
        try:
            cmd = (command + "\n").encode()
            server.process.stdin.write(cmd)
            await server.process.stdin.drain()
            return True
        except Exception:
            return False

    async def show_players(self, server_id: str) -> list:
        server = self._servers.get(server_id)
        if not server or not server.process or server.status != "running":
            return []
        try:
            server.process.stdin.write(b"ShowPlayers\n")
            await server.process.stdin.drain()
            await asyncio.sleep(0.5)
        except Exception:
            pass
        return server.connected_players

    async def kick_player(self, server_id: str, steam_id: str, reason: str = "") -> bool:
        server = self._servers.get(server_id)
        if not server or not server.process or server.status != "running":
            return False
        try:
            cmd = f"KickPlayer {steam_id}"
            if reason:
                cmd += f" {reason}"
            cmd += "\n"
            server.process.stdin.write(cmd.encode())
            await server.process.stdin.drain()
            return True
        except Exception:
            return False

    _PLAYER_JOIN_RE = re.compile(r"(?:player|user)\s+(?:join|connect|login)|NumPlayer.*?:\s*(\d+)", re.IGNORECASE)
    _PLAYER_LEAVE_RE = re.compile(r"(?:player|user)\s+(?:leave|disconnect|quit|logout)", re.IGNORECASE)
    _PLAYER_COUNT_RE = re.compile(r"NumPlayer[^:]*:\s*(\d+)", re.IGNORECASE)
    _SHOWPLAYERS_HEADER_RE = re.compile(r"name,playeruid,steamid", re.IGNORECASE)
    _PLAYER_ENTRY_RE = re.compile(r"^([^,]+),(\d+),(\d{17})")

    async def _read_output(self, server: ServerInstance):
        if not server.process or not server.process.stdout:
            return
        parsing_players = False
        parsed_players = []
        async for line in server.process.stdout:
            text = line.decode(errors="replace").rstrip()
            server.log_lines.append(text)
            if len(server.log_lines) > 800:
                server.log_lines = server.log_lines[-800:]

            # Parse ShowPlayers output
            if parsing_players:
                m = self._PLAYER_ENTRY_RE.match(text)
                if m:
                    parsed_players.append({"name": m.group(1), "player_uid": m.group(2), "steam_id": m.group(3)})
                    continue
                else:
                    server.connected_players = parsed_players
                    parsing_players = False
                    parsed_players = []
            if self._SHOWPLAYERS_HEADER_RE.match(text):
                parsing_players = True
                parsed_players = []
                continue

            match_count = self._PLAYER_COUNT_RE.search(text)
            if match_count:
                try:
                    count = int(match_count.group(1))
                    server.player_count = count
                    if count > server.max_players_seen:
                        server.max_players_seen = count
                except ValueError:
                    pass

            if self._PLAYER_JOIN_RE.search(text) and not match_count:
                server.player_count = min(server.player_count + 1, server.settings.get("ServerPlayerMaxNum", 32))
                if server.player_count > server.max_players_seen:
                    server.max_players_seen = server.player_count

            if self._PLAYER_LEAVE_RE.search(text):
                server.player_count = max(server.player_count - 1, 0)

            if server.log_callback:
                await server.log_callback(server.id, text)

        if server.process.returncode is not None and server.status == "running":
            server.status = "stopped"
            server.process = None
            server.uptime_start = None
            self._save()

    def get_logs(self, server_id: str) -> List[str]:
        server = self._servers.get(server_id)
        if not server:
            return []
        return list(server.log_lines)

    async def mark_installed(self, server_id: str) -> None:
        server = self._servers.get(server_id)
        if server:
            server.installed = True
            await self._save()


server_manager = ServerManager()
