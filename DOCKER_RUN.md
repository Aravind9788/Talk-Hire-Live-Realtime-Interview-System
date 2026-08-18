# 🐳 TalkHire — Docker Run & Self-Hosted Deployment Guide

> Complete step-by-step instructions for running the **TalkHire Real-Time AI Interview Platform** and **Self-Hosted LiveKit SFU Server** using Docker.

---

## 🔒 1. Port Architecture & Safety Rules

TalkHire strictly complies with custom port constraints. The following ports are allocated:

| Service | Container Port | Host Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **TalkHire Backend + UI** | `7862` | **`7862`** | TCP | FastAPI Backend + React Web Studio |
| **LiveKit Signaling** | `7881` | **`7881`** | TCP | WebSocket & HTTP Signaling (replaces prohibited 7880) |
| **LiveKit WebRTC Media** | `7882` | **`7882`** | UDP | Low-Latency Real-Time Audio Transport |

> [!IMPORTANT]
> **Prohibited Ports Protected**: `5432, 6379, 8000, 8001, 8002, 8080, 7880` are **NEVER** used.

---

## 🚀 2. Quick Start: Full Stack via Docker Compose (Recommended)

This starts both the **LiveKit SFU server** and the **TalkHire FastAPI Backend** in the background with a single command.

### Step 1: Navigate to Project Root
```bash
cd /home/azureuser/Talk-Hire-Live-Realtime-Interview-System
```

### Step 2: Build and Launch Containers
```bash
docker compose -f livekit_infra/docker-compose.livekit.yml up -d --build
```

### Step 3: View Live Logs
```bash
docker compose -f livekit_infra/docker-compose.livekit.yml logs -f
```

### Step 4: Access the Application
* **Web UI (Landing & Interview Studio)**: `http://localhost:7862/`
* **Backend Health Check**: `http://localhost:7862/health`
* **LiveKit Signaling Endpoint**: `ws://localhost:7881`

---

## 🛠️ 3. Alternative: Running Individual Containers via `docker run`

If you prefer running standalone containers without Docker Compose:

### Step 1: Start the LiveKit SFU Server Container
```bash
docker run -d \
  --name talkhire-livekit \
  --restart unless-stopped \
  --network host \
  -v "$(pwd)/livekit_infra/livekit.yaml:/etc/livekit.yaml:ro" \
  livekit/livekit-server:latest \
  --config /etc/livekit.yaml --bind 0.0.0.0
```

### Step 2: Build the TalkHire Backend Image
```bash
docker build -f livekit_infra/Dockerfile.backend -t talkhire-backend .
```

### Step 3: Start the TalkHire Backend Container
```bash
docker run -d \
  --name talkhire-backend \
  --restart unless-stopped \
  -p 7862:7862 \
  --env-file .env \
  -e LIVEKIT_URL=ws://localhost:7881 \
  -e LIVEKIT_API_KEY=THK_aravind97 \
  -e LIVEKIT_API_SECRET=ZTKIVSQdq9UpObxVwfMvAmTpWLNUxRvaz0B_RgTnhoE \
  -e APP_PORT=7862 \
  talkhire-backend
```

---

## 📊 4. Monitoring & Verification Commands

### Check Container Status
```bash
docker ps --filter "name=talkhire"
```

### Check Backend Health
```bash
curl -s http://localhost:7862/health
```
*Expected output*: `{"status":"ok","bot":"TalkHire","transport":"livekit","active_rooms":0}`

### Check Port Safety (Verify no prohibited ports in use)
```bash
ss -tulpn | grep -E ':(7862|7881|7882)\b'
```

---

## 🛑 5. Stopping & Cleaning Up Containers

### Stop Docker Compose Stack
```bash
docker compose -f livekit_infra/docker-compose.livekit.yml down
```

### Stop Individual Containers (if started via `docker run`)
```bash
docker stop talkhire-backend talkhire-livekit
docker rm talkhire-backend talkhire-livekit
```

---

## 🔑 6. API Keys & Credentials Reference

* **LiveKit API Key**: `THK_aravind97`
* **LiveKit API Secret**: `ZTKIVSQdq9UpObxVwfMvAmTpWLNUxRvaz0B_RgTnhoE`
* **Environment File**: `.env` (automatically mounted in containers)

---
*Created for TalkHire Real-Time Technical Interview Platform.*
