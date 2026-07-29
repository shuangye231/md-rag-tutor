@echo off
setlocal
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker was not found.
  pause
  exit /b 1
)
docker compose down
if errorlevel 1 (
  echo [ERROR] Could not stop the service. Make sure Docker Desktop is running.
  pause
  exit /b 1
)
echo Service stopped. User data in the data folder was kept.
pause
