<div align="center">
  <img src="src/assets/logo.svg" alt="ZHIYIN Logo" width="128" />
  <h1>ZHIYIN · 知音</h1>
  <p>Self-hosted NAS music streaming web client</p>

  ![Vue](https://img.shields.io/badge/Vue_3-4FC08D?logo=vuedotjs&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)

  [简体中文](./README_CN.md) | English
</div>

---

## Introduction

**ZHIYIN (知音)** is a music streaming frontend application designed for NAS users, providing a modern web interface to manage and play your personal music library.

### Features

- 🎵 Online streaming with multiple quality options (128k / 192k / 320k / FLAC / Original)
- 📝 Synchronized lyrics display with bilingual support
- 🎨 Light / Dark theme switching
- 🌐 Chinese / English bilingual interface
- 📱 Responsive design for desktop and mobile
- 🔍 Music library scanning & management
- 📊 Playback statistics & data visualization
- 🎯 Smart recommendations

### Tech Stack

| Technology | Purpose |
|------------|---------|
| Vue 3 + Composition API | Frontend framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Pinia | State management |
| Vue Router | Routing |
| Vue I18n | Internationalization |
| Howler.js | Audio playback |
| Vite | Build tool |

---

## Backend Deployment

> **This repository contains frontend code only.** To fully experience ZHIYIN, you need to deploy the backend service first.

Backend GitHub repository (includes Docker examples and config samples): [**github/zhiyin**](https://github.com/qwex888/zhiyin)

Backend Docker image: [**qwex333/zhiyin**](https://hub.docker.com/r/qwex333/zhiyin)

```bash
docker pull qwex333/zhiyin:latest
```

Quick start with Docker Compose (example):

```yaml
version: '3.8'

services:
  zhiyin:
    image: qwex333/zhiyin:latest
    container_name: zhiyin
    
    ports:
      - "8080:8080"
    
    volumes:
      # Music directory (read-only) - change to your actual path
      # For additional paths, mount them here first, then add the docker path in config.toml
      # Example: - /vol1/1000/Music:/music:ro
      - ./music:/music:ro
      
      # Database directory (persistent)
      - ./data:/data

      # Config file
      # First time: cp config.toml.example config.toml
      # Then edit config.toml
      - ./config.toml:/app/config.toml:ro
      
      # Cover cache directory (optional, for manual cover management)
      # - ./covers:/covers
      
      
      # Web frontend (optional, mount frontend build output to container)
      # - ./web:/app/web:ro
    
    environment:
      # Log level
      - RUST_LOG=info
      
      # Initial admin (only takes effect on first startup, can be removed after creation)
      # - MUSIC_ADMIN_USER=admin
      # - MUSIC_ADMIN_PASSWORD=your_secure_password
      
      # Note: other settings should be configured in config.toml

    # Memory limit (including file page cache), prevents excessive memory usage on low-memory hosts
    # 256m works for most cases; use 192m for very low memory hosts, 512m for better cache performance
    # mem_limit: 256m
    
    restart: unless-stopped
    
    # Health check (curl/wget not installed in image, uses built-in binary HTTP self-check)
    # If wget is available: test: ["CMD-SHELL", "wget -qO- http://localhost:8080/api/health || exit 1"]
    healthcheck:
      test: ["CMD", "zhiyin", "--health-check"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    
    networks:
      - music-network

networks:
  music-network:
    driver: bridge

# Usage:
# 1. Copy config: cp config.toml.example config.toml
# 2. Edit config.toml:
#    - Music scan directories (roots)
#    - Database path (path)
#    - Other optional settings
# 3. Update music directory path in volumes (change ./music to your actual path)
# 4. Start: docker-compose up -d
# 5. View logs: docker-compose logs -f
# 6. Stop: docker-compose down
# 7. Access API: http://localhost:8080/api/songs
# 8. Access docs: http://localhost:8080/swagger-ui
#
# Hot reload config (no restart needed):
#   docker-compose kill -s SIGHUP zhiyin


```

The backend listens on port `8080` by default. During frontend development, Vite proxies `/api` requests to the backend.

---

## Local Development

### Prerequisites

- Node.js >= 18
- pnpm / npm / yarn

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server (default port 7321)
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Dev Proxy Configuration

In development mode, API requests are proxied to the backend service. Update `proxy.target` in `vite.config.ts` to point to your backend:

```ts
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
  }
}
```

---

## Sponsor & Support

ZHIYIN is an open-source project, free to use. If you find it helpful, you can support the development by:

- ⭐ Starring the project
- 🐛 Submitting Issues or PRs
- ☕ Buying the author a coffee

<div align="center">
  <img src="docs/donate/alipay.jpg" alt="Alipay" width="200" />
</div>

---

## License

MIT
