# dev-windows.ps1 - 开发环境启动脚本 (多窗口版本)
# 在独立窗口中启动 FastAPI 和 Celery Worker
#
# 使用方法:
#   cd server
#   .\scripts\dev-windows.ps1
#
# 每个服务在独立窗口运行，关闭窗口即停止对应服务

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Split-Path -Parent $ScriptDir
$SrcDir = Join-Path $ServerDir "src"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AXIOM Server - Multi-Window Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动 Celery Worker (新窗口)
Write-Host "[1/2] Starting Celery Worker in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$SrcDir'; Write-Host 'Celery Worker' -ForegroundColor Green; uv run celery -A knowledgebase.worker.celery_app worker -l info"
) -WindowStyle Normal

Start-Sleep -Seconds 2

# 启动 FastAPI (新窗口)
Write-Host "[2/2] Starting FastAPI Server in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ServerDir'; Write-Host 'FastAPI Server' -ForegroundColor Green; uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"
) -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started in Separate Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  FastAPI:  http://localhost:8000" -ForegroundColor White
Write-Host "  Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Celery:   Worker running" -ForegroundColor White
Write-Host ""
Write-Host "Close each window to stop the service." -ForegroundColor DarkGray
