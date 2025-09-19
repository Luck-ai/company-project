@echo off
REM Production Build Script for Stock Management Application (Windows)

echo 🏗️  Building Stock Management Application for Production...

REM Build frontend image
echo 📦 Building Frontend Docker image...
docker build -t stock-management-frontend:latest -f frontend/Dockerfile frontend/

if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)

REM Build Electron image
echo 🖥️  Building Electron Docker image...
docker build -t stock-management-electron:latest -f frontend/Dockerfile.electron --target production frontend/

if %ERRORLEVEL% neq 0 (
    echo ❌ Electron build failed!
    exit /b 1
)

REM Tag images with version if provided
if not "%1"=="" (
    set VERSION=%1
    echo 🏷️  Tagging images with version: %VERSION%
    docker tag stock-management-frontend:latest stock-management-frontend:%VERSION%
    docker tag stock-management-electron:latest stock-management-electron:%VERSION%
)

echo ✅ Build completed successfully!
echo.
echo Available images:
docker images | findstr stock-management

echo.
echo 🚀 To run the application:
echo Frontend only: docker-compose up frontend
echo With Electron: docker-compose --profile electron up
echo With Nginx: docker-compose --profile production up