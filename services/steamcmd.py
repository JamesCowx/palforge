import asyncio
import os
import platform
import logging

logger = logging.getLogger("palforge")

STEAMCMD_URLS = {
    "Windows": "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip",
    "Linux": "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz",
}

PALWORLD_APP_ID = "2394010"


def _get_steamcmd_base() -> str:
    return os.environ.get(
        "STEAMCMD_DIR",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "steamcmd"),
    )


def get_steamcmd_path() -> str:
    base = _get_steamcmd_base()
    if platform.system() == "Windows":
        return os.path.join(base, "steamcmd.exe")
    return os.path.join(base, "steamcmd.sh")


def get_steamcmd_dir() -> str:
    return _get_steamcmd_base()


async def is_steamcmd_installed() -> bool:
    return os.path.exists(get_steamcmd_path())


async def install_steamcmd() -> bool:
    import urllib.request
    import zipfile
    import tarfile

    sdir = get_steamcmd_dir()
    os.makedirs(sdir, exist_ok=True)

    system = platform.system()
    url = STEAMCMD_URLS.get(system)
    if not url:
        return False

    archive_path = os.path.join(sdir, "steamcmd_archive")

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()

    with open(archive_path, "wb") as f:
        f.write(data)

    if system == "Windows":
        with zipfile.ZipFile(archive_path, "r") as zf:
            zf.extractall(sdir)
    else:
        with tarfile.open(archive_path, "r:gz") as tf:
            tf.extractall(sdir)

    os.remove(archive_path)

    if system == "Linux":
        steamcmd = get_steamcmd_path()
        os.chmod(steamcmd, 0o755)

    return await is_steamcmd_installed()


async def run_steamcmd(args: list[str], cwd: str = None) -> tuple[int, str, str]:
    cmd = [get_steamcmd_path()] + args
    if platform.system() == "Windows":
        cmd = ["cmd", "/c"] + cmd
    if cwd is None:
        cwd = get_steamcmd_dir()

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
    )
    stdout, stderr = await process.communicate()
    return process.returncode, stdout.decode(errors="replace"), stderr.decode(errors="replace")


async def install_palworld_server(install_dir: str, on_progress=None) -> bool:
    sdir = get_steamcmd_dir()
    os.makedirs(install_dir, exist_ok=True)

    if platform.system() != "Windows":
        init_proc = await asyncio.create_subprocess_exec(
            get_steamcmd_path(), "+quit",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, cwd=sdir,
        )
        await init_proc.communicate()

    args = [
        get_steamcmd_path(),
        "+force_install_dir", install_dir,
        "+login", "anonymous",
        "+app_update", PALWORLD_APP_ID, "validate",
        "+quit",
    ]

    for attempt in range(3):
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, cwd=sdir,
        )

        output_lines = []
        async for line in process.stdout:
            text = line.decode(errors="replace").strip()
            output_lines.append(text)
            if on_progress:
                await on_progress(text)

        await process.wait()

        if process.returncode == 0:
            return True

        combined = " ".join(output_lines)
        if "Missing configuration" in combined:
            if on_progress:
                await on_progress(f"Retrying in 5s (attempt {attempt+2}/3)...")
            await asyncio.sleep(5)
            continue

        tail = output_lines[-10:] if len(output_lines) > 10 else output_lines
        logger.error("SteamCMD failed (code %s): %s", process.returncode, " | ".join(tail))
        return False

    return False


async def update_palworld_server(install_dir: str, on_progress=None) -> bool:
    return await install_palworld_server(install_dir, on_progress)
