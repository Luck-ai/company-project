from pydantic import BaseModel
from typing import Optional
from typing import List
from datetime import date


class CategoryCreate(BaseModel):
    name: str
    subcategory: Optional[str] = None


class CategoryRead(CategoryCreate):
    category_id: int


class ProductCreate(BaseModel):
    sku: str
    name: str
    category_id: Optional[int] = None
    stock_level: int = 0


class ProductRead(ProductCreate):
    sku: str
    category_name: Optional[str] = None


class ProductSaleCreate(BaseModel):
    channel: str
    date: date
    sku: str
    quantity: int


class ProductSaleRead(ProductSaleCreate):
    sale_id: int


class ProductFacets(BaseModel):
    sizes: List[str]
    colors: List[str]
