# 🐳 Docker Quick Reference

## Common Commands

### Development
```bash
# Frontend development
docker-compose --profile development up frontend-dev

# Electron development (GUI via browser)
docker-compose --profile electron-dev up electron-dev
```

### Production
```bash
# Frontend only
docker-compose up frontend

# With Electron GUI
docker-compose --profile electron up

# Full production stack
docker-compose --profile production up
```

### Utilities
```bash
# Build all images
./scripts/build.sh

# Start development environment
./scripts/dev.sh

# View logs
docker-compose logs -f

# Clean up
docker-compose down --volumes
```

## Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Web application |
| Electron GUI | http://localhost:6080 | Desktop app in browser |
| VNC Direct | localhost:5900 | Direct VNC connection |
| Nginx Proxy | http://localhost | Production frontend |
| Health Check | http://localhost:8090/health | Service status |

## Profiles

- `development`: Hot reload development
- `electron-dev`: Electron development with GUI
- `electron`: Production Electron
- `production`: Full production with Nginx

## Troubleshooting

```bash
# Check service status
docker-compose ps

# Restart specific service
docker-compose restart [service]

# View real-time logs
docker-compose logs -f [service]

# Clean rebuild
docker-compose build --no-cache [service]
```