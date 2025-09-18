from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List
from .. import crud, schemas, models
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/restock", tags=["restock"])


@router.get("/low-stock", response_model=List[schemas.ProductOut])
async def get_low_stock_products(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all products that are at or below their low stock threshold"""
    stmt = select(models.Product).options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category)
    ).where(
        and_(
            models.Product.user_id == current_user.id,
            models.Product.quantity <= models.Product.low_stock_threshold
        )
    ).order_by(models.Product.quantity.asc())
    
    result = await db.execute(stmt)
    products = result.scalars().all()
    return products


@router.get("/out-of-stock", response_model=List[schemas.ProductOut])
async def get_out_of_stock_products(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all products that are completely out of stock"""
    stmt = select(models.Product).options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category)
    ).where(
        and_(
            models.Product.user_id == current_user.id,
            models.Product.quantity == 0
        )
    ).order_by(models.Product.name)
    
    result = await db.execute(stmt)
    products = result.scalars().all()
    return products


@router.get("/summary", response_model=schemas.RestockSummary)
async def get_restock_summary(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get summary statistics for restock dashboard"""
    
    # Count pending orders
    pending_orders_stmt = select(models.PurchaseOrder).where(
        and_(
            models.PurchaseOrder.user_id == current_user.id,
            models.PurchaseOrder.status == 'pending'
        )
    )
    pending_orders_result = await db.execute(pending_orders_stmt)
    pending_orders = pending_orders_result.scalars().all()
    pending_orders_count = len(pending_orders)
    
    # Calculate total pending value using product prices
    total_pending_value = 0
    for order in pending_orders:
        product = await db.get(models.Product, order.product_id)
        if product:
            total_pending_value += (product.price / 100) * order.quantity_ordered  # price in cents to dollars
    
    # Count low stock items
    low_stock_stmt = select(models.Product).where(
        and_(
            models.Product.user_id == current_user.id,
            models.Product.quantity <= models.Product.low_stock_threshold,
            models.Product.quantity > 0
        )
    )
    low_stock_result = await db.execute(low_stock_stmt)
    low_stock_count = len(low_stock_result.scalars().all())
    
    # Count out of stock items
    out_of_stock_stmt = select(models.Product).where(
        and_(
            models.Product.user_id == current_user.id,
            models.Product.quantity == 0
        )
    )
    out_of_stock_result = await db.execute(out_of_stock_stmt)
    out_of_stock_count = len(out_of_stock_result.scalars().all())
    
    return schemas.RestockSummary(
        pending_orders=pending_orders_count,
        low_stock_items=low_stock_count,
        out_of_stock_items=out_of_stock_count,
        total_pending_value=float(total_pending_value)
    )


@router.post("/orders", response_model=schemas.PurchaseOrderOut)
async def create_purchase_order(
    order: schemas.PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new purchase order for restocking"""
    
    # Verify the product exists and belongs to the user
    product = await db.get(models.Product, order.product_id)
    if not product or product.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Verify supplier exists if provided
    if order.supplier_id:
        supplier = await db.get(models.Supplier, order.supplier_id)
        if not supplier or supplier.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Create the purchase order
    db_order = models.PurchaseOrder(
        user_id=current_user.id,
        supplier_id=order.supplier_id,
        product_id=order.product_id,
        quantity_ordered=order.quantity_ordered,
        status=order.status,
        notes=order.notes
    )
    
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    
    # Return with relationships loaded
    stmt = select(models.PurchaseOrder).options(
        selectinload(models.PurchaseOrder.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.category)
    ).where(models.PurchaseOrder.id == db_order.id)
    
    result = await db.execute(stmt)
    order_with_relations = result.scalar_one()
    
    return order_with_relations


@router.get("/orders", response_model=List[schemas.PurchaseOrderOut])
async def get_purchase_orders(
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get purchase order history, optionally filtered by status"""
    
    stmt = select(models.PurchaseOrder).options(
        selectinload(models.PurchaseOrder.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.category)
    ).where(
        models.PurchaseOrder.user_id == current_user.id
    )
    
    if status:
        stmt = stmt.where(models.PurchaseOrder.status == status)
    
    stmt = stmt.order_by(models.PurchaseOrder.order_date.desc()).offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    orders = result.scalars().all()
    return orders


@router.get("/orders/{order_id}", response_model=schemas.PurchaseOrderOut)
async def get_purchase_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific purchase order"""
    
    stmt = select(models.PurchaseOrder).options(
        selectinload(models.PurchaseOrder.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.category)
    ).where(
        and_(
            models.PurchaseOrder.id == order_id,
            models.PurchaseOrder.user_id == current_user.id
        )
    )
    
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return order


@router.put("/orders/{order_id}", response_model=schemas.PurchaseOrderOut)
async def update_purchase_order(
    order_id: int,
    order_update: schemas.PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a purchase order (e.g., mark as completed)"""
    
    # Get the order with relationships loaded
    stmt = select(models.PurchaseOrder).options(
        selectinload(models.PurchaseOrder.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.supplier),
        selectinload(models.PurchaseOrder.product).selectinload(models.Product.category)
    ).where(
        and_(
            models.PurchaseOrder.id == order_id,
            models.PurchaseOrder.user_id == current_user.id
        )
    )
    
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Update fields
    update_data = order_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    
    await db.commit()
    await db.refresh(order)
    
    # If order is marked as completed, update product stock
    if order_update.status == "completed":
        product = await db.get(models.Product, order.product_id)
        if product:
            old_quantity = product.quantity
            product.quantity += order.quantity_ordered
            
            # Create stock movement record
            stock_movement = models.StockMovement(
                product_id=product.id,
                user_id=current_user.id,
                movement_type='restock',
                quantity_change=order.quantity_ordered,
                quantity_before=old_quantity,
                quantity_after=product.quantity,
                reference_id=order.id,
                reference_type='purchase_order',
                notes=f"Restock from purchase order #{order.id}"
            )
            
            db.add(stock_movement)
            await db.commit()
    
    return order


@router.delete("/orders/{order_id}")
async def delete_purchase_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a purchase order"""
    
    order = await db.get(models.PurchaseOrder, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    await db.delete(order)
    await db.commit()
    
    return {"ok": True}