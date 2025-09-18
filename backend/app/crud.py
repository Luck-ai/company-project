from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime


async def record_stock_movement_crud(
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
    """Helper function to record stock movements in crud operations"""
    quantity_before = product.quantity - quantity_change  # Calculate before since product.quantity is already updated
    quantity_after = product.quantity
    
    # For manual edits, use current time as transaction date if not provided
    if transaction_date is None:
        transaction_date = datetime.now()
    
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


async def get_product(db: AsyncSession, product_id: int, user_id: Optional[int] = None) -> Optional[models.Product]:
    stmt = select(models.Product).where(models.Product.id == product_id)
    if user_id is not None:
        stmt = stmt.where(models.Product.user_id == user_id)
    stmt = stmt.options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category),
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_products(db: AsyncSession, skip: int = 0, limit: int = 100, user_id: Optional[int] = None) -> List[models.Product]:
    stmt = select(models.Product)
    if user_id is not None:
        stmt = stmt.where(models.Product.user_id == user_id)
    stmt = stmt.options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category),
    ).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_product(db: AsyncSession, product: schemas.ProductCreate) -> models.Product:
    data = product.model_dump()
    # Prevent inserting duplicate SKUs by checking existence first
    sku = data.get("sku")
    if sku:
        stmt = select(models.Product).where(models.Product.sku == sku)
        result = await db.execute(stmt)
        if result.scalars().first():
            raise ValueError("SKU already exists")
    db_product = models.Product(**data)
    db.add(db_product)
    try:
        await db.commit()
        await db.refresh(db_product)
    except IntegrityError as e:
        # rollback and raise a simple error that the router can translate
        await db.rollback()
        msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        # surface SKU-specific messages as before
        if 'sku' in msg.lower():
            raise ValueError("SKU already exists")
        # include original DB message to aid debugging (safe in dev)
        raise ValueError(f"Database integrity error: {msg}")
    # reload with selectinload to ensure relationships accessible without IO
    stmt = select(models.Product).where(models.Product.id == db_product.id).options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category),
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_category(db: AsyncSession, category: schemas.ProductCategoryCreate) -> models.ProductCategory:
    data = category.model_dump()
    # Prevent duplicate category names for the same user
    stmt = select(models.ProductCategory).where(models.ProductCategory.name == data.get('name'))
    if data.get('user_id') is not None:
        stmt = stmt.where(models.ProductCategory.user_id == data.get('user_id'))
    result = await db.execute(stmt)
    if result.scalars().first():
        raise ValueError('Category name already exists')
    db_cat = models.ProductCategory(**data)
    # ensure ownership is set on the model instance
    if data.get('user_id') is not None:
        db_cat.user_id = data.get('user_id')
    db.add(db_cat)
    try:
        await db.commit()
        await db.refresh(db_cat)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        if 'name' in msg.lower():
            raise ValueError('Category name already exists')
        raise ValueError(f"Database integrity error: {msg}")
    return db_cat


async def create_supplier(db: AsyncSession, supplier: schemas.SupplierCreate) -> models.Supplier:
    data = supplier.model_dump()
    # Prevent duplicate supplier names for the same user
    stmt = select(models.Supplier).where(models.Supplier.name == data.get('name'))
    if data.get('user_id') is not None:
        stmt = stmt.where(models.Supplier.user_id == data.get('user_id'))
    result = await db.execute(stmt)
    if result.scalars().first():
        raise ValueError('Supplier name already exists')
    db_sup = models.Supplier(**data)
    # ensure ownership is set on the model instance
    if data.get('user_id') is not None:
        db_sup.user_id = data.get('user_id')
    db.add(db_sup)
    try:
        await db.commit()
        await db.refresh(db_sup)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        if 'name' in msg.lower():
            raise ValueError('Supplier name already exists')
        raise ValueError(f"Database integrity error: {msg}")
    return db_sup


