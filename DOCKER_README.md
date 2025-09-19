# Docker Support for Stock Management Application

This document provides comprehensive guidance for running the Stock Management application using Docker, including both web frontend and Electron desktop versions.

## 🏗️ Architecture Overview

The application supports multiple deployment modes:

- **Frontend Only**: Next.js web application
- **Electron Desktop**: Full desktop application with GUI access via VNC
- **Development Mode**: Live reload and development tools
- **Production Mode**: Optimized builds with Nginx reverse proxy

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM (for Electron GUI support)
- Available ports: 3000, 5900, 6080, 8080

## 🚀 Quick Start

### Frontend Web Application

```bash
# Build and run frontend only
docker-compose up frontend

# Access at: http://localhost:3000
```

### Electron Desktop Application

```bash
# Build and run Electron with GUI
docker-compose --profile electron up

# Access GUI via browser: http://localhost:6080
# VNC client: localhost:5900
```

## 🛠️ Development Setup

### Automated Setup (Recommended)

**Linux/macOS:**
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

**Windows:**
```cmd
scripts\dev.bat
```

### Manual Development Setup

**Frontend Development:**
```bash
# Start development server with hot reload
docker-compose --profile development up frontend-dev

# Access at: http://localhost:3000
```

**Electron Development:**
```bash
# Start Electron development environment
docker-compose --profile electron-dev up electron-dev

# Access GUI: http://localhost:6080
# Frontend: http://localhost:3001
```

## 🏭 Production Deployment

### Build Production Images

**Linux/macOS:**
```bash
chmod +x scripts/build.sh
./scripts/build.sh [version]
```

**Windows:**
```cmd
scripts\build.bat [version]
```

### Production Deployment Options

**Option 1: Frontend + Nginx**
```bash
docker-compose --profile production up
```
- Frontend: http://localhost
- Health check: http://localhost:8090/health

**Option 2: Electron Production**
```bash
docker-compose --profile electron up
```
- GUI: http://localhost:6080
- Frontend: http://localhost:3000

**Option 3: Full Stack**
```bash
docker-compose --profile production --profile electron up
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Application
NODE_ENV=production
NEXT_URL=http://localhost:3000

# VNC Configuration (for Electron)
VNC_PASSWORD=your_secure_password
DISPLAY=:99

# Optional: Redis
REDIS_URL=redis://redis:6379
```

### Docker Compose Profiles

- `development`: Development with hot reload
- `electron-dev`: Electron development environment
- `electron`: Production Electron
- `production`: Full production stack with Nginx

## 🖥️ Electron GUI Access

The Electron application runs in a containerized environment with GUI access through:

### Web Browser (Recommended)
- URL: http://localhost:6080
- Full desktop experience in browser
- No additional software required

### VNC Client
- Host: localhost
- Port: 5900
- No password required (development)

### Supported VNC Clients
- **Windows**: TightVNC, RealVNC
- **macOS**: Screen Sharing, VNC Viewer
- **Linux**: Remmina, TigerVNC

## 📁 File Structure

```
project/
├── docker-compose.yml              # Main orchestration
├── docker-compose.override.yml     # Development overrides
├── frontend/
│   ├── Dockerfile                  # Next.js web app
│   ├── Dockerfile.electron         # Electron desktop app
│   └── .dockerignore              # Build optimization
├── docker/
│   └── nginx/
│       └── nginx.conf              # Reverse proxy config
└── scripts/
    ├── build.sh / build.bat        # Production build
    └── dev.sh / dev.bat            # Development setup
```

## 🔍 Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3000

# Kill processes on port
sudo lsof -ti:3000 | xargs kill -9
```

**Docker Build Failures:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

**Electron GUI Issues:**
```bash
# Check container logs
docker-compose logs electron

# Restart VNC services
docker-compose restart electron
```

### Performance Optimization

**Memory Limits:**
```yaml
# In docker-compose.yml
services:
  electron:
    mem_limit: 2g
    memswap_limit: 2g
```

**Build Optimization:**
```bash
# Multi-stage builds are already optimized
# Use .dockerignore to exclude unnecessary files
```

## 🔒 Security Considerations

### Development
- VNC has no password (localhost only)
- Debug ports exposed
- Development dependencies included

### Production
- Set VNC password via environment variables
- Use Nginx reverse proxy
- Minimal production dependencies
- Health checks enabled

## 📊 Monitoring

### Health Checks
```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Health endpoint
curl http://localhost:8090/health
```

### Performance Monitoring
```bash
# Resource usage
docker stats

# Container inspection
docker inspect stock-management-frontend
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild images
docker-compose build --no-cache

# Restart services
docker-compose down && docker-compose up -d
```

### Cleanup
```bash
# Remove all containers and images
docker-compose down --rmi all --volumes

# Clean system
docker system prune -a --volumes
```

## 📞 Support

For issues related to:
- **Docker setup**: Check logs and troubleshooting section
- **Application bugs**: Review application logs
- **Performance**: Monitor resource usage and optimize

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates (if using HTTPS)
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Resource limits set
- [ ] Health checks verified

---

*For more information, see the individual Dockerfile configurations and docker-compose.yml comments.*