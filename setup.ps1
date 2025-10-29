# ClarityCompass Setup Script for Windows
# This script checks prerequisites and sets up the project automatically

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ClarityCompass - Automated Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorCount = 0

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Step 1: Check Node.js
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    Write-Host "    Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    $ErrorCount++
}

# Step 2: Check npm
Write-Host "`n[2/6] Checking npm..." -ForegroundColor Yellow
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "  ✓ npm $npmVersion found" -ForegroundColor Green
} else {
    Write-Host "  ✗ npm not found!" -ForegroundColor Red
    Write-Host "    npm should come with Node.js. Please reinstall Node.js." -ForegroundColor Red
    $ErrorCount++
}

# Step 3: Check Python
Write-Host "`n[3/6] Checking Python..." -ForegroundColor Yellow
$pythonCmd = $null
if (Test-Command "python") {
    $pythonCmd = "python"
} elseif (Test-Command "py") {
    $pythonCmd = "py"
}

if ($pythonCmd) {
    $pythonVersion = & $pythonCmd --version 2>&1
    Write-Host "  ✓ Python $pythonVersion found" -ForegroundColor Green
    
    # Check Python version (should be 3.12+)
    $versionMatch = $pythonVersion -match "Python (\d+)\.(\d+)"
    if ($versionMatch) {
        $majorVersion = [int]$Matches[1]
        $minorVersion = [int]$Matches[2]
        if ($majorVersion -lt 3 -or ($majorVersion -eq 3 -and $minorVersion -lt 12)) {
            Write-Host "  ⚠ Warning: Python 3.12+ recommended (you have $pythonVersion)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ✗ Python not found!" -ForegroundColor Red
    Write-Host "    Please install Python 3.12+ from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "    Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Red
    $ErrorCount++
}

# Step 4: Check pip
Write-Host "`n[4/6] Checking pip..." -ForegroundColor Yellow
if (Test-Command "pip") {
    $pipVersion = pip --version
    Write-Host "  ✓ pip found" -ForegroundColor Green
} else {
    Write-Host "  ✗ pip not found!" -ForegroundColor Red
    Write-Host "    pip should come with Python. Please reinstall Python." -ForegroundColor Red
    $ErrorCount++
}

# Exit if prerequisites are missing
if ($ErrorCount -gt 0) {
    Write-Host "`n❌ Setup cannot continue. Please install missing prerequisites.`n" -ForegroundColor Red
    Write-Host "For detailed instructions, see: SETUP_GUIDE.md`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✓ All prerequisites found!`n" -ForegroundColor Green

# Step 5: Backend Setup
Write-Host "[5/6] Setting up Backend..." -ForegroundColor Yellow

# Navigate to backend
Push-Location backend

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "  Creating virtual environment..." -ForegroundColor Cyan
    & $pythonCmd -m venv .venv
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment and install dependencies
Write-Host "  Installing Python dependencies (this may take 2-5 minutes)..." -ForegroundColor Cyan

$activateScript = Join-Path $PWD ".venv\Scripts\Activate.ps1"

# Check if we can run scripts
try {
    & $activateScript
    pip install -r requirements.txt --quiet
    Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Could not activate virtual environment" -ForegroundColor Yellow
    Write-Host "    You may need to run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    Write-Host "    Then run this setup script again." -ForegroundColor Yellow
}

# Return to root
Pop-Location

# Step 6: Frontend Setup
Write-Host "`n[6/6] Setting up Frontend..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "  ✓ node_modules already exists (skipping npm install)" -ForegroundColor Green
} else {
    Write-Host "  Installing npm dependencies (this may take 2-5 minutes)..." -ForegroundColor Cyan
    npm install --silent
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ npm install failed" -ForegroundColor Red
        $ErrorCount++
    }
}

# Final Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($ErrorCount -eq 0) {
    Write-Host "✓ ClarityCompass is ready to run!`n" -ForegroundColor Green
    
    Write-Host "To start the application, run:" -ForegroundColor Yellow
    Write-Host "  npm run dev:full`n" -ForegroundColor White
    
    Write-Host "This will open two windows:" -ForegroundColor Yellow
    Write-Host "  • Backend:  http://127.0.0.1:8000" -ForegroundColor White
    Write-Host "  • Frontend: http://localhost:9003`n" -ForegroundColor White
    
    Write-Host "Demo Accounts:" -ForegroundColor Yellow
    Write-Host "  • test_student (pre-populated data)" -ForegroundColor White
    Write-Host "  • student_demo (blank slate)`n" -ForegroundColor White
    
    # Ask if user wants to start now
    $response = Read-Host "Would you like to start the application now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "`nStarting ClarityCompass...`n" -ForegroundColor Green
        npm run dev:full
    }
} else {
    Write-Host "⚠ Setup completed with $ErrorCount error(s)" -ForegroundColor Yellow
    Write-Host "Please check the messages above and fix any issues.`n" -ForegroundColor Yellow
    Write-Host "For help, see: SETUP_GUIDE.md`n" -ForegroundColor Yellow
}

