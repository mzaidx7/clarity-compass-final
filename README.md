# ClarityCompass - AI-Powered Student Burnout Prevention System

> An intelligent web application that predicts and prevents student burnout using machine learning and behavioral analytics.

---

## 📋 Project Overview

**ClarityCompass** is a comprehensive burnout prevention system designed specifically for university students. It combines a 19-item burnout assessment, behavioral data analysis, and machine learning to provide:

- 🎯 **Real-time burnout risk assessment** using a Random Forest Regressor (R² ≈ 0.86)
- 📊 **7-day burnout forecasting** based on historical patterns and upcoming deadlines
- 📅 **Smart calendar integration** with stress-weighted event tracking
- 📈 **Progress monitoring** with achievement tracking and trend visualization
- ⚡ **Quick daily check-ins** with smart prompts for comprehensive assessments

### Key Features

✅ **ML-Powered Predictions**: Random Forest Regressor trained on two merged Kaggle student stress datasets  
✅ **19-Feature Model**: Psychological, academic, social, and physical indicators with polynomial interactions (~190 transformed features)  
✅ **StudentLife-Inspired**: Behavioral features inspired by StudentLife research, with synthetic proxies for physiological indicators  
✅ **Calendar Intelligence**: Automatically calculates stress load from events (type, priority, complexity)  
✅ **Forecasting Engine**: Predicts burnout trajectory for the next 7 days  
✅ **Local-First**: No cloud dependencies, runs entirely on your machine  
✅ **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS

---

## 🚀 Quick Start

**Estimated setup time: 5-10 minutes**

### Prerequisites

You'll need these installed on your Windows machine:

