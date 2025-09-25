
from fastapi import FastAPI, Request
import sys
from pathlib import Path
import logging
import time

PROJECT_ROOT = Path(__file__).resolve().parents[1].parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from .database import create_db_and_tables
from .routers import categories, products, sales
from fastapi.middleware.cors import CORSMiddleware

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Inventory API")

# Development CORS settings: allow frontend dev servers to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Incoming request: {request.method} {request.url}")
    
    if request.method == "POST" and "upload" in str(request.url):
        logger.info(f"Upload request detected - Headers: {dict(request.headers)}")
    
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Request completed: {request.method} {request.url} - Status: {response.status_code} - Time: {process_time:.4f}s")
    return response

# Development CORS settings: allow frontend dev servers to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()


# include routers
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(sales.router)

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Inventory API is running"}

@app.get("/health")
async def health():
    logger.info("Health check endpoint accessed")
    return {"status": "healthy", "message": "API is running normally"}
