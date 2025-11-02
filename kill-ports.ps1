# Helper script to manually kill processes using ports 8000 and 9003
# Usage: powershell -ExecutionPolicy Bypass -File ./kill-ports.ps1

$ErrorActionPreference = "Continue"

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }

function Stop-ProcessOnPort {
    param(
        [int]$Port
    )
    
    Write-Info "Checking for processes using port $Port..."
    $found = $false
    
    try {
        # Method 1: Get-NetTCPConnection
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Warn "Found process '$($process.ProcessName)' (PID: $pid) using port $Port"
                        Stop-Process -Id $pid -Force -ErrorAction Stop
                        Write-Success "✓ Process $pid stopped successfully."
                        $found = $true
                    }
                } catch {
                    Write-Warn "Could not stop process with PID $pid: $_"
                }
            }
        }
    } catch {
        Write-Warn "Get-NetTCPConnection failed, trying netstat method..."
    }
    
    # Method 2: Fallback to netstat
    try {
        $netstatLines = netstat -ano | Select-String ":$Port " | Select-String "LISTENING"
        foreach ($line in $netstatLines) {
            $parts = $line.Line -split '\s+'
            $pid = $parts[-1]
            if ($pid -match '^\d+$') {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Warn "Found process '$($process.ProcessName)' (PID: $pid) using port $Port"
                    taskkill /F /PID $pid 2>$null
                    Write-Success "✓ Process $pid stopped successfully."
                    $found = $true
                }
            }
        }
    } catch {
        Write-Warn "Could not use netstat method: $_"
    }
    
    if (-not $found) {
        Write-Info "No processes found using port $Port."
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "=== Port Cleanup Tool ===" -ForegroundColor Yellow
Write-Host "This will kill processes using ports 8000 and 9003" -ForegroundColor Yellow
Write-Host ""

Stop-ProcessOnPort -Port 8000
Stop-ProcessOnPort -Port 9003

Write-Host ""
Write-Success "Port cleanup complete!"
Write-Host ""


