from pydantic import BaseModel, Field
from typing import Optional, List
import datetime


class SupplierBase(BaseModel):
    name: str = Field(..., max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class SupplierCreate(SupplierBase):
    user_id: Optional[int] = None


class SupplierOut(SupplierBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str = Field(..., max_length=255)
    sku: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    price: int
    quantity: int = 0
    low_stock_threshold: int = 0
    supplier_id: Optional[int] = None
    user_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    price: Optional[int] = None
    quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    supplier_id: Optional[int] = None


class ProductOut(ProductBase):
    id: int
    last_updated: Optional[datetime.datetime] = None
    supplier: Optional[SupplierOut] = None
    user_id: Optional[int] = None
    # Include nested category for convenience so frontend doesn't need extra lookup
    category: Optional['ProductCategoryOut'] = None

    class Config:
        from_attributes = True


class ProductCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProductCategoryCreate(ProductCategoryBase):
    user_id: Optional[int] = None


class ProductCategoryOut(ProductCategoryBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True

# Forward refs resolution (since ProductOut refers to ProductCategoryOut)
ProductOut.model_rebuild()


class ProductSaleBase(BaseModel):
    quantity: int
    sale_date: Optional[datetime.datetime] = None


class ProductSaleCreate(ProductSaleBase):
    pass


class ProductSaleOut(ProductSaleBase):
    id: int
    product_id: int
    user_id: Optional[int] = None
    sale_price: float  # This will be populated from the product's current price

    class Config:
        from_attributes = True


class StockMovementBase(BaseModel):
    product_id: int
    movement_type: str  # 'sale', 'restock', 'adjustment', 'initial'
    quantity_change: int  # positive for additions, negative for subtractions
    quantity_before: int
    quantity_after: int
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    transaction_date: Optional[datetime.datetime] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementOut(StockMovementBase):
    id: int
    user_id: Optional[int] = None
    created_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    full_name: str
    email: str


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    is_verified: bool = False

    class Config:
        from_attributes = True


class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: str
    password: str


class VerifyRequest(BaseModel):
    email: str


class VerifyResponse(BaseModel):
    status: str
    detail: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: Optional[str] = None


# Purchase Order Schemas
class PurchaseOrderBase(BaseModel):
    supplier_id: Optional[int] = None
    product_id: int
    quantity_ordered: int
    status: str = "pending"
    notes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    user_id: Optional[int] = None


class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    quantity_ordered: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderOut(PurchaseOrderBase):
    id: int
    user_id: int
    order_date: Optional[datetime.datetime] = None
    supplier: Optional[SupplierOut] = None
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# Restock Summary
class RestockSummary(BaseModel):
    pending_orders: int
    low_stock_items: int
    out_of_stock_items: int
    total_pending_value: float
