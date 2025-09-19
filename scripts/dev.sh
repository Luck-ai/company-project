#!/bin/bash

# Development setup script
set -e

echo "🚀 Setting up Stock Management Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "📦 Building development containers..."
docker-compose build frontend-dev electron-dev

echo "🔧 Starting development environment..."
echo "Choose your development mode:"
echo "1) Frontend only (recommended for web development)"
echo "2) Electron development (includes GUI via VNC)"
echo "3) Both frontend and Electron"

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🌐 Starting frontend development server..."
        docker-compose --profile development up frontend-dev
        ;;
    2)
        echo "🖥️ Starting Electron development environment..."
        echo "Access the GUI via browser at: http://localhost:6080"
        docker-compose --profile electron-dev up electron-dev
        ;;
    3)
        echo "🚀 Starting both frontend and Electron..."
        echo "Frontend: http://localhost:3000"
        echo "Electron GUI: http://localhost:6080"
        docker-compose --profile development --profile electron-dev up
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac