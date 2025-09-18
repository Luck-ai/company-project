from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine
from . import crud, models, schemas
from .database import engine, Base, get_db
from .routers import products, suppliers, product_categories, product_sales, users, email, restock

app = FastAPI(title="Stock Management API", debug=True)


@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# include routers
app.include_router(products.router)
app.include_router(suppliers.router)
app.include_router(product_categories.router)
app.include_router(product_sales.router)
app.include_router(users.router)
app.include_router(email.router)
app.include_router(restock.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
