# ClarityCompass - Quick Reference Card

**Keep this handy for quick access to common commands and information**

---

## ⚡ Quick Start

### One-Command Installation
```powershell
powershell -ExecutionPolicy Bypass -File ./setup.ps1
```

### One-Command Run
```powershell
npm run dev:full
```

### Manual Start

**Terminal 1 - Backend**:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 - Frontend**:
```powershell
npm run dev
```

---

## 🔗 Important URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:9003 |
| **Backend** | http://127.0.0.1:8000 |
| **API Health** | http://127.0.0.1:8000/health |
| **Model Status** | http://127.0.0.1:8000/predict/status |
| **API Docs** | http://127.0.0.1:8000/docs |

---

## 👤 Demo Accounts

| Account | Purpose | Data |
|---------|---------|------|
| `test_student` | Demo/Review | ✅ 13 assessments, 20 events |
| `student_demo` | Fresh Start | ❌ Empty |
| `[any-id]` | Custom | ❌ Empty |

---

## 📁 Project Structure

```
clarity-compass-fullstack/
├── src/                    # Frontend (Next.js + TypeScript)
├── backend/               # Backend (FastAPI + ML)
│   ├── api/              # API endpoints
│   ├── models/           # Trained ML models
│   └── data/             # Data storage
├── setup.ps1             # Automated setup
├── start-dev.ps1         # Dev launcher
└── [DOCS]               # Documentation
```

---

## 🛠️ Common Commands

### Git
```powershell
# Check status
git status

# Commit changes
git add .
git commit -m "your message"

# Push to GitHub
git push origin feature/local-dev-salvage
```

### Frontend
```powershell
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

### Backend
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload

# Check Python version
python --version
```

---

## 🔍 Troubleshooting

### Problem: "npm not found"
**Solution**: Install Node.js from nodejs.org

### Problem: "python not found"
**Solution**: Install Python 3.12+ (check "Add to PATH")

### Problem: "Port already in use"
**Solution**: 
```powershell
# Kill Python processes
taskkill /F /IM python.exe
```

### Problem: "Module not found"
**Solution**: 
```powershell
# Frontend
npm install

# Backend
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Problem: "Cannot run scripts"
**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 Key Features Checklist

- [ ] Dashboard - Current burnout score
- [ ] Quick Risk - 7-question rapid assessment
- [ ] Full Assessment - 21-question DASS-21 survey
- [ ] Forecast - 7-day burnout prediction
- [ ] Calendar - Event management with stress weighting
- [ ] Progress - History charts and achievements

---

## 🎯 Testing Workflow

1. **Login** with `test_student`
2. **Dashboard** - View current data
3. **Quick Risk** - Take 2-minute check
4. **Full Assessment** - Complete DASS-21 survey
5. **Forecast** - Click "Load My Data"
6. **Calendar** - View existing events
7. **Progress** - Check history and achievements

---

## 🔗 Links

**GitHub**: https://github.com/mzaidx7/clarity-compass-final

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Main documentation |
| **SETUP_GUIDE.md** | Step-by-step installation |
| **QUICK_REFERENCE.md** | This file! |

---

## 🎯 Project Info

**Project**: ClarityCompass - AI-Powered Student Burnout Prevention  
**Tech Stack**: Next.js 15 + FastAPI + Machine Learning  
**ML Model**: Random Forest (86% accuracy)  
**Training Data**: StudentLife + DASS-21 + custom responses (13K+ data points)  

---

## ⚙️ System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Windows 10 | Windows 11 |
| **Node.js** | 18.x | 20.x |
| **Python** | 3.12 | 3.13 |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 1 GB | 2 GB |

---

## 🚀 Performance

- **Setup Time**: 5-10 minutes
- **Backend Startup**: ~3 seconds
- **Frontend Startup**: ~2 seconds
- **Assessment Time**: 2-5 minutes
- **Forecast Generation**: <1 second
- **Model Inference**: <100ms

---

## 📈 ML Model Stats

- **Algorithm**: Random Forest
- **Features**: 48 behavioral features
- **Training Data**: StudentLife + DASS-21 + custom responses
- **Accuracy**: 86%
- **Model Version**: v2
- **Validation**: Cross-validated with multiple assessment types

---

## 🎬 Demo Script (5 minutes)

**Suggested demo flow**:

1. **[0:00-0:30]** Open application → Login with `test_student`
2. **[0:30-1:00]** Dashboard tour → Show burnout score and risk level
3. **[1:00-1:30]** Quick Risk → Demonstrate rapid assessment
4. **[1:30-2:30]** Full Assessment → Show comprehensive survey and ML prediction
5. **[2:30-3:30]** Forecast → Demonstrate 7-day prediction and calendar integration
6. **[3:30-4:00]** Calendar → Show event weighting system (type × priority × intensity)
7. **[4:00-4:30]** Progress → Display history charts and achievements
8. **[4:30-5:00]** Settings → Theme toggle and clear data feature

---

## ✅ Pre-Demo Checklist

**5 minutes before demo**:

- [ ] Backend running (http://127.0.0.1:8000/health shows OK)
- [ ] Frontend running (http://localhost:9003 loads)
- [ ] `test_student` data intact (check dashboard)
- [ ] Browser cache cleared (Ctrl+Shift+Del)
- [ ] All other applications closed (for performance)
- [ ] Internet connection stable (for any web fonts/resources)

---

## 🔐 Data Locations

- **User Data**: `backend/data/local_store.json`
- **ML Models**: `backend/models/*.joblib`
- **Frontend Build**: `.next/`
- **Virtual Env**: `backend/.venv/`

---

## 🎨 Color Codes (for reference)

| Risk Level | Color | Score Range |
|------------|-------|-------------|
| **Low** | Green | 0-30 |
| **Moderate** | Yellow | 31-60 |
| **High** | Orange | 61-85 |
| **Critical** | Red | 86-100 |

---

## 📝 Quick Notes Space

Use this space for quick notes during demo or troubleshooting:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Print this page and keep it handy! 📄**

