import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

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
