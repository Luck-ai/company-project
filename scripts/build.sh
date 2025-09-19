#!/bin/bash

# Production Build Script for Stock Management Application
set -e

echo "🏗️  Building Stock Management Application for Production..."

# Build frontend image
echo "📦 Building Frontend Docker image..."
docker build -t stock-management-frontend:latest -f frontend/Dockerfile frontend/

# Build Electron image
echo "🖥️  Building Electron Docker image..."
docker build -t stock-management-electron:latest -f frontend/Dockerfile.electron --target production frontend/

# Tag images with version if provided
if [ ! -z "$1" ]; then
    VERSION=$1
    echo "🏷️  Tagging images with version: $VERSION"
    docker tag stock-management-frontend:latest stock-management-frontend:$VERSION
    docker tag stock-management-electron:latest stock-management-electron:$VERSION
fi

echo "✅ Build completed successfully!"
echo ""
echo "Available images:"
docker images | grep stock-management

echo ""
echo "🚀 To run the application:"
echo "Frontend only: docker-compose up frontend"
echo "With Electron: docker-compose --profile electron up"
echo "With Nginx: docker-compose --profile production up"