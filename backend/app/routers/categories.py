from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import models, schemas
from ..database import get_session

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("/", response_model=schemas.CategoryRead)
async def create_category(category: schemas.CategoryCreate, db: AsyncSession = Depends(get_session)):
    db_cat = models.Category(name=category.name, subcategory=category.subcategory)
    db.add(db_cat)
    await db.commit()
    await db.refresh(db_cat)
    return db_cat


@router.get("/", response_model=List[schemas.CategoryRead])
async def list_categories(db: AsyncSession = Depends(get_session)):
    from sqlalchemy import select

    result = await db.execute(select(models.Category))
    return result.scalars().all()


@router.get("/{category_id}", response_model=schemas.CategoryRead)
async def get_category(category_id: int, db: AsyncSession = Depends(get_session)):
    cat = await db.get(models.Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat
