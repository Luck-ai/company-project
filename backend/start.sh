#!/usr/bin/env sh
export DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/stockdb"}
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
