@echo off
REM Development setup script for Windows

echo 🚀 Setting up Stock Management Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

echo 📦 Building development containers...
docker-compose build frontend-dev electron-dev

echo 🔧 Starting development environment...
echo Choose your development mode:
echo 1) Frontend only (recommended for web development)
echo 2) Electron development (includes GUI via VNC)
echo 3) Both frontend and Electron

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo 🌐 Starting frontend development server...
    docker-compose --profile development up frontend-dev
) else if "%choice%"=="2" (
    echo 🖥️ Starting Electron development environment...
    echo Access the GUI via browser at: http://localhost:6080
    docker-compose --profile electron-dev up electron-dev
) else if "%choice%"=="3" (
    echo 🚀 Starting both frontend and Electron...
    echo Frontend: http://localhost:3000
    echo Electron GUI: http://localhost:6080
    docker-compose --profile development --profile electron-dev up
) else (
    echo ❌ Invalid choice. Exiting.
    exit /b 1
)