# Inventory Backend


FastAPI backend using SQLAlchemy for Category, Product, and ProductSale tables.

Environment
- Set `DATABASE_URL` to a Postgres DSN. Example:
	`postgresql+psycopg://user:password@localhost:5432/inventory_db`
- If `DATABASE_URL` is not set, the default in the code is:
	`postgresql+psycopg://postgres:postgres@localhost:5432/inventory_db` (change as needed).

Run (development)

1. Install deps: pip install -r requirements.txt
2. Run: uvicorn backend.app.main:app --reload --port 8000

API routers/endpoints
- /categories/    (POST, GET)
- /categories/{id} (GET)
- /products/      (POST, GET)
- /products/{sku} (GET)
- /sales/         (POST, GET)

Tests

cd backend
pytest -q
