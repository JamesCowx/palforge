# PalForge

A web-based GUI for creating, configuring, and hosting [PalWorld](https://store.steampowered.com/app/1623730/Palworld/) dedicated servers. Built with **FastAPI** + vanilla **HTML/CSS/JS** featuring live console streaming, settings presets, one-click SteamCMD installation, real-time server monitoring, and a premium dark UI.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-green.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Server Management** | Create, rename, and delete multiple PalWorld server instances |
| **One-Click Install** | Downloads SteamCMD and PalWorld dedicated server (App ID 2394010) automatically |
| **Live Console** | WebSocket-based real-time log streaming with colorized output |
| **Settings Editor** | Full PalWorldSettings.ini editor with categorized fields and preset templates |
| **Server Controls** | Start, stop, restart with live status indicators and uptime tracking |
| **Player Tracking** | Real-time player count, peak players, and uptime counter |
| **Connection Info** | Auto-detects LAN and public IP for easy sharing with friends |
| **Settings Presets** | Casual, Normal, Hardcore, and Creative preset templates |
| **System Monitoring** | CPU and RAM usage display in sidebar |
| **Keyboard Shortcuts** | `N` = new server, `F2` = rename |
| **Responsive Dark Theme** | Premium UI with warm amber accent, animations, and micro-interactions |
| **Docker Ready** | One-command deployment with Docker and docker-compose |

---

## Quick Start

### Prerequisites

- **Python 3.10+**
- **~25 GB free disk space** for PalWorld server files
- **Windows, Linux, or macOS**

### Option 1 &mdash; Direct Install (Recommended)

```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/palforge.git
cd palforge

# Run the installer and launcher
start.bat       # Windows
./start.sh      # Linux/macOS
```

Then open **http://localhost:8080** in your browser.

### Option 2 &mdash; Docker

```bash
# Build and start (requires Docker and docker-compose)
docker compose up -d

# View logs
docker compose logs -f
```

Then open **http://localhost:8080**.

### Option 3 &mdash; Manual Install

```bash
cd palforge
pip install -r requirements.txt
cp .env.example .env    # Optional: customize configuration

# Development mode (auto-reload on code changes)
python main.py

# Production mode
python run.py
```

Then open **http://localhost:8080**.

> **Note:** The first time you use PalForge, it will auto-install SteamCMD. After that, each new server will auto-download the PalWorld dedicated server files via SteamCMD (approx. 20 GB).

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
| **Bandwidth** | 1 Gbps unmetered | 1 Gbps unmetered |

### Step-by-Step (Docker — Easiest)

```bash
# 1. SSH into your VPS
ssh root@YOUR_VPS_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone PalForge
git clone https://github.com/JamesCowx/palforge.git
cd palforge

# 4. Start it
docker compose up -d

# 5. Check it's running
docker compose logs -f
```

Your web UI is now live at **http://YOUR_VPS_IP:8080**.

### Firewall / Security Group

Open these ports in your VPS firewall:

| Port | Protocol | Purpose |
|------|----------|---------|
| `8080` | TCP | PalForge web UI |
| `8211` | UDP | PalWorld game server (per instance) |

**Ubuntu (ufw):**
```bash
ufw allow 8080/tcp
ufw allow 8211/udp
ufw enable
```

**DigitalOcean / Vultr / Linode:** Add an inbound firewall rule via their web panel.

### Step-by-Step (Manual — No Docker)

```bash
# 1. SSH into your VPS
ssh root@YOUR_VPS_IP

# 2. Install Python 3.10+ and pip
apt update && apt install -y python3 python3-pip python3-venv git

# 3. Clone and install
git clone https://github.com/JamesCowx/palforge.git
cd palforge
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# 4. Run (stays alive via systemd — see below)
python run.py
```

### Keep It Alive (systemd Service)

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

Then enable and start:
```bash
systemctl daemon-reload
systemctl enable palforge
systemctl start palforge
systemctl status palforge
```

### (Optional) Add SSL with Nginx + Let's Encrypt

Create `/etc/nginx/sites-available/palforge`:

```nginx
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

> **Note:** The `proxy_set_header Upgrade` and `Connection` lines are required for WebSocket support (live console + install progress).

---

## Usage

1. **Install SteamCMD** &mdash; Navigate to the **Install &amp; Updates** tab and click **Install SteamCMD**. This is a one-time setup.

2. **Create a Server** &mdash; Press `N` or click **+ New Server** in the sidebar. Set a name, port (default 8211), and max players.

3. **Install PalWorld** &mdash; Select your server from the sidebar, go to **Install &amp; Updates**, and click **Install / Update PalWorld Server**. This downloads the dedicated server (~20 GB). Wait for the `__COMPLETE__` message.

4. **Configure Settings** &mdash; Go to the **Settings** tab to fine-tune everything:
   - Server name, password, admin password
   - Player limits, PvP settings, cooperative play
   - Experience rates, capture rates, damage multipliers
   - Building decay, egg hatching time, drop rates
   - Use the **Presets** dropdown (Casual, Normal, Hardcore, Creative) for quick configuration

5. **Start the Server** &mdash; Click the green **Start** button. The Overview tab shows live stats: uptime, active players, memory usage, and peak player count.

6. **Connect Players** &mdash; The **Connection Info** card (Overview tab) shows the exact addresses:
   - **Local Network** &mdash; For players on the same Wi-Fi/LAN: `192.168.x.x:8211`
   - **Internet** &mdash; For remote players: `your-public-ip:8211` (requires port forwarding)

   In PalWorld: **Join Multiplayer** → **Direct Connection** → paste the address.

---

## Connecting Others to Your Server

### Local Network (Same Wi-Fi/LAN)
Share the **Local Network** address shown in Connection Info. No extra setup needed.

### Over the Internet
1. **Find your public IP** &mdash; The Connection Info card auto-detects it
2. **Forward UDP port 8211** on your router to your machine's local IP
3. Share the **Internet** address with friends

### Port Forwarding Guide (Common Routers)
| Router | Instructions |
|--------|-------------|
| **Most ISPs** | Log in to `192.168.1.1` → Port Forwarding → Add rule: UDP 8211 → Your PC IP |
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
│   │   └── style.css         # Custom dark UI design system
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
| `GET` | `/api/servers/defaults/presets` | Get available presets (casual, normal, hardcore, creative) |

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
|--------|---------|-------------|-----|---------------|------------|
| **Casual** | 2x | 2x | Off | None | Easy |
| **Normal** | 1x | 1x | Off | All | Standard |
| **Hardcore** | 0.5x | 0.6x | On | All | Brutal |
| **Creative** | 5x | 3x | Off | None | Relaxed |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | Create a new server |
| `F2` | Rename the selected server |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push to your fork and open a Pull Request

Please ensure all code passes the existing tests and follows the project conventions.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <b>PalForge</b> &mdash; Forge your PalWorld server.
</p>
