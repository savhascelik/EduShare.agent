import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.seed import seed_database
from app.worker import start_background_queue_loop

# Import Routers
from app.routes.auth_routes import router as auth_router
from app.routes.school_routes import router as school_router
from app.routes.surplus_routes import router as surplus_router
from app.routes.need_routes import router as need_router
from app.routes.agent_routes import router as agent_router
from app.routes.stats_routes import router as stats_router
from app.routes.stream_routes import router as stream_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous Resource Sharing & Logistics Agent for Educational Communities"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded images
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router)
app.include_router(school_router)
app.include_router(surplus_router)
app.include_router(need_router)
app.include_router(agent_router)
app.include_router(stats_router)
app.include_router(stream_router)

@app.on_event("startup")
async def startup_event():
    # 1. Initialize Tables
    Base.metadata.create_all(bind=engine)
    # 2. Seed Real Schools
    seed_database()
    # 3. Launch Autonomous Agent Self-Waking Loop in background
    asyncio.create_task(start_background_queue_loop())

@app.get("/")
def root():
    return {
        "project": "EduShare Agent API",
        "status": "RUNNING",
        "track": "Good Neighbor Agents - Agents for Humans Hackathon",
        "agent_framework": "Strands Agents SDK + Amazon Bedrock"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
