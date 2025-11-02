# 🚀 START HERE

## How to Run ClarityCompass (Fixed Version)

### Method 1: One-Button Start (Recommended) ✅

Open PowerShell in the project root and run:

```powershell
npm run dev:full
```

**That's it!** The script will:
- ✅ Safely kill only dev server processes on ports 8000/9003
- ✅ Start backend in one window
- ✅ Wait for backend to be ready
- ✅ Start frontend in another window
- ✅ Show clear instructions

Wait **15 seconds**, then visit: **http://localhost:9003**

---

### Method 2: Manual Start (If you prefer)

#### Window 1 - Backend:
```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Window 2 - Frontend:
```powershell
npm run dev
```

---

## 🐛 Troubleshooting

### "Connection Refused" Error
**Solution:** Wait 15 seconds! The ML models need time to load. Watch the backend window for "Burnout service ready!"

### Port Already in Use
```powershell
npm run kill-ports
npm run dev:full
```

### Backend Not Starting
1. Check if Python is installed: `python --version`
2. Create venv: `cd backend && python -m venv .venv`
3. Install deps: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`

### Frontend Not Starting  
1. Check if Node is installed: `node --version`
2. Install deps: `npm install`

---

## 🔑 Login

Use any of these IDs:
- `test_student` ← Demo data included
- `student_demo` ← Blank account
- `your_name` ← Creates new account

---

## ✅ What Success Looks Like

**Backend Window:**
```
✓ Burnout service ready!
✓ Application startup complete
```

**Frontend Window:**
```
✓ Ready in 2.6s
✓ Local: http://localhost:9003
```

**Browser:**
- Login page loads
- You can enter any user ID
- No connection errors

---

## 📋 What Changed (For Your Info)

- ✅ Safer port cleanup (only kills dev servers)
- ✅ Backend health check before starting frontend
- ✅ Skips slow pip install if venv exists
- ✅ Better error messages
- ✅ Clear instructions displayed

---

Need help? Check the backend/frontend windows for error messages in red!

