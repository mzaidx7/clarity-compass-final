# How to Start ClarityCompass

## Quick Start (Recommended)

Simply run this command in PowerShell from the project root:

```powershell
npm run dev:full
```

This will:
1. Clean up any old processes on ports 8000 and 9003
2. Start the backend (FastAPI) in one window
3. Start the frontend (Next.js) in another window
4. Wait for the backend to be ready before continuing

**Wait 10-15 seconds** after running for both servers to fully start.

Then visit: **http://localhost:9003**

## Manual Start (Alternative)

If you prefer to run each server manually:

### Terminal 1: Backend
```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2: Frontend
```powershell
npm run dev
```

## Troubleshooting

### "Port already in use" error
If ports 8000 or 9003 are in use:

```powershell
npm run kill-ports
```

Then try starting again.

### Backend won't start
1. Make sure Python 3.12+ is installed
2. Create/activate virtual environment:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

### Frontend won't start
1. Make sure Node.js 18+ is installed
2. Install dependencies:
   ```powershell
   npm install
   ```

### Connection Refused Error
- **Wait 15 seconds** after starting - the ML models take time to load
- Check both PowerShell windows for error messages
- Make sure you're visiting `http://localhost:9003` (not 9002 or 9004)
- Verify backend is running at `http://127.0.0.1:8000/auth/health`

## Login Options

Once the app loads, you can use any of these login IDs:

- `test_student` - Pre-populated with sample data (recommended for demos)
- `student_demo` - Blank account for testing
- Any custom ID - Create new user data

## What Each Window Shows

**Backend Window:**
- Green messages when starting
- "Application startup complete" when ready
- "Loaded model with 19 base features" confirms ML is working

**Frontend Window:**
- "Ready in X.Xs" when compilation is done
- Should show "Local: http://localhost:9003"

## Still Having Issues?

Check both windows for error messages:
- Red text usually indicates a problem
- Yellow warnings are usually OK but worth reading
- Backend must show "Burnout service ready!" before the app will work

