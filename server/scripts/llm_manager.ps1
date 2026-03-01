# LLM 模型管理 PowerShell 脚本
#
# 功能:
# - 列出所有模型配置
# - 快速切换默认模型
# - 启用/禁用模型
#
# 使用方法:
#   .\scripts\llm_manager.ps1 list          # 列出所有模型
#   .\scripts\llm_manager.ps1 default <id>  # 设置默认模型
#   .\scripts\llm_manager.ps1 enable <id>   # 启用模型
#   .\scripts\llm_manager.ps1 disable <id>  # 禁用模型

param(
    [Parameter(Position=0)]
    [string]$Command,

    [Parameter(Position=1)]
    [string]$ModelId
)

$ErrorActionPreference = "Stop"

# 切换到 server 目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $ScriptDir ".."
Set-Location $ServerDir

# Python 命令
$PythonCmd = "uv run python"

function Show-Help {
    Write-Host "LLM 模型管理脚本" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "用法:" -ForegroundColor Yellow
    Write-Host "  .\scripts\llm_manager.ps1 list              - 列出所有模型"
    Write-Host "  .\scripts\llm_manager.ps1 default <id>       - 设置默认模型"
    Write-Host "  .\scripts\llm_manager.ps1 enable <id>        - 启用模型"
    Write-Host "  .\scripts\llm_manager.ps1 disable <id>       - 禁用模型"
    Write-Host ""
    Write-Host "完整功能请使用 Python 脚本:" -ForegroundColor Yellow
    Write-Host "  uv run python scripts/llm_manager.py --help"
}

function Invoke-List {
    Write-Host "获取模型列表..." -ForegroundColor Cyan
    Invoke-Expression "$PythonCmd scripts/llm_manager.py list"
}

function Invoke-SetDefault {
    if ([string]::IsNullOrEmpty($ModelId)) {
        Write-Host "错误: 请提供模型 ID" -ForegroundColor Red
        exit 1
    }

    Write-Host "设置默认模型: $ModelId" -ForegroundColor Cyan
    Invoke-Expression "$PythonCmd scripts/llm_manager.py set-default $ModelId"
}

function Invoke-Enable {
    if ([string]::IsNullOrEmpty($ModelId)) {
        Write-Host "错误: 请提供模型 ID" -ForegroundColor Red
        exit 1
    }

    Write-Host "启用模型: $ModelId" -ForegroundColor Cyan
    Invoke-Expression "$PythonCmd scripts/llm_manager.py enable $ModelId"
}

function Invoke-Disable {
    if ([string]::IsNullOrEmpty($ModelId)) {
        Write-Host "错误: 请提供模型 ID" -ForegroundColor Red
        exit 1
    }

    Write-Host "禁用模型: $ModelId" -ForegroundColor Cyan
    Invoke-Expression "$PythonCmd scripts/llm_manager.py disable $ModelId"
}

# 主逻辑
switch ($Command) {
    "list" { Invoke-List }
    "default" { Invoke-SetDefault }
    "enable" { Invoke-Enable }
    "disable" { Invoke-Disable }
    "" { Show-Help }
    default {
        Write-Host "未知命令: $Command" -ForegroundColor Red
        Write-Host ""
        Show-Help
        exit 1
    }
}
