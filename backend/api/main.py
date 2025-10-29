from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import auth, survey, predict
from api.routers import forecast as forecast_router
from api.routers import fused as fused_router
from api.routers import calendar as calendar_router
from api.routers import assessment as assessment_router
from api.routers import data as data_router
import os
from api.services.burnout_service import get_burnout_service

app = FastAPI(title="Student Burnout API", version="0.1.0")

# CORS Configuration
origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:9003,http://localhost:3000,http://127.0.0.1:9003,http://127.0.0.1:3000")
allow_origins = [o.strip() for o in origins_env.split(",") if o.strip()]

print(f"[CORS] Allowed origins: {allow_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router)
app.include_router(survey.router)
app.include_router(predict.router)
app.include_router(forecast_router.router)
app.include_router(fused_router.router)
app.include_router(calendar_router.router)
app.include_router(assessment_router.router)
app.include_router(data_router.router)


@app.on_event("startup")
async def _startup_init():
    # Initialize burnout prediction service
    print("[Startup] Loading burnout prediction model...")
    get_burnout_service()
    print("[Startup] Burnout service ready!")

# Run: uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
