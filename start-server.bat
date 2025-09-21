@echo off
echo 🚦 Smart Traffic Platform - Server Startup
echo ==========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Display Node.js version
echo ✅ Node.js version:
node --version
echo.

:: Check if package.json exists
if not exist package.json (
    echo ❌ package.json not found
    echo Please make sure you're in the correct directory
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
    echo.
) else (
    echo ✅ Dependencies already installed
    echo.
)

:: Start the server
echo 🚀 Starting Smart Traffic Platform Server...
echo.
echo 📱 Once started, open your browser and go to:
echo 🌐 http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause
