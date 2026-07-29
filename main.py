import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from services.auth import make_token, verify_token, check_credentials
from api.servers import router as servers_router
from api.install import router as install_router
from api.console import router as console_router
from api.install_ws import router as install_ws_router
from api.system import router as system_router

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "info").upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("palforge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PalForge starting")
    yield
    logger.info("PalForge shutting down")


app = FastAPI(
    title="PalForge",
    description="Web GUI for creating and hosting PalWorld dedicated servers",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    public_paths = ("/health", "/css/", "/js/", "/palforge-", "/favicon")
    path = request.url.path
    if path.startswith(public_paths) or path in ("/", "/index.html"):
        return await call_next(request)

    if path == "/api/auth/login" or path.startswith("/api/auth"):
        return await call_next(request)

    token = request.cookies.get("palforge_token")
    if token and verify_token(token):
        return await call_next(request)

    if path.startswith("/api/"):
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    return JSONResponse({"error": "unauthorized"}, status_code=401)


@app.post("/api/auth/login")
async def login(request: Request):
    try:
        body = await request.json()
        username = body.get("username", "")
        password = body.get("password", "")
    except Exception:
        return JSONResponse({"error": "invalid request"}, status_code=400)

    if not check_credentials(username, password):
        return JSONResponse({"error": "invalid credentials"}, status_code=401)

    token = make_token(username, password)
    response = JSONResponse({"ok": True})
    response.set_cookie("palforge_token", token, httponly=True, samesite="lax", max_age=86400 * 7)
    return response


@app.post("/api/auth/logout")
async def logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie("palforge_token")
    return response


app.include_router(servers_router)
app.include_router(install_router)
app.include_router(console_router)
app.include_router(install_ws_router)
app.include_router(system_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}


static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host=host, port=port, reload=True, log_level="info")
