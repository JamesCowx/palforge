<p align="center">
  <img src="https://raw.githubusercontent.com/JamesCowx/palforge/main/static/palforge-logo.svg" alt="PalForge" width="400">
</p>

<p align="center">
  <strong>A beautiful web dashboard to create, configure, and host PalWorld dedicated servers.</strong>
</p>

<p align="center">
  <a href="https://github.com/JamesCowx/palforge/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/python-3.10%2B-blue?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi" alt="FastAPI"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://github.com/JamesCowx/palforge/stargazers"><img src="https://img.shields.io/github/stars/JamesCowx/palforge?style=flat-square" alt="Stars"></a>
</p>

---

## Why PalForge?

Stop managing PalWorld servers through cryptic command lines and config files. PalForge gives you a polished dashboard with everything in one place — point, click, and play.

- **Landing page** with login protection for your server panel
- **Multi-user auth** with admin/user roles (create accounts, manage access)
- **One-click SteamCMD** installer — downloads and updates PalWorld automatically
- **Live console** with WebSocket streaming, colorized output, and real-time monitoring
- **Visual settings editor** with 6 game presets and categorized fields
- **Player management** — scan connected players, kick with reason from the UI
- **Connection info** with auto-detected LAN + public IP, one-click copy

---

## Quick Start

```bash
git clone https://github.com/JamesCowx/palforge.git
cd palforge

# Windows
start.bat

# Linux / macOS
./start.sh
```

Open **http://localhost:8080** · Login: `Admin` / `Chloe`

> **Requirements:** Python 3.10+ or Docker, ~25 GB free disk space for game files.

---

## Docker

```bash
docker compose up -d
```
Open **http://localhost:8080**.

---

## Deploy to Google Cloud

```bash
# Create instance (Toronto)
gcloud compute instances create palforge \
    --zone=northamerica-northeast2-a \
    --machine-type=n2-standard-4 \
    --boot-disk-size=50GB --boot-disk-type=pd-ssd \
    --image-project=ubuntu-os-cloud \
    --image-family=ubuntu-2404-lts-amd64 \
    --tags=palforge

# Open ports
gcloud compute firewall-rules create palforge-web --allow=tcp:8080 --target-tags=palforge
gcloud compute firewall-rules create palforge-game --allow=udp:8211 --target-tags=palforge

# SSH in and deploy
gcloud compute ssh palforge --zone=northamerica-northeast2-a
```

Inside the VM:

```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/JamesCowx/palforge.git && cd palforge
docker compose up -d
```

Your panel is at `http://VM_IP:8080`. To find your IP:

```bash
curl -s ifconfig.me
```

> **Cost:** ~$100/month (n2-standard-4: 4 vCPU, 16 GB RAM, 50 GB SSD).

---

## Custom Domain + SSL

After pointing your domain's A record to the VM IP:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

sudo tee /etc/nginx/sites-available/palforge << 'EOF'
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
EOF

sudo ln -s /etc/nginx/sites-available/palforge /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
```

Don't forget to open ports 80 and 443 on GCP:

```bash
gcloud compute firewall-rules create palforge-http --allow=tcp:80 --target-tags=palforge
gcloud compute firewall-rules create palforge-https --allow=tcp:443 --target-tags=palforge
```

---

## Usage

1. **Login** — `Admin` / `Chloe` (change in `.env`)
2. **Create a server** — Press `N` or click **+ New Server**
3. **Install SteamCMD** — Go to **Install & Updates** tab, click Install
4. **Install PalWorld** — Click **Install / Update PalWorld** (~20 GB download)
5. **Pick a preset** — Settings tab has 6 presets: Beginner, Casual, Normal, Hard, Creative, Speed Run
6. **Start the server** — Click Start, monitor uptime and players on the Overview tab
7. **Share with friends** — Copy the address from Connection Info

---

## Admin Dashboard

**Users tab** (admin only): Create, edit, and delete user accounts. Each user has a role (admin or user).

**Players card** (Overview tab): Click **Refresh** to scan connected players via `ShowPlayers`. Kick any player with an optional reason.

---

## Settings Presets

| Preset | XP | Capture | Eggs | Death Penalty | PvP | Vibe |
|--------|-----|---------|------|---------------|-----|------|
| **Beginner** | 300% | 250% | 2h | None | Off | Extra forgiving |
| **Casual** | 200% | 200% | 36h | None | Off | Relaxed |
| **Normal** | 100% | 100% | 72h | Drop All | Off | Standard |
| **Hard** | 50% | 60% | 144h | Drop All | On | Brutal |
| **Creative** | 500% | 300% | Instant | None | Off | Unlimited |
| **Speed Run** | 400% | 200% | Instant | Drop Items | Off | Race to endgame |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_USERNAME` | `Admin` | Admin username |
| `AUTH_PASSWORD` | `Chloe` | Admin password |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8080` | Web UI port |
| `SERVER_DATA_DIR` | `servers` | Server instances directory |
| `STEAMCMD_DIR` | `steamcmd` | SteamCMD install directory |
| `DATA_DIR` | _auto_ | JSON data file directory |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+ · FastAPI · Uvicorn · WebSockets |
| Frontend | Vanilla HTML/CSS/JS · Inter font · Canvas particles |
| Tooling | Docker · Docker Compose · SteamCMD |
| Platform | Windows · Linux · macOS |

---

## Project Structure

```
palforge/
├── main.py, run.py              # App entry points
├── api/                         # REST + WebSocket endpoints
├── services/                    # Server lifecycle, SteamCMD, config, auth
├── static/                      # Frontend (SPA)
│   ├── css/style.css            # Dark glass-morphism theme
│   ├── js/app.js                # App logic, canvas bg, WebSockets
│   └── index.html               # Landing + login + dashboard
├── Dockerfile, docker-compose.yml
└── requirements.txt
```

---

## API Reference

### Servers
`GET /api/servers` — List · `POST /api/servers` — Create · `GET /api/servers/{id}` — Get · `PUT /api/servers/{id}/rename` · `DELETE /api/servers/{id}` · `POST /api/servers/{id}/start|stop|restart`

### Settings
`GET /api/servers/{id}/settings` · `PUT /api/servers/{id}/settings` · `GET /api/servers/defaults/presets` · `GET /api/servers/defaults/settings`

### Players
`GET /api/servers/{id}/players` — List connected · `POST /api/servers/{id}/players/kick` — Kick by SteamID

### Console
`POST /api/servers/{id}/command` · `GET /api/servers/{id}/logs` · `WS /ws/console/{id}`

### Install
`GET /api/install/steamcmd/status` · `POST /api/install/steamcmd` · `POST /api/install/server/{id}` · `WS /ws/install/{id}`

### Auth
`POST /api/auth/login` · `POST /api/auth/logout` · `GET/POST/PUT/DELETE /api/users` (admin only)

### System
`GET /api/system` · `GET /api/system/network` · `GET /health`

---

## FAQ

**Can I run multiple servers?** Yes, each gets its own port and process.

**How do I update PalWorld?** Click **Install / Update PalWorld** — SteamCMD validates and fetches the latest version.

**How do I backup?** Stop the server, copy its folder from `servers/`. Restore by placing it back.

**Does it work on ARM?** PalForge runs on ARM, but PalWorld dedicated server is x86-64 only.

**How do I change the admin password?** Set `AUTH_PASSWORD` in `.env` or edit the user from the Users tab.

---

## License

MIT — free to use, modify, and distribute. Not affiliated with Pocketpair, Inc.
