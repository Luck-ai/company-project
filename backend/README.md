FastAPI backend for Stock Management

This backend provides a simple FastAPI app with a PostgreSQL database using SQLAlchemy.

Quick start (local, Python):

1. Create a virtualenv and activate it.
2. Install requirements:

   python -m pip install -r requirements.txt

3. Set DATABASE_URL environment variable (see `.env.example`). By default the app tries:

   postgresql://postgres:postgres@localhost:5432/stockdb

4. Start the app:

   uvicorn app.main:app --reload --port 8000

API docs will be available at http://localhost:8000/docs

Quick start (Docker Compose):

1. From the repository root run:

   docker-compose -f backend/docker-compose.yml up --build

This will start a Postgres container and the backend. The backend will use the DATABASE_URL set in the compose file.

Files of interest:
- `app/main.py` - FastAPI app and router mounting
- `app/models.py` - SQLAlchemy models
- `app/schemas.py` - Pydantic schemas
- `app/crud.py` - DB helper functions
- `app/database.py` - SQLAlchemy engine & session

Next steps you might want:
- Add authentication (JWT)
- Add other models (suppliers, orders, users)
- Add Alembic migrations
