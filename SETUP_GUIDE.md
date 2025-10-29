# ClarityCompass - Complete Setup Guide

This guide provides detailed step-by-step instructions for setting up ClarityCompass on a Windows machine.

---

## 📋 Table of Contents

1. [Prerequisites Installation](#prerequisites-installation)
2. [Download the Project](#download-the-project)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites Installation

### 1.1 Install Node.js

Node.js is required to run the frontend.

1. Visit https://nodejs.org/
2. Download the **LTS version** (currently 18.x or 20.x)
3. Run the installer:
   - ✅ Check "Automatically install necessary tools"
   - Click "Next" → "Next" → "Install"
4. **Verify installation**:
   ```powershell
   # Open PowerShell and run:
   node --version
   # Should show: v18.x.x or v20.x.x
   
   npm --version
   # Should show: 9.x.x or 10.x.x
   ```

**If verification fails**: Restart your computer and try again.

---

### 1.2 Install Python

Python is required to run the backend and ML models.

1. Visit https://www.python.org/downloads/
2. Download **Python 3.12** or **Python 3.13**
3. Run the installer:
   - ⚠️ **IMPORTANT**: Check ✅ "Add Python to PATH"
   - Click "Install Now"
4. **Verify installation**:
   ```powershell
   # Open PowerShell and run:
   python --version
   # Should show: Python 3.12.x or 3.13.x
   
   pip --version
   # Should show: pip 24.x.x
   ```

**If verification fails**: 
- Make sure you checked "Add Python to PATH"
- Restart your computer
- Try running `py --version` instead of `python --version`

---

### 1.3 Install Git (Optional)

Git is needed to clone the repository from GitHub.

1. Visit https://git-scm.com/downloads
2. Download the Windows installer
3. Run the installer (default settings are fine)
4. **Verify installation**:
   ```powershell
   git --version
   # Should show: git version 2.x.x
   ```

**Alternative**: You can also download the project as a ZIP file from GitHub and extract it.

---

## 2. Download the Project

### Option A: Using Git (Recommended)

```powershell
# 1. Open PowerShell
# 2. Navigate to where you want to save the project (e.g., Desktop)
cd Desktop

# 3. Clone the repository
git clone https://github.com/yourusername/clarity-compass-fullstack.git

# 4. Navigate into the project folder
cd clarity-compass-fullstack
```

### Option B: Download ZIP

1. Visit the GitHub repository
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to your desired location (e.g., Desktop)
5. Open PowerShell and navigate to the extracted folder:
   ```powershell
   cd Desktop\clarity-compass-fullstack
   ```

---

## 3. Backend Setup

The backend runs the API server and ML models.

### 3.1 Navigate to Backend Folder

```powershell
cd backend
```

### 3.2 Create Virtual Environment

A virtual environment keeps Python dependencies isolated.

```powershell
# Create virtual environment
python -m venv .venv

# If that doesn't work, try:
py -m venv .venv
```

**Expected output**: A new folder `.venv` will be created.

### 3.3 Activate Virtual Environment

```powershell
# Activate the virtual environment
.\.venv\Scripts\Activate.ps1
```

**Expected output**: Your prompt should now start with `(.venv)`

**If you get an error about execution policies**:
```powershell
# Run this first, then try again:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3.4 Install Python Dependencies

```powershell
# Make sure you're still in the backend folder with (.venv) active
pip install -r requirements.txt
```

**Expected output**: Lots of text as packages are downloaded and installed. This may take 2-5 minutes.

**What's being installed**:
- FastAPI (web framework)
- scikit-learn (machine learning)
- pandas, numpy (data processing)
- uvicorn (web server)

### 3.5 Test Backend

```powershell
# Start the backend server
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Expected output**:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
[Startup] Loading burnout prediction model...
[Startup] Burnout service ready!
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Test it**: Open your browser to http://127.0.0.1:8000/health

**Expected response**: 
```json
{"status": "ok"}
```

**Stop the server**: Press `Ctrl+C` in PowerShell

### 3.6 Return to Root Directory

```powershell
# Go back to the main project folder
cd ..
```

---

## 4. Frontend Setup

The frontend is the web interface you interact with.

### 4.1 Install Frontend Dependencies

Make sure you're in the root project folder (not in `backend`):

```powershell
# Check your current directory
pwd
# Should end with: \clarity-compass-fullstack

# Install dependencies
npm install
```

**Expected output**: Lots of text as packages are downloaded. This may take 2-5 minutes.

**What's being installed**:
- Next.js (React framework)
- Tailwind CSS (styling)
- Radix UI (components)
- Recharts (charts)

### 4.2 Verify Package Installation

```powershell
# This should NOT show any errors
npm list --depth=0
```

---

## 5. Running the Application

### 5.1 One-Command Start (Recommended)

From the root project folder:

```powershell
npm run dev:full
```

**What happens**:
- Two PowerShell windows will open automatically
- **Window 1**: Backend server at http://127.0.0.1:8000
- **Window 2**: Frontend server at http://localhost:9003
- Your default browser will open to http://localhost:9003

**Expected output in Window 1 (Backend)**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
[Startup] Burnout service ready!
```

**Expected output in Window 2 (Frontend)**:
```
▲ Next.js 15.3.3
- Local:        http://localhost:9003
✓ Ready in 2.5s
```

### 5.2 Manual Start (Alternative)

If the one-command start doesn't work, you can start each part manually:

**Terminal 1 - Backend**:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 - Frontend** (open a new PowerShell window):
```powershell
cd clarity-compass-fullstack
npm run dev
```

---

## 6. Verification

### 6.1 Check Backend

1. Open browser to http://127.0.0.1:8000/health
2. **Expected**: `{"status":"ok"}`

3. Check model status: http://127.0.0.1:8000/predict/status
4. **Expected**: JSON showing model info with `"using": "ml_model"`

### 6.2 Check Frontend

1. Open browser to http://localhost:9003
2. **Expected**: Login page with "ClarityCompass" logo

### 6.3 Login and Test

1. On the login page, enter one of these user IDs:
   - `test_student` (has sample data)
   - `student_demo` (blank slate)

2. Click "Sign In"

3. **Expected**: Redirected to dashboard

4. For `test_student`, you should see:
   - A burnout score displayed
   - Recent assessment chart
   - Calendar stress visualization
   - Achievement badges

5. Try navigating to different pages:
   - Dashboard ✓
   - Quick Risk ✓
   - Full Assessment ✓
   - Forecast ✓
   - Calendar ✓
   - Progress ✓

---

## 7. Troubleshooting

### Problem: "npm not found"

**Solution**:
1. Reinstall Node.js from nodejs.org
2. Restart your computer
3. Open a new PowerShell window
4. Try `npm --version` again

---

### Problem: "python not found"

**Solution**:
1. Reinstall Python from python.org
2. ✅ Make sure to check "Add Python to PATH"
3. Restart your computer
4. Try `python --version` or `py --version`

---

### Problem: "Activate.ps1 cannot be loaded"

**Error**: `Activate.ps1 cannot be loaded because running scripts is disabled`

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try activating the virtual environment again.

---

### Problem: "Port 8000 is already in use"

**Solution**:
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find any "Python" processes and end them
3. Try starting the backend again

**Alternative**: Change the port in `start-dev.ps1` to 8001

---

### Problem: "Module not found" errors

**For backend**:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt --force-reinstall
```

**For frontend**:
```powershell
# In root directory
rm -r node_modules
npm install
```

---

### Problem: Backend starts but shows errors

**Check**:
1. Are you in the `backend` directory?
2. Is the virtual environment activated? (prompt shows `(.venv)`)
3. Are all dependencies installed?

**Solution**:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### Problem: Frontend shows "Failed to connect to backend"

**Check**:
1. Is the backend running at http://127.0.0.1:8000?
2. Open http://127.0.0.1:8000/health in your browser
3. If it doesn't load, the backend isn't running

**Solution**: Start the backend first, then the frontend

---

### Problem: "No module named 'api'"

**Solution**: Make sure you're running `uvicorn` from the `backend` folder, not the root.

```powershell
# Check where you are
pwd
# Should end with: \backend

# If not:
cd backend

# Then start:
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### Problem: Browser doesn't open automatically

**Solution**: Manually open your browser to:
- Frontend: http://localhost:9003
- Backend: http://127.0.0.1:8000/health

---

### Problem: Nothing works!

**Nuclear option - Fresh start**:

```powershell
# 1. Close all PowerShell windows
# 2. Delete the project folder
# 3. Re-download/clone the project
# 4. Follow this guide from step 3 again
```

---

## 🎯 Quick Reference

### Common Commands

**Start both servers**:
```powershell
npm run dev:full
```

**Start backend only**:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Start frontend only**:
```powershell
npm run dev
```

**Stop servers**:
- Press `Ctrl+C` in the PowerShell window

---

### Important URLs

- **Frontend**: http://localhost:9003
- **Backend Health**: http://127.0.0.1:8000/health
- **Model Status**: http://127.0.0.1:8000/predict/status
- **API Docs**: http://127.0.0.1:8000/docs

---

### Test Accounts

- `test_student` - Pre-populated with sample data (recommended for demo)
- `student_demo` - Blank slate for testing new user flow
- Or use any custom user ID

---

## ✅ Success Checklist

Before declaring success, verify:

- [ ] Node.js installed (`node --version` works)
- [ ] Python installed (`python --version` works)
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access http://127.0.0.1:8000/health
- [ ] Can access http://localhost:9003
- [ ] Can log in with `test_student`
- [ ] Dashboard shows data
- [ ] Can navigate between pages

---

## 📧 Still Having Issues?

If you're still stuck after trying everything:

1. Take a screenshot of the error message
2. Note what step you're on
3. Check the PowerShell output for error messages
4. Contact: [your.email@university.edu]

---

**Estimated Total Setup Time**: 5-10 minutes (with dependencies already downloaded)

**First-Time Setup**: 10-20 minutes (including downloading dependencies)

