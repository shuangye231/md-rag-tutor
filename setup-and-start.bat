@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title AI Tutor - Setup and Start

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker was not found. Install and start Docker Desktop first.
  echo https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Desktop is not running. Start it and try again.
  pause
  exit /b 1
)

docker compose version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Compose is unavailable. Update Docker Desktop and try again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo First-time configuration. The API key stays only in this local .env file.
  set /p "CLIENT_API_KEY=Enter your OpenAI-compatible API key (leave blank for Ollama only): "
  set /p "CLIENT_BASE_URL=API base URL [https://api.ccode.vip/v1]: "
  if not defined CLIENT_BASE_URL set "CLIENT_BASE_URL=https://api.ccode.vip/v1"
  for /f %%G in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"') do set "CLIENT_ADMIN_KEY=%%G"
  powershell -NoProfile -Command "$lines=@('ADMIN_API_KEY='+$env:CLIENT_ADMIN_KEY,'PRO_API_KEY='+$env:CLIENT_API_KEY,'CCODE_API_KEY=','CLOUD_BASE_URL='+$env:CLIENT_BASE_URL,'HF_ENDPOINT=https://huggingface.co','OLLAMA_BASE_URL=http://host.docker.internal:11434/v1','HF_OFFLINE=0'); [IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'),$lines,[Text.Encoding]::ASCII)"
  if errorlevel 1 (
    echo [ERROR] Could not create .env.
    pause
    exit /b 1
  )
  echo Created .env. You can edit it later to change the API provider or key.
)

echo Building and starting the service. The first run downloads dependencies and may take several minutes.
docker compose up -d --build
if errorlevel 1 (
  echo [ERROR] Startup failed. Run: docker compose logs --tail 100 tutor
  pause
  exit /b 1
)

echo Service started: http://localhost:8899
start "" "http://localhost:8899"
pause
