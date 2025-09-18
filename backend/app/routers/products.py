from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from sqlalchemy import select
from .. import crud, schemas
from ..database import get_db
from ..security import get_current_user
from .. import models
import io, csv


router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=schemas.ProductOut)
async def create_product(product: schemas.ProductCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        data = product.model_dump()
        data['user_id'] = current_user.id
        p_schema = schemas.ProductCreate.model_validate(data)
        return await crud.create_product(db, p_schema)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[schemas.ProductOut])
async def list_products(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return await crud.get_products(db, skip=skip, limit=limit, user_id=current_user.id)


@router.get("/{product_id}", response_model=schemas.ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    p = await crud.get_product(db, product_id, user_id=current_user.id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@router.put("/{product_id}", response_model=schemas.ProductOut)
async def update_product(product_id: int, updates: schemas.ProductUpdate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        p = await crud.update_product(db, product_id, updates, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@router.delete("/{product_id}")
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ok = await crud.delete_product(db, product_id, user_id=current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@router.post("/upload")
async def upload_products_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Upload a CSV file (bytes) containing product rows. Returns per-row results.

    Expected CSV headers (any order): name, sku, category_id, description, price, quantity, low_stock_threshold, supplier_id
    """
    # We accept raw bytes and parse CSV from it. Use standard library csv.
    
    try:
        raw = await file.read()
        stream = io.StringIO(raw.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read/decod e uploaded file as UTF-8")

    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file must have a header row")

    results = []
    row_no = 1
    for row in reader:
        row_no += 1
        # Normalize empty strings to None
        data = {k: (v if v != '' else None) for k, v in row.items()}
        # Attempt minimal type coercion, abort row on first invalid field
        bad = False
        for int_field in ['price', 'quantity', 'low_stock_threshold', 'category_id', 'supplier_id']:
            if data.get(int_field) is not None:
                try:
                    data[int_field] = int(float(data[int_field]))
                except Exception:
                    results.append({"row": row_no, "ok": False, "error": f"Invalid integer for {int_field}: {data.get(int_field)}"})
                    bad = True
                    break
        if bad:
            continue
        # Attach current user id so ownership is preserved
        data['user_id'] = current_user.id
        try:
            p_schema = schemas.ProductCreate.model_validate(data)
        except Exception as e:
            results.append({"row": row_no, "ok": False, "error": f"Validation error: {e}"})
            continue
        try:
            created = await crud.create_product(db, p_schema)
            results.append({"row": row_no, "ok": True, "product_id": created.id})
        except ValueError as e:
            results.append({"row": row_no, "ok": False, "error": str(e)})
        except Exception as e:
            results.append({"row": row_no, "ok": False, "error": f"Unexpected error: {e}"})

    return {"results": results}


@router.get("/{product_id}/sales", response_model=List[schemas.ProductSaleOut])
async def get_product_sales(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all sales for a specific product"""
    # First check if product exists
    product = await db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    stmt = select(models.ProductSale).where(
        models.ProductSale.product_id == product_id,
        models.ProductSale.user_id == current_user.id
    ).order_by(models.ProductSale.sale_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{product_id}/stock-movements", response_model=List[schemas.StockMovementOut])
async def get_product_stock_movements(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all stock movements for a specific product"""
    # First check if product exists
    product = await db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    stmt = select(models.StockMovement).where(
        models.StockMovement.product_id == product_id,
        models.StockMovement.user_id == current_user.id
    ).order_by(models.StockMovement.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()
    return result.scalars().all()
