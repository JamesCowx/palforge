<p align="center">
  <img src="https://raw.githubusercontent.com/JamesCowx/palforge/main/static/palforge-logo.svg" alt="PalForge" width="480">
</p>

<p align="center">
  <em>Forge your PalWorld server — a premium web GUI for creating, configuring, and hosting PalWorld dedicated servers.</em>
</p>

<p align="center">
  <a href="https://github.com/JamesCowx/palforge/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="MIT License"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.10+"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://github.com/JamesCowx/palforge"><img src="https://img.shields.io/github/stars/JamesCowx/palforge?style=flat-square&logo=github" alt="GitHub Stars"></a>
  <a href="https://github.com/JamesCowx/palforge/issues"><img src="https://img.shields.io/github/issues/JamesCowx/palforge?style=flat-square" alt="Issues"></a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Online Deployment](#online-deployment--vps--cloud-server)
- [Usage Guide](#usage-guide)
- [Connecting Players](#connecting-others-to-your-server)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Settings Presets](#settings-presets)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [FAQ](#faq)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**PalForge** transforms the tedious command-line management of PalWorld dedicated servers into a sleek, intuitive web experience. Spin up servers, tweak every setting with toggles and dropdowns, watch real-time console logs stream in your browser, and share connection info with friends in one click — all from a beautifully crafted dark amber UI.

Whether you're hosting for a handful of friends on your home PC or running a 24/7 community server on a cloud VPS, PalForge handles the heavy lifting so you can just play.

<p align="center">
  <br>
  <a href="#quick-start">⚡ Get Started</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/JamesCowx/palforge/issues">🐛 Report Bug</a>
  &nbsp;&middot;&nbsp;
  <a href="https://github.com/JamesCowx/palforge/discussions">💬 Discussion</a>
</p>

---

## Features

| | Feature | |
|-|---------|-|
| 🖥️ | **Multi-Server Management** | Create, rename, and delete multiple server instances from the sidebar |
| ⚡ | **One-Click Install** | Downloads SteamCMD and PalWorld server (App ID 2394010) automatically |
| 📡 | **Live Console** | WebSocket-based real-time log streaming with colorized output |
| ⚙️ | **Settings Editor** | Full `PalWorldSettings.ini` editor with categorized fields and preset templates |
| ▶️ | **Server Controls** | Start, stop, restart with live status indicators and uptime tracking |
| 👥 | **Player Tracking** | Real-time player count, peak players, and uptime counter |
| 🌐 | **Connection Info** | Auto-detects LAN and public IP for easy sharing with friends |
| 🎯 | **Settings Presets** | Casual, Normal, Hardcore, and Creative templates — apply in one click |
| 📊 | **System Monitoring** | CPU and RAM usage display in the sidebar |
| ⌨️ | **Keyboard Shortcuts** | `N` = new server, `F2` = rename |
| 🎨 | **Responsive Dark Theme** | Premium amber-accented UI with animations and micro-interactions |
| 🐳 | **Docker Ready** | One-command deployment with Docker Compose |

---

## Quick Start

### Prerequisites

| Requirement | Details |
|-------------|---------|
| **Python** | 3.10+ (or Docker) |
| **Disk Space** | ~25 GB free for PalWorld server files |
| **OS** | Windows, Linux, or macOS |

### Option 1 — Direct Install <sub><sup>(Recommended)</sup></sub>

```bash
git clone https://github.com/JamesCowx/palforge.git
cd palforge
start.bat       # Windows
./start.sh      # Linux/macOS
```
> Your PalForge UI is now at **http://localhost:8080** ✨

### Option 2 — Docker

```bash
docker compose up -d
docker compose logs -f
```
> Your PalForge UI is now at **http://localhost:8080** ✨

### Option 3 — Manual Install

```bash
pip install -r requirements.txt
cp .env.example .env
python main.py     # development (auto-reload)
python run.py      # production
```
> Your PalForge UI is now at **http://localhost:8080** ✨

> **First run:** PalForge auto-installs SteamCMD on first launch. Each new server downloads the PalWorld dedicated server (~20 GB) automatically via SteamCMD.

> **New to PalWorld servers?** Start with the [Usage Guide](#usage-guide) after launching.

---

## Online Deployment (VPS / Cloud Server)

Run PalForge on a cloud VM so your PalWorld server stays online 24/7.

### Recommended VPS Specs

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **CPU** | 4 cores | 6+ cores |
| **RAM** | 8 GB | 16 GB |
| **Disk** | 50 GB SSD | 100 GB SSD |
| **OS** | Ubuntu 22.04 / Debian 12 | Ubuntu 24.04 |
| **Bandwidth** | 1 Gbps | 1 Gbps unmetered |

### Google Cloud (One-Click Deploy)

```bash
# Create instance in Toronto
gcloud compute instances create palforge \
    --zone=northamerica-northeast2-a \
    --machine-type=n2-standard-4 \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-ssd \
    --image-project=ubuntu-os-cloud \
    --image-family=ubuntu-2404-lts-amd64 \
    --tags=palforge

# Open ports
gcloud compute firewall-rules create palforge-web \
    --allow=tcp:8080 --target-tags=palforge
gcloud compute firewall-rules create palforge-game \
    --allow=udp:8211 --target-tags=palforge

# SSH in
gcloud compute ssh palforge
```

> **Instance cost:** ~$100/mo for n2-standard-4 (4 vCPU, 16 GB). Run `gcloud compute instances describe palforge` to find your public IP.

### Docker Deploy (Easiest)

```bash
ssh root@YOUR_VPS_IP
curl -fsSL https://get.docker.com | sh
git clone https://github.com/JamesCowx/palforge.git
cd palforge
docker compose up -d
```

Your web UI is live at **http://YOUR_VPS_IP:8080**.

### Firewall Rules

| Port | Protocol | Purpose |
|------|----------|---------|
| `8080` | TCP | PalForge web UI |
| `8211` | UDP | PalWorld game server (per instance) |

```bash
# Ubuntu (ufw)
ufw allow 8080/tcp
ufw allow 8211/udp
ufw enable
```

**DigitalOcean / Vultr / Linode:** Add inbound rules via their cloud firewall panel.

### Manual Deploy + systemd

```bash
ssh root@YOUR_VPS_IP
apt update && apt install -y python3 python3-pip python3-venv git
git clone https://github.com/JamesCowx/palforge.git
cd palforge
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Create `/etc/systemd/system/palforge.service`:

```ini
[Unit]
Description=PalForge Web GUI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/palforge
ExecStart=/root/palforge/venv/bin/python run.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable palforge
systemctl start palforge
systemctl status palforge
```

### SSL with Nginx + Let's Encrypt

```nginx
# /etc/nginx/sites-available/palforge
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/palforge /etc/nginx/sites-enabled/
certbot --nginx -d your-domain.com
nginx -t && systemctl reload nginx
```

> **Note:** The `Upgrade` and `Connection` proxy headers are required for WebSocket support (live console + install progress).

---

## Usage Guide

### 1. Install SteamCMD

Navigate to **Install & Updates** → click **Install SteamCMD**. One-time setup.

### 2. Create a Server

Press `N` or click **+ New Server** in the sidebar. Set a name, port (default 8211), and max players.

### 3. Install PalWorld

Select your server → **Install & Updates** → **Install / Update PalWorld Server**. Wait for the `__COMPLETE__` message (~20 GB download).

### 4. Configure Settings

Go to the **Settings** tab to fine-tune gameplay:

- Server name, password, admin password
- Player limits, PvP, cooperative play
- XP rates, capture rates, damage multipliers
- Building decay, egg hatching, drop rates
- Use the **Presets** dropdown for instant configuration

### 5. Start the Server

Click the green **Start** button. The **Overview** tab shows live stats: uptime, active players, memory usage, and peak player count.

### 6. Connect Players

The **Connection Info** card shows the exact addresses to share:

- **Local:** `192.168.x.x:8211` — for players on the same network
- **Internet:** `your-public-ip:8211` — for remote players (requires port forwarding)

In PalWorld: **Join Multiplayer** → **Direct Connection** → paste the address.

---

## Connecting Others to Your Server

### Local Network (Same Wi-Fi/LAN)

Share the **Local Network** address from Connection Info. No extra setup needed.

### Over the Internet

1. Find your public IP — PalForge auto-detects it
2. Forward **UDP port 8211** on your router to your machine
3. Share the **Internet** address with friends

### Port Forwarding Guide

| Router | Steps |
|--------|-------|
| **Most ISP routers** | Log in to `192.168.1.1` → Port Forwarding → Add rule: UDP 8211 → Your PC IP |
| **Windows Firewall** | Allow `PalServer.exe` (UDP inbound on port 8211) |

---

## Configuration

Copy `.env.example` to `.env` and customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8080` | Web UI port |
| `SERVER_DATA_DIR` | `servers` | Directory for server instances |
| `STEAMCMD_DIR` | `steamcmd` | SteamCMD installation directory |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | `info` | Logging verbosity |

---

## Project Structure

```
palforge/
├── main.py                  # FastAPI app (dev mode with hot reload)
├── run.py                   # Production entry point (uvicorn)
├── requirements.txt         # Python dependencies
├── .env.example             # Configuration template
├── .gitignore               # Git ignore rules
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # One-command Docker deployment
├── README.md                # You are here
├── LICENSE                  # MIT License
├── start.bat                # Windows launcher
├── start.sh                 # Linux/macOS launcher
│
├── api/                     # REST API & WebSocket endpoints
│   ├── servers.py           # Server CRUD, lifecycle, settings, commands
│   ├── install.py           # SteamCMD & server installation (REST)
│   ├── console.py           # Real-time console log streaming (WebSocket)
│   ├── install_ws.py        # Installation progress (WebSocket)
│   └── system.py            # System monitoring & network info
│
├── services/                # Core business logic
│   ├── server_manager.py    # Server process lifecycle & persistence
│   ├── steamcmd.py          # SteamCMD download & server install/update
│   ├── config_manager.py    # PalWorldSettings.ini read/write + presets
│   └── system.py            # CPU, RAM, network detection
│
├── static/                  # Web frontend
│   ├── index.html           # Single-page application
│   ├── palforge-logo.svg    # Full logo (anvil + hammer + text)
│   ├── palforge-icon.svg    # Favicon / app icon
│   ├── css/
│   │   └── style.css        # Custom dark UI design system
│   └── js/
│       └── app.js           # SPA logic (API, WebSocket, UI)
│
└── servers/                 # Server instances (created at runtime)
```

---

## API Reference

### Servers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/servers` | List all servers |
| `POST` | `/api/servers` | Create server (`{name, port}`) |
| `GET` | `/api/servers/{id}` | Get server details |
| `PUT` | `/api/servers/{id}/rename` | Rename server (`{name}`) |
| `DELETE` | `/api/servers/{id}` | Delete a server |
| `POST` | `/api/servers/{id}/start` | Start the server |
| `POST` | `/api/servers/{id}/stop` | Stop the server |
| `POST` | `/api/servers/{id}/restart` | Restart the server |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/servers/{id}/settings` | Get current settings |
| `PUT` | `/api/servers/{id}/settings` | Update settings (`{settings: {...}}`) |
| `GET` | `/api/servers/defaults/settings` | Get all default settings |
| `GET` | `/api/servers/defaults/presets` | Get available presets |

### Console & Commands

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/servers/{id}/command` | Send console command (`{command}`) |
| `GET` | `/api/servers/{id}/logs` | Get recent log lines |
| `WS` | `/ws/console/{id}` | WebSocket for live console streaming |

### Installation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/install/steamcmd/status` | Check if SteamCMD is installed |
| `POST` | `/api/install/steamcmd` | Install SteamCMD |
| `POST` | `/api/install/server/{id}` | Install/update PalWorld server |
| `WS` | `/ws/install/{id}` | WebSocket for install progress |
| `WS` | `/ws/update/{id}` | WebSocket for update progress |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/system` | CPU, RAM, disk info |
| `GET` | `/api/system/network` | Local IP + public IP detection |
| `GET` | `/health` | Health check |

---

## Settings Presets

| Preset | XP Rate | Capture Rate | PvP | Death Penalty | Difficulty |
|--------|---------|-------------|-----|---------------|-----------|
| **Casual** | 2× | 2× | Off | None | Easy |
| **Normal** | 1× | 1× | Off | All | Standard |
| **Hardcore** | 0.5× | 0.6× | On | All | Brutal |
| **Creative** | 5× | 3× | Off | None | Relaxed |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Create a new server |
| `F2` | Rename the selected server |

---

## FAQ

**Q: Can I run multiple servers on one machine?**  
A: Yes. Each server gets its own port and process. Create as many as your hardware can handle.

**Q: Does PalForge auto-update the PalWorld server files?**  
A: Click **Install / Update PalWorld Server** in the Install & Updates tab to fetch the latest version.

**Q: Can I use my own SteamCMD installation?**  
A: Yes. Set `STEAMCMD_DIR` in your `.env` to point to your existing SteamCMD folder.

**Q: Does it work on ARM / Raspberry Pi?**  
A: PalForge itself will run, but PalWorld dedicated server binaries are x86-64 only.

**Q: How do I backup my server?**  
A: Stop the server, then copy its folder from the `servers/` directory. Restore by placing the folder back.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+ · FastAPI · Uvicorn · WebSockets |
| **Frontend** | Vanilla HTML5 · CSS3 · JavaScript (ES6) |
| **Deployment** | Docker · Docker Compose · systemd · Nginx |
| **Protocols** | REST API · WebSocket · SteamCMD |
| **Platform** | Windows · Linux · macOS |

---

## Contributing

Contributions of all kinds are welcome — bug reports, feature requests, UI improvements, and documentation fixes.

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to your fork and open a **Pull Request**

Please ensure your code follows the project conventions and passes any existing checks.

---

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it for any purpose — personal or commercial.

---

<p align="center">
  <sub>
    <b>PalForge</b> — Forge your PalWorld server. &nbsp;·&nbsp;
    Built for the PalWorld community &nbsp;·&nbsp;
    Not affiliated with Pocketpair, Inc.
  </sub>
</p>
