# ClarityCompass - AI-Powered Student Burnout Prevention System

> **Final Year University Project**  
> An intelligent web application that predicts and prevents student burnout using machine learning and behavioral analytics.

---

## 📋 Project Overview

**ClarityCompass** is a comprehensive burnout prevention system designed specifically for university students. It combines validated psychological assessments (DASS-21), behavioral data analysis, and machine learning to provide:

- 🎯 **Real-time burnout risk assessment** using a Random Forest ML model (86% accuracy)
- 📊 **7-day burnout forecasting** based on historical patterns and upcoming deadlines
- 📅 **Smart calendar integration** with stress-weighted event tracking
- 📈 **Progress monitoring** with achievement tracking and trend visualization
- ⚡ **Quick daily check-ins** with smart prompts for comprehensive assessments

### Key Features

✅ **ML-Powered Predictions**: Random Forest model trained on 48 students with 13,000+ behavioral data points  
✅ **Validated Psychology**: Based on DASS-21 (Depression, Anxiety, Stress Scale)  
✅ **Calendar Intelligence**: Automatically calculates stress load from events (type, priority, complexity)  
✅ **Forecasting Engine**: Predicts burnout trajectory for the next 7 days  
✅ **Local-First**: No cloud dependencies, runs entirely on your machine  
✅ **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS

---

## 🚀 Quick Start (For Reviewers)

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
```

**Option 2: Manual Setup**

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed step-by-step instructions.

### First Run

1. The application will open two windows:
   - **Backend** at `http://127.0.0.1:8000`
   - **Frontend** at `http://localhost:9003`

2. Open your browser to `http://localhost:9003`

3. **Login with demo account**:
   - User ID: `test_student` (pre-populated with sample data)
   - Or use: `student_demo` (blank slate)

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
- 21-question DASS-21 survey
- ML-powered burnout prediction
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
- **ML Models**: scikit-learn (Random Forest)
- **Data Processing**: pandas, numpy
- **Authentication**: JWT (dev mode for local)
- **Storage**: JSON file-based (local development)

### ML Model
- **Algorithm**: Random Forest Classifier
- **Features**: 48 engineered features from StudentLife dataset
- **Training Data**: 48 students, 13,000+ behavioral data points
- **Accuracy**: 86% on test set
- **Validation**: Based on DASS-21 psychological assessment

---

## 📂 Project Structure

```
clarity-compass-fullstack/
├── src/                          # Frontend (Next.js)
│   ├── app/                      # Pages and routes
│   │   ├── (app)/               # Authenticated pages
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── quick-risk/      # Quick assessment
│   │   │   ├── fused-risk/      # Full DASS-21 assessment
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
│   │   ├── survey_model.joblib # DASS-21 model
│   │   ├── behavior_studentlife.joblib # Behavior model
│   │   └── scaler.joblib       # Feature scaler
│   ├── data/                    # Training data & storage
│   │   ├── dass21/             # DASS-21 dataset
│   │   ├── studentlife/        # StudentLife dataset
│   │   └── local_store.json    # User data (dev)
│   └── research/                # Training scripts
│
├── docs/                         # Documentation
├── setup.ps1                    # Windows setup script
├── start-dev.ps1                # Dev server launcher
├── package.json                 # Frontend dependencies
└── backend/requirements.txt     # Backend dependencies
```

---

## 🔬 Research Foundation

This project is built on established academic research:

1. **DASS-21 Scale**: Depression Anxiety Stress Scales (Lovibond & Lovibond, 1995)
   - Validated psychological assessment
   - 21 items across 3 dimensions
   - Widely used in academic research

2. **StudentLife Dataset**: Dartmouth College behavioral dataset
   - 48 students over 10 weeks
   - 13,000+ behavioral data points
   - Includes activity, sleep, social interaction, and mental health data
   - Reference: Wang et al. (2014) - "StudentLife: Assessing Mental Health, Academic Performance and Behavioral Trends of College Students using Smartphones"

3. **Event Stress Weighting**: Research-backed stress point system
   - Event types based on academic stress literature
   - Three-dimensional weighting (type × priority × complexity)
   - Includes stress-reducing activities (exercise, social, breaks)

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
4. **Score Transformation**: Raw ML output (32-94) transformed to intuitive 5-95 scale
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

## 👥 Project Information

**Author**: [Your Name]  
**Institution**: [Your University]  
**Course**: [Your Course/Module]  
**Academic Year**: 2024-2025  
**Supervisor**: [Supervisor Name]

---

## 📄 License

This project is submitted as academic work for university evaluation.

---

## 🙏 Acknowledgments

- **StudentLife Dataset**: Dartmouth College
- **DASS-21**: Psychology Foundation of Australia
- **UI Components**: Radix UI, shadcn/ui
- **ML Libraries**: scikit-learn, pandas, numpy

---

## 📧 Contact

For questions or issues, please contact: [your.email@university.edu]

---

**⭐ For Reviewers**: Start with `test_student` account to see the full system in action with pre-populated data!