async def update_product(db: AsyncSession, product_id: int, updates: schemas.ProductUpdate, user_id: Optional[int] = None) -> Optional[models.Product]:
    # load product with relationships
    stmt = select(models.Product).where(models.Product.id == product_id)
    if user_id is not None:
        stmt = stmt.where(models.Product.user_id == user_id)
    stmt = stmt.options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category),
    )
    result = await db.execute(stmt)
    db_product = result.scalars().first()
    if not db_product:
        return None
    
    updated_items = updates.model_dump(exclude_unset=True)
    
    # Track quantity changes for stock movements
    old_quantity = db_product.quantity
    new_quantity = updated_items.get('quantity', old_quantity)
    quantity_change = new_quantity - old_quantity
    
    # validate FK references if provided
    if 'supplier_id' in updated_items and updated_items.get('supplier_id') is not None:
        stmt = select(models.Supplier).where(models.Supplier.id == updated_items.get('supplier_id'))
        if user_id is not None:
            stmt = stmt.where(models.Supplier.user_id == user_id)
        result = await db.execute(stmt)
        if not result.scalars().first():
            raise ValueError('Invalid supplier_id')
    if 'category_id' in updated_items and updated_items.get('category_id') is not None:
        stmt = select(models.ProductCategory).where(models.ProductCategory.id == updated_items.get('category_id'))
        if user_id is not None:
            stmt = stmt.where(models.ProductCategory.user_id == user_id)
        result = await db.execute(stmt)
        if not result.scalars().first():
            raise ValueError('Invalid category_id')
    # If SKU is being changed/added, ensure uniqueness across other products
    if "sku" in updated_items:
        new_sku = updated_items.get("sku")
        if new_sku:
            stmt = select(models.Product).where(models.Product.sku == new_sku, models.Product.id != product_id)
            result = await db.execute(stmt)
            if result.scalars().first():
                raise ValueError("SKU already exists")
    
    # Apply updates to the product
    for k, v in updated_items.items():
        setattr(db_product, k, v)
    
    # Record stock movement if quantity changed
    if quantity_change != 0:
        movement_type = "adjustment"
        notes = f"Manual {movement_type} via product edit: {abs(quantity_change)} units"
        
        await record_stock_movement_crud(
            db=db,
            product=db_product,
            movement_type=movement_type,
            quantity_change=quantity_change,
            user_id=user_id,
            reference_type="product_edit",
            notes=notes
        )
    
    db.add(db_product)
    try:
        await db.commit()
        await db.refresh(db_product)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        if 'sku' in msg.lower():
            raise ValueError("SKU already exists")
        raise ValueError(f"Database integrity error: {msg}")
    stmt = select(models.Product).where(models.Product.id == db_product.id).options(
        selectinload(models.Product.supplier),
        selectinload(models.Product.category),
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def delete_product(db: AsyncSession, product_id: int, user_id: Optional[int] = None) -> bool:
    # enforce ownership if user_id provided
    if user_id is not None:
        stmt = select(models.Product).where(models.Product.id == product_id, models.Product.user_id == user_id)
    else:
        stmt = select(models.Product).where(models.Product.id == product_id)
    result = await db.execute(stmt)
    db_product = result.scalars().first()
    if not db_product:
        return False
    await db.delete(db_product)
    await db.commit()
    return True


async def delete_category(db: AsyncSession, category_id: int, user_id: Optional[int] = None) -> bool:
    # enforce ownership if user_id provided
    stmt = select(models.ProductCategory).where(models.ProductCategory.id == category_id)
    if user_id is not None:
        stmt = stmt.where(models.ProductCategory.user_id == user_id)
    result = await db.execute(stmt)
    db_cat = result.scalars().first()
    if not db_cat:
        return False
    # prevent deleting a category that still has products
    # Check for any products referencing this category. Do not scope by user here;
    # if any product (across users) references the category, block deletion.
    stmt = select(models.Product).where(models.Product.category_id == category_id)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise ValueError('Category has products and cannot be deleted')
    await db.delete(db_cat)
    await db.commit()
    return True


async def delete_supplier(db: AsyncSession, supplier_id: int, user_id: Optional[int] = None) -> bool:
    stmt = select(models.Supplier).where(models.Supplier.id == supplier_id)
    if user_id is not None:
        stmt = stmt.where(models.Supplier.user_id == user_id)
    result = await db.execute(stmt)
    db_sup = result.scalars().first()
    if not db_sup:
        return False
    # prevent deleting a supplier that still has products
    # Check for any products referencing this supplier. Do not scope by user here;
    # if any product (across users) references the supplier, block deletion.
    stmt = select(models.Product).where(models.Product.supplier_id == supplier_id)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise ValueError('Supplier has products and cannot be deleted')
    await db.delete(db_sup)
    await db.commit()
    return True


async def update_category(db: AsyncSession, category_id: int, updates: schemas.ProductCategoryCreate, user_id: Optional[int] = None) -> Optional[models.ProductCategory]:
    stmt = select(models.ProductCategory).where(models.ProductCategory.id == category_id)
    if user_id is not None:
        stmt = stmt.where(models.ProductCategory.user_id == user_id)
    result = await db.execute(stmt)
    db_cat = result.scalars().first()
    if not db_cat:
        return None
    updated = updates.model_dump(exclude_unset=True)
    for k, v in updated.items():
        setattr(db_cat, k, v)
    db.add(db_cat)
    try:
        await db.commit()
        await db.refresh(db_cat)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        if 'name' in msg.lower():
            raise ValueError('Category name already exists')
        raise ValueError(f"Database integrity error: {msg}")
    return db_cat


async def update_supplier(db: AsyncSession, supplier_id: int, updates: schemas.SupplierCreate, user_id: Optional[int] = None) -> Optional[models.Supplier]:
    stmt = select(models.Supplier).where(models.Supplier.id == supplier_id)
    if user_id is not None:
        stmt = stmt.where(models.Supplier.user_id == user_id)
    result = await db.execute(stmt)
    db_sup = result.scalars().first()
    if not db_sup:
        return None
    updated = updates.model_dump(exclude_unset=True)
    for k, v in updated.items():
        setattr(db_sup, k, v)
    db.add(db_sup)
    try:
        await db.commit()
        await db.refresh(db_sup)
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig) if getattr(e, 'orig', None) else str(e)
        if 'name' in msg.lower():
            raise ValueError('Supplier name already exists')
        raise ValueError(f"Database integrity error: {msg}")
    return db_sup
