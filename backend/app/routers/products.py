from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from .. import models, schemas
from ..database import get_session
import tempfile
import shutil
from pathlib import Path
from backend.scripts.import_products import import_products as import_products_func
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["products"])


@router.get('/facets', response_model=schemas.ProductFacets)
async def get_product_facets(db: AsyncSession = Depends(get_session)):
    """Return distinct sizes and colors present in the product table."""
    # Use raw SQL or SQLAlchemy select with distinct
    sizes_stmt = select(models.Product.size).distinct()
    colors_stmt = select(models.Product.color).distinct()
    sizes_result = await db.execute(sizes_stmt)
    colors_result = await db.execute(colors_stmt)
    raw_sizes = [s[0] for s in sizes_result.fetchall() if s[0] is not None and str(s[0]).strip()]
    raw_colors = [c[0] for c in colors_result.fetchall() if c[0] is not None and str(c[0]).strip()]

    # Allowed size tokens (same as importer)
    allowed = {"XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "F", "FF"}

    sizes_set = set()
    import re
    for s in raw_sizes:
        raw = str(s).strip()
        if not raw:
            continue
        # handle comma or slash separation
        parts = [p.strip() for p in re.split(r'[,/]', raw) if p.strip()]
        for part in parts:
            token = part.upper().replace(' ', '')
            # map simple '2X' -> '2XL'
            if re.match(r'^(2|3)[Xx]$', token):
                token = token.replace('X', 'XL')
            # accept if in allowed set or simple repeated-X form
            if token in allowed:
                sizes_set.add(token)
            else:
                # try heuristic: 'XXXL' -> '3XL'
                if token.endswith('XL') and token.count('X') >= 2:
                    xcount = token.count('X')
                    if xcount == 3 and '3XL' in allowed:
                        sizes_set.add('3XL')
                    elif xcount == 2 and 'XXL' in allowed:
                        sizes_set.add('XXL')

    colors_set = set()
    for c in raw_colors:
        raw = str(c).strip()
        if not raw:
            continue
        parts = [p.strip() for p in re.split(r'[,/]', raw) if p.strip()]
        for part in parts:
            # accept only if contains any letter (to avoid numeric codes)
            if re.search(r'[A-Za-zก-ฮ]', part):
                colors_set.add(part)

    return schemas.ProductFacets(sizes=sorted(list(sizes_set)), colors=sorted(list(colors_set)))


@router.post("/", response_model=schemas.ProductRead)
async def create_product(product: schemas.ProductCreate, db: AsyncSession = Depends(get_session)):
    if product.category_id is not None:
        cat = await db.get(models.Category, product.category_id)
        if not cat:
            raise HTTPException(status_code=400, detail="Category does not exist")
    db_prod = models.Product(sku=product.sku, name=product.name, category_id=product.category_id, stock_level=product.stock_level)
    db.add(db_prod)
    await db.commit()
    await db.refresh(db_prod)
    return db_prod


@router.get("/", response_model=List[schemas.ProductRead])
async def list_products(
    db: AsyncSession = Depends(get_session),
        category_id: Optional[int] = Query(None),
        size: Optional[str] = Query(None),
        color: Optional[str] = Query(None),
):
    stmt = select(models.Product).options(selectinload(models.Product.category))
    if category_id is not None:
        stmt = stmt.where(models.Product.category_id == category_id)
    if size:
        stmt = stmt.where(models.Product.size == size)
    if color:
        stmt = stmt.where(models.Product.color == color)

    result = await db.execute(stmt)
    prods = result.scalars().all()
    # Attach category_name for convenience
    for p in prods:
        try:
            p.category_name = p.category.name if p.category is not None else None
        except Exception:
            p.category_name = None
    return prods


@router.get("/{sku}", response_model=schemas.ProductRead)
async def get_product(sku: str, db: AsyncSession = Depends(get_session)):
    prod = await db.get(models.Product, sku, options=[selectinload(models.Product.category)])
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        prod.category_name = prod.category.name if prod.category is not None else None
    except Exception:
        prod.category_name = None
    return prod


@router.post("/upload")
async def upload_products_file(file: UploadFile = File(...), dry_run: bool = Query(False)):
    """Upload an Excel file and import products (header on second row).

    Query params:
    - dry_run: if true, importer will only simulate changes and not write to DB
    """
    logger.info(f"Products upload endpoint called - filename: {file.filename}, dry_run: {dry_run}")
    
    # Validate file type
    if not file.filename:
        logger.error("No filename provided in upload request")
        raise HTTPException(status_code=400, detail="No filename provided")
    
    allowed_extensions = ['.xlsx', '.xls', '.csv']
    file_ext = Path(file.filename).suffix.lower()
    logger.info(f"File extension detected: {file_ext}")
    if file_ext not in allowed_extensions:
        logger.error(f"Unsupported file type: {file_ext}")
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    suffix = file_ext or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = tmp.name
        try:
            shutil.copyfileobj(file.file, tmp)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to save uploaded file: {str(e)}")
        finally:
            file.file.close()

    try:
        logger.info(f"Starting products import from: {temp_path}")
        await import_products_func(temp_path, dry_run=dry_run)
        action = "validated" if dry_run else "imported"
        logger.info(f"Product data {action} successfully")
        return {"success": True, "message": f"Product data {action} successfully", "dry_run": dry_run}
    except Exception as e:
        logger.error(f"Product import failed: {str(e)}")
        error_msg = f"Product import failed: {str(e)}"
        if "No valid data found" in str(e):
            error_msg = "No valid product data found in the uploaded file. Please check the file format and content."
        elif "Column" in str(e) and "not found" in str(e):
            error_msg = f"Required columns missing in the file: {str(e)}"
        raise HTTPException(status_code=400, detail=error_msg)
    finally:
        try:
            Path(temp_path).unlink()
        except Exception:
            pass



