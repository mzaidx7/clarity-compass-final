param(
  [switch]$Mock
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[ClarityCompass] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[ClarityCompass] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ClarityCompass] $msg" -ForegroundColor Red }

function Stop-ProcessOnPort {
    param(
        [int]$Port
    )
    
    Write-Info "Checking for development server processes using port $Port..."
    
    try {
        # Get processes using the port
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
        
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        # Only kill known development server processes
                        $safeToKill = @('python', 'node', 'uvicorn', 'powershell')
                        if ($safeToKill -contains $process.ProcessName.ToLower()) {
                            Write-Warn "Stopping development server '$($process.ProcessName)' (PID: $pid) using port $Port..."
                            Stop-Process -Id $pid -Force -ErrorAction Stop
                            Start-Sleep -Milliseconds 500
                            Write-Info "Process stopped successfully."
                        } else {
                            Write-Warn "Found process '$($process.ProcessName)' on port $Port but not killing it (not a dev server)"
                        }
                    }
                } catch {
                    Write-Warn "Could not stop process with PID $pid (error occurred)"
                }
            }
        } else {
            Write-Info "No processes found using port $Port."
        }
        
        # Wait a bit more to ensure port is released
        Start-Sleep -Milliseconds 1000
        
    } catch {
        Write-Warn "Error checking port $Port (error occurred)"
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'

# ----- Clean up ports before starting -----
Write-Info "Checking and cleaning up ports..."
Stop-ProcessOnPort -Port 8000
Stop-ProcessOnPort -Port 9003

# ----- Start Backend in a new window -----
Write-Info "Launching backend (FastAPI) in a new window..."

# Verify backend port is free before starting
Start-Sleep -Milliseconds 500
$backendPortCheck = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($backendPortCheck) {
    Write-Err "Port 8000 is still in use! Please close the application using it and try again."
    exit 1
}

$backendScript = Join-Path $env:TEMP 'clarity_backend_start.ps1'
$backendContent = @'
$ErrorActionPreference = "Continue"
Write-Host "[Backend] Starting FastAPI server..." -ForegroundColor Green

# Check if virtual environment exists
if (!(Test-Path .venv)) {
  Write-Host "[Backend] Creating virtual environment..." -ForegroundColor Yellow
  try { py -m venv .venv } catch { python -m venv .venv }
  Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow
  & ".\.venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
  & ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet
} else {
  Write-Host "[Backend] Virtual environment found. Skipping installation." -ForegroundColor Cyan
}

# Set environment variables
$env:AUTH_MODE = 'dev'
$env:ALLOWED_ORIGINS = 'http://localhost:9003'
Write-Host "[Backend] Starting uvicorn on http://127.0.0.1:8000..." -ForegroundColor Green
& ".\.venv\Scripts\python.exe" -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload

# If we get here, the server exited
Write-Host "[Backend] Server stopped. Press any key to close this window..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
'@
Set-Content -Path $backendScript -Value $backendContent -Encoding UTF8
Start-Process powershell -WorkingDirectory $backendDir -ArgumentList @('-NoExit','-File', $backendScript) | Out-Null
Start-Sleep -Seconds 5

# Wait for backend to start
Write-Info "Waiting for backend to initialize..."
$maxAttempts = 20
$attempt = 0
$backendReady = $false
while ($attempt -lt $maxAttempts -and -not $backendReady) {
    Start-Sleep -Milliseconds 500
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/auth/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Info "Backend is ready!"
            $backendReady = $true
            break
        }
    } catch {
        # Backend not ready yet
        if ($attempt % 4 -eq 0) {
            Write-Host "." -NoNewline
        }
    }
}
Write-Host ""
if (-not $backendReady) {
    Write-Warn "Backend may not be fully ready, but continuing..."
}

# ----- Start Frontend in a new window -----
Write-Info "Launching frontend (Next.js) in a new window..."

# Verify frontend port is free before starting
Start-Sleep -Milliseconds 500
$frontendPortCheck = Get-NetTCPConnection -LocalPort 9003 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($frontendPortCheck) {
    Write-Err "Port 9003 is still in use! Please close the application using it and try again."
    exit 1
}

$useMock = if ($Mock) { 'true' } else { 'false' }
$frontendScript = Join-Path $env:TEMP 'clarity_frontend_start.ps1'
$frontendTemplate = @'
$ErrorActionPreference = "Continue"
Write-Host "[Frontend] Starting Next.js server..." -ForegroundColor Green
$env:NEXT_PUBLIC_USE_MOCK_API = '{USE_MOCK}'
$env:NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8000'
Write-Host "[Frontend] Installing dependencies (if needed)..." -ForegroundColor Yellow
npm install
Write-Host "[Frontend] Starting Next.js on http://localhost:9003..." -ForegroundColor Green
npm run dev
'@
$frontendContent = $frontendTemplate -replace '\{USE_MOCK\}', $useMock
Set-Content -Path $frontendScript -Value $frontendContent -Encoding UTF8
Start-Process powershell -WorkingDirectory $root -ArgumentList @('-NoExit','-File', $frontendScript) | Out-Null
Start-Sleep -Seconds 3

Write-Host "" 
Write-Info "==========================================="
Write-Info "Two windows were opened:"
Write-Info "  Backend:  http://127.0.0.1:8000"
Write-Info "  Frontend: http://localhost:9003"
Write-Info "==========================================="
Write-Host ""
Write-Info "The servers are starting..."
Write-Info "Please wait 10-15 seconds for both to fully initialize."
Write-Host ""
Write-Info "Then visit: http://localhost:9003"
Write-Info "Login options: test_student or student_demo"
Write-Host ""
if ($Mock) { Write-Warn "Frontend started in MOCK API mode (no backend required)." }

Write-Host ""
Write-Info "Setup complete! Check the two PowerShell windows for server status."
