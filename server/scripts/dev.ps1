# dev.ps1 - 开发环境启动脚本 (PowerShell 7+)
# 同时启动 FastAPI 和 Celery Worker
#
# 使用方法:
#   cd server
#   .\scripts\dev.ps1
#
# 停止: 按 Ctrl+C 或关闭终端窗口

param(
    [switch]$NoCelery,  # 仅启动 FastAPI
    [switch]$NoApi      # 仅启动 Celery
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Split-Path -Parent $ScriptDir
$SrcDir = Join-Path $ServerDir "src"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AXIOM Server Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到 server 目录
Set-Location $ServerDir

$jobs = @()

try {
    # 启动 Celery Worker
    if (-not $NoCelery) {
        Write-Host "[1/2] Starting Celery Worker..." -ForegroundColor Yellow
        $celeryJob = Start-Job -ScriptBlock {
            param($serverDir, $srcDir)
            Set-Location $srcDir
            & uv run celery -A knowledgebase.worker.celery_app worker -l info
        } -ArgumentList $ServerDir, $SrcDir
        $jobs += $celeryJob
        Write-Host "      Celery Worker started (Job ID: $($celeryJob.Id))" -ForegroundColor Green
    }

    # 启动 FastAPI
    if (-not $NoApi) {
        Write-Host "[2/2] Starting FastAPI Server..." -ForegroundColor Yellow
        $apiJob = Start-Job -ScriptBlock {
            param($serverDir)
            Set-Location $serverDir
            & uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
        } -ArgumentList $ServerDir
        $jobs += $apiJob
        Write-Host "      FastAPI Server started (Job ID: $($apiJob.Id))" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Services Running:" -ForegroundColor Cyan
    if (-not $NoApi) {
        Write-Host "  - FastAPI:  http://localhost:8000" -ForegroundColor White
        Write-Host "  - Docs:     http://localhost:8000/docs" -ForegroundColor White
    }
    if (-not $NoCelery) {
        Write-Host "  - Celery:   Worker running" -ForegroundColor White
    }
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor DarkGray
    Write-Host ""

    # 实时输出日志
    while ($true) {
        foreach ($job in $jobs) {
            $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
            if ($output) {
                Write-Host $output
            }
        }
        
        # 检查是否有 job 失败
        foreach ($job in $jobs) {
            if ($job.State -eq "Failed") {
                Write-Host "Job $($job.Id) failed!" -ForegroundColor Red
                Receive-Job -Job $job
            }
        }
        
        Start-Sleep -Milliseconds 100
    }
}
finally {
    # 清理: 停止所有 jobs
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    foreach ($job in $jobs) {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
    Write-Host "All services stopped." -ForegroundColor Green
}
