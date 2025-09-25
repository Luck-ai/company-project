from fastapi import APIRouter, Depends, HTTPException
from fastapi import UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from .. import models, schemas
from ..database import get_session
import tempfile
import shutil
from pathlib import Path
from backend.scripts.import_sales import import_sales as import_sales_func
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("/", response_model=schemas.ProductSaleRead)
async def create_sale(sale: schemas.ProductSaleCreate, db: AsyncSession = Depends(get_session)):
    product = await db.get(models.Product, sale.sku)
    if not product:
        raise HTTPException(status_code=400, detail="Product sku does not exist")
    if product.stock_level - sale.quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    product.stock_level = product.stock_level - sale.quantity
    db_sale = models.ProductSale(channel=sale.channel, date=sale.date, sku=sale.sku, quantity=sale.quantity)
    db.add(db_sale)
    db.add(product)
    await db.commit()
    await db.refresh(db_sale)
    return db_sale


@router.get("/", response_model=List[schemas.ProductSaleRead])
async def list_sales(db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(models.ProductSale))
    return result.scalars().all()


@router.get("/{sku}", response_model=List[schemas.ProductSaleRead])
async def list_sales_by_sku(sku: str, db: AsyncSession = Depends(get_session)):
    """Return sales records filtered by SKU (path parameter).

    This endpoint performs a simple database query to fetch only sales
    that reference the provided SKU. It's intended to support the
    frontend product details view which needs sales for a single SKU.
    """
    logger.info(f"Fetching sales for SKU: {sku}")
    result = await db.execute(select(models.ProductSale).where(models.ProductSale.sku == sku))
    sales = result.scalars().all()
    return sales

@router.post("/upload")
async def upload_sales_file(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    create_missing: bool = Query(False),
):
    """Upload an Excel file from the frontend and import sales.

    Query params:
    - dry_run: if true, no DB writes are performed
    - create_missing: if true, missing products are created
    """
    logger.info(f"Sales upload endpoint called - filename: {file.filename}, dry_run: {dry_run}, create_missing: {create_missing}")
    
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
    
    # save upload to a temporary file then call the async import function
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
        # call the import function (it is async)
        logger.info(f"Starting sales import from: {temp_path}")
        await import_sales_func(temp_path, dry_run=dry_run, create_missing=create_missing)
        action = "validated" if dry_run else "imported"
        logger.info(f"Sales data {action} successfully")
        return {"success": True, "message": f"Sales data {action} successfully", "dry_run": dry_run, "create_missing": create_missing}
    except Exception as e:
        logger.error(f"Sales import failed: {str(e)}")
        error_msg = f"Sales import failed: {str(e)}"
        
        # Provide more specific error messages based on the error type
        if "ForeignKeyViolationError" in str(e) or "violates foreign key constraint" in str(e):
            if "product_sale_sku_fkey" in str(e):
                error_msg = "Some products referenced in the sales data don't exist in the database. Enable 'Create missing products' option to automatically create them, or ensure all products exist before importing sales."
        elif "No valid data found" in str(e):
            error_msg = "No valid sales data found in the uploaded file. Please check the file format and content."
        elif "Could not detect required columns" in str(e):
            error_msg = "Required columns (SKU, Date, Quantity) could not be found in the file. Please check the file format."
        elif "Column" in str(e) and "not found" in str(e):
            error_msg = f"Required columns missing in the file: {str(e)}"
        
        raise HTTPException(status_code=400, detail=error_msg)
    finally:
        # remove temporary file
        try:
            Path(temp_path).unlink()
        except Exception:
            pass