1. **Node.js 18+** - [Download](https://nodejs.org/) (includes npm)
2. **Python 3.12+** - [Download](https://www.python.org/downloads/)
3. **Git** - [Download](https://git-scm.com/downloads) (if cloning from GitHub)

> 💡 **Tip**: When installing Python, make sure to check "Add Python to PATH"

### Installation

**Option 1: One-Command Setup (Recommended)**

```powershell
# 1. Clone the repository
git clone https://github.com/yourusername/clarity-compass-fullstack.git
cd clarity-compass-fullstack

# 2. Run the automated setup script
powershell -ExecutionPolicy Bypass -File ./setup.ps1

# 3. Start the application
npm run dev:full

# Wait 15 seconds for servers to start, then visit http://localhost:9003
```

**Option 2: Manual Setup**

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed step-by-step instructions.

### First Run

1. The application will open two windows:
   - **Backend** at `http://127.0.0.1:8000`
   - **Frontend** at `http://localhost:9003`

2. Open your browser to `http://localhost:9003`

3. **Login options**:
   - `test_student` - Pre-populated with sample data for demo
   - `student_demo` - Blank slate for testing
   - Any custom user ID

4. Explore the features!

---

## 📖 User Guide

### Demo Account (`test_student`)

This account includes realistic sample data showing a student's burnout journey:
- **13 historical assessments** spanning high stress → recovery → balanced life
- **20 calendar events** including exams, assignments, exercise, and social activities
- **Achievement unlocks** demonstrating the gamification system
- **Forecast data** showing how the system predicts future burnout risk

### Main Features

#### 1. **Dashboard** 
- Current burnout score (0-100 scale)
- Risk level indicator (Low/Moderate/High/Critical)
- Calendar stress visualization
- Recent assessment trends
- Latest quick check results

#### 2. **Full Burnout Assessment**
- 19-question comprehensive survey
- ML-powered burnout prediction (R² ≈ 0.86, RMSE ≈ 9.37)
- Detailed risk factors analysis
- Personalized recommendations

#### 3. **Quick Risk Check**
- 7 rapid questions (2-minute check-in)
- Daily monitoring without survey fatigue
- Smart prompts to take full assessment when needed
- Historical trend tracking

#### 4. **Burnout Forecast**
- 7-day burnout trajectory prediction
- Historical pattern analysis (last 14 days)
- Upcoming deadline integration
- Interactive chart visualization
- Manual or auto-load historical data

#### 5. **Calendar**
- Event management with stress weighting
- Three dimensions: **Type** (exam, assignment, social) + **Priority** (low/med/high) + **Intensity** (easy/moderate/complex)
- Visual stress indicators
- Integration with forecast engine

#### 6. **Progress & Achievements**
- Full assessment history with charts
- Quick check trend analysis
- Achievement system (10 categories)
- Progress tracking and unlocks

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 18, TypeScript)
- **UI Components**: Radix UI + Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **State**: React Hooks

### Backend
- **API Framework**: FastAPI (Python)
- **ML Models**: scikit-learn (Random Forest Regressor)
- **Data Processing**: pandas, numpy
- **Authentication**: JWT (dev mode for local)
- **Storage**: JSON file-based (local development)

### ML Model
- **Algorithm**: Random Forest Regressor
- **Base Features**: 19 core features (psychological, academic, social, physical)
- **Feature Engineering**: Degree-2 polynomial interactions (~190 transformed features)
- **Training Data**: Two merged Kaggle student stress datasets (StressLevelDataset.csv, Student Mental Stress & Coping Mechanisms.csv)
- **Performance**: R² ≈ 0.86, RMSE ≈ 9.37, MAE ≈ 6.12 on 20% holdout test set
- **Validation**: 5-fold cross-validation (mean R² = 0.865 ± 0.023)

---

## 📂 Project Structure

```
clarity-compass-fullstack/
├── src/                          # Frontend (Next.js)
│   ├── app/                      # Pages and routes
│   │   ├── (app)/               # Authenticated pages
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── quick-risk/      # Quick assessment
│   │   │   ├── fused-risk/      # Optional fused risk assessment (legacy)
│   │   │   ├── forecast/        # 7-day forecast
│   │   │   ├── calendar/        # Event management
│   │   │   └── progress/        # History & achievements
│   │   └── (auth)/              # Login page
│   ├── components/              # Reusable UI components
│   ├── lib/                     # Utilities & API client
│   └── hooks/                   # Custom React hooks
│
├── backend/                      # Backend (FastAPI + ML)
│   ├── api/                     # API application
│   │   ├── routers/            # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── models/             # Pydantic models
│   │   └── core/               # Config & security
│   ├── models/                  # Trained ML models
│   │   ├── burnout_model_v2.joblib # Main Random Forest Regressor
│   │   ├── burnout_scaler_v2.joblib # Feature scaler
│   │   ├── burnout_meta_v2.json   # Model metadata (features, thresholds)
│   │   └── burnout_survey_v2.json # 19-question survey definition
│   ├── data/                    # Training data & storage
│   │   ├── archive/training_data/ # Kaggle datasets (merged for training)
│   │   └── local_store.json    # User data (dev mode)
│   └── archive/research_scripts/ # Training & research scripts
│
├── docs/                         # Documentation
├── setup.ps1                    # Windows setup script
├── start-dev.ps1                # Dev server launcher
├── package.json                 # Frontend dependencies
└── backend/requirements.txt     # Backend dependencies
```

---

## 🔬 Data Sources

This project uses established research datasets for ML training:

1. **Student Stress Monitoring (Kaggle)** – `StressLevelDataset.csv`  
   - Dataset link: [kaggle.com/datasets/mdsultanulislamovi/student-stress-monitoring-datasets](https://www.kaggle.com/datasets/mdsultanulislamovi/student-stress-monitoring-datasets)
   - Student self-report samples with stress levels and psychological indicators
   - Rich academic, sleep, social support, and mental health features
   - Provides core features including anxiety, self-esteem, depression, sleep quality, and physical health indicators

2. **Student Mental Stress & Coping Mechanisms (Kaggle)**  
   - Dataset link: [kaggle.com/datasets/salahuddinahmedshuvo/student-mental-stress-and-coping-mechanisms](https://www.kaggle.com/datasets/salahuddinahmedshuvo/student-mental-stress-and-coping-mechanisms)
   - Survey responses covering coping habits, family support, and financial stress
   - Adds lifestyle and coping-behaviour dimensions
   - Integrated through feature engineering to enrich burnout drivers

3. **StudentLife Behavioral Traces (Dartmouth College)** - *Reference Only*  
   - Dataset link: [studentlife.cs.dartmouth.edu](https://studentlife.cs.dartmouth.edu/)
   - Used to **inspire** feature design (e.g., physiological stress indicators)
   - Synthetic proxy variables generated for missing physiological features (blood pressure, breathing problems, etc.)
   - **Not directly merged** into training data; informed feature engineering approach
   - Reference: Wang et al. (2014) "StudentLife: Assessing Mental Health, Academic Performance and Behavioral Trends..."

4. **Event Stress Weighting Research**
   - Literature-backed stress multipliers for calendar events (type × priority × intensity)
   - Powers the calendar stress scoring and forecast adjustments

---

## 🧪 Testing the Application

### Test Scenarios

1. **New User Flow** (use `student_demo`):
   - Take a quick risk check
   - Take a full assessment
   - Add calendar events
   - View forecast

2. **Returning User Flow** (use `test_student`):
   - View dashboard with historical data
   - Check 7-day forecast
   - See achievement progress
   - Add new events and see forecast update

3. **Calendar Stress Impact**:
   - Add a high-priority exam
   - Check forecast - should show increased burnout risk
   - Add exercise/social events
   - Check forecast - should show stress reduction

### Sample Data Access

- **Backend Data**: `backend/data/local_store.json`
- **Model Performance**: Run `python backend/research/test_behavior.py`
- **API Health**: Visit `http://127.0.0.1:8000/health`
- **Model Status**: Visit `http://127.0.0.1:8000/predict/status`

---

## 📝 Development Notes

### Design Decisions

1. **Local-First Architecture**: No cloud dependencies to avoid billing issues and ensure easy setup
2. **Separate Quick vs Full Assessments**: Prevents survey fatigue while maintaining ML accuracy
3. **Calendar Integration**: Proactive burnout prevention through deadline awareness
4. **Score Transformation**: Continuous burnout score (0-100) mapped to four risk bands (Low/Moderate/High/Severe)
5. **Achievement System**: Gamification to encourage regular self-monitoring

### Known Limitations

- **Local Storage Only**: Data is stored in JSON files (not production-ready)
- **Single Machine**: No multi-device sync
- **Windows-Optimized**: Scripts are PowerShell-based
- **Dev Authentication**: Simple user ID login (no passwords)

### Future Enhancements

- Cloud deployment with proper database
- Mobile app version
- Integration with university LMS systems
- Peer support features
- Counselor dashboard for early intervention

---

## 🆘 Troubleshooting

### Common Issues

**"npm not found"**
- Install Node.js from nodejs.org
- Restart your terminal after installation

**"python not found"**
- Install Python 3.12+ from python.org
- Make sure "Add Python to PATH" was checked during installation

**"Port 8000 already in use"**
- Close any running Python processes
- Or change the port in `start-dev.ps1`

**"Module not found" errors**
- Run `npm install` in the root directory
- Run `pip install -r requirements.txt` in the backend directory

**Backend not starting**
- Make sure you're in the backend virtual environment
- Check that all dependencies are installed
- Try deleting `.venv` and recreating it

### Getting Help

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

---

## 🙏 Acknowledgments

- **StudentLife Dataset**: Dartmouth College (feature inspiration)  
- **Student Stress Monitoring Datasets**: Kaggle contributors  
- **Student Mental Stress & Coping Mechanisms**: Kaggle contributors  
- **UI Components**: Radix UI, shadcn/ui  
- **ML Libraries**: scikit-learn, pandas, numpy

---

## 💡 Demo

Start with the `test_student` account to see the full system in action with pre-populated data!
