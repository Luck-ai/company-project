from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import csv
import io
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from sqlalchemy import select

router = APIRouter(prefix="/sales", tags=["sales"])


async def record_stock_movement(
    db: AsyncSession,
    product: models.Product,
    movement_type: str,
    quantity_change: int,
    user_id: Optional[int] = None,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    notes: Optional[str] = None,
    transaction_date: Optional[datetime] = None
):
    """Helper function to record stock movements"""
    quantity_before = product.quantity
    quantity_after = quantity_before + quantity_change
    
    movement = models.StockMovement(
        product_id=product.id,
        user_id=user_id,
        movement_type=movement_type,
        quantity_change=quantity_change,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reference_id=reference_id,
        reference_type=reference_type,
        notes=notes,
        transaction_date=transaction_date
    )
    
    db.add(movement)
    return movement


@router.post("/", response_model=schemas.ProductSaleOut)
async def record_sale(
    sale: schemas.ProductSaleCreate,
    product_id: int,  # Product ID passed as query parameter
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # simple sale recording and product quantity adjustment
    product = await db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.quantity < sale.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # Create sale record using product's current price
    db_sale = models.ProductSale(
        product_id=product_id,
        user_id=current_user.id,
        quantity=sale.quantity,
        sale_price=product.price,  # Use product's current price
        sale_date=sale.sale_date or datetime.now()
    )
    db.add(db_sale)
    await db.flush()  # Get the sale ID without committing
    
    # Record stock movement BEFORE updating quantity
    await record_stock_movement(
        db=db,
        product=product,
        movement_type="sale",
        quantity_change=-sale.quantity,  # negative for stock reduction
        user_id=current_user.id,
        reference_id=db_sale.id,
        reference_type="sale",
        notes=f"Sale of {sale.quantity} units at ${product.price} each",
        transaction_date=sale.sale_date
    )
    
    # Reduce stock count
    product.quantity = product.quantity - sale.quantity
    
    await db.commit()
    await db.refresh(db_sale)
    return db_sale


@router.get("/", response_model=List[schemas.ProductSaleOut])
async def list_sales(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stmt = select(models.ProductSale).where(models.ProductSale.user_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/product/{product_id}", response_model=List[schemas.ProductSaleOut])
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


@router.post("/upload")
async def upload_sales_csv(
    file: UploadFile = File(...),
    product_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload sales data from CSV file
    Expected CSV format: quantity,sale_date (or quantity,date)
    - quantity: number of units sold (positive integer)
    - sale_date: date of sale in YYYY-MM-DD format (optional, defaults to current time)
    - product_id is provided via form parameter, not in CSV
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    print(f"CSV Upload: product_id={product_id}, filename={file.filename}")  # Debug logging
    
    try:
        # Read CSV content
        content = await file.read()
        csv_data = content.decode('utf-8-sig')  # Handle BOM if present
        
        # Clean the CSV data to remove potential issues
        csv_data = csv_data.strip()
        
        print(f"CSV Data received:\n{csv_data}")  # Debug logging
        
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        
        # Get the fieldnames to debug
        fieldnames = csv_reader.fieldnames
        print(f"CSV fieldnames: {fieldnames}")  # Debug logging
        
        sales_created = 0
        errors = []
        total_rows = 0
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because row 1 is headers
            total_rows += 1
            
            # Clean row data - strip whitespace from all values
            cleaned_row = {k.strip() if k else k: v.strip() if v else v for k, v in row.items()}
            print(f"Processing row {row_num}: {cleaned_row}")  # Debug logging
            
            try:
                # Parse CSV row - expect columns: quantity, sale_date
                # Product ID comes from form parameter
                if not product_id:
                    errors.append(f"Row {row_num}: No product_id provided in upload request")
                    continue
                
                row_product_id = product_id
                
                # Get quantity
                if not cleaned_row.get('quantity'):
                    errors.append(f"Row {row_num}: Missing 'quantity' column")
                    continue
                    
                try:
                    quantity = int(cleaned_row['quantity'])
                except (ValueError, TypeError):
                    errors.append(f"Row {row_num}: Invalid quantity '{cleaned_row['quantity']}' - must be a number")
                    continue
                
                if quantity <= 0:
                    errors.append(f"Row {row_num}: Quantity must be positive, got {quantity}")
                    continue
                
                # Get sale_date
                sale_date = None
                date_field = None
                
                # Look for date field - try 'sale_date' first, then 'date'
                if 'sale_date' in cleaned_row and cleaned_row['sale_date']:
                    date_field = cleaned_row['sale_date']
                elif 'date' in cleaned_row and cleaned_row['date']:
                    date_field = cleaned_row['date']
                
                if date_field:
                    try:
                        # Try ISO format first
                        sale_date = datetime.fromisoformat(date_field.replace('Z', '+00:00'))
                    except ValueError:
                        try:
                            # Try YYYY-MM-DD format
                            sale_date = datetime.strptime(date_field, '%Y-%m-%d')
                        except ValueError:
                            try:
                                # Try MM/DD/YYYY format
                                sale_date = datetime.strptime(date_field, '%m/%d/%Y')
                            except ValueError:
                                try:
                                    # Try DD/MM/YYYY format
                                    sale_date = datetime.strptime(date_field, '%d/%m/%Y')
                                except ValueError:
                                    errors.append(f"Row {row_num}: Invalid date format '{date_field}'. Use YYYY-MM-DD format.")
                                    continue
                
                # Validate product exists and has sufficient stock
                product = await db.get(models.Product, row_product_id)
                if not product:
                    errors.append(f"Row {row_num}: Product with ID {row_product_id} not found")
                    continue
                
                if product.quantity < quantity:
                    errors.append(f"Row {row_num}: Insufficient stock (available: {product.quantity}, requested: {quantity})")
                    continue
                
                # Create sale record using product's current price
                db_sale = models.ProductSale(
                    product_id=row_product_id,
                    user_id=current_user.id,
                    quantity=quantity,
                    sale_price=product.price,  # Use product's current price
                    sale_date=sale_date or datetime.now()
                )
                db.add(db_sale)
                await db.flush()  # Get the sale ID
                
                # Record stock movement BEFORE updating quantity
                await record_stock_movement(
                    db=db,
                    product=product,
                    movement_type="sale",
                    quantity_change=-quantity,  # negative for stock reduction
                    user_id=current_user.id,
                    reference_id=db_sale.id,
                    reference_type="sale",
                    notes=f"CSV upload sale of {quantity} units at ${product.price} each",
                    transaction_date=sale_date
                )
                
                # Reduce stock count
                product.quantity = product.quantity - quantity
                
                sales_created += 1
                
            except (ValueError, KeyError) as e:
                errors.append(f"Row {row_num}: Invalid data - {str(e)}")
                continue
            except Exception as e:
                errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
                continue
        
        # Commit all sales
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Error committing sales to database: {str(e)}")
        
        response = {
            "message": f"Successfully uploaded {sales_created} sales records",
            "sales_created": sales_created,
            "errors": errors,
            "total_rows_processed": total_rows
        }
        
        return response
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

