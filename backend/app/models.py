from datetime import date
from typing import Optional
from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


class Category(Base):
    __tablename__ = "category"
    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "product"
    sku = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("category.category_id"), nullable=True)
    stock_level = Column(Integer, default=0)
    size = Column(String, nullable=True)
    prefix = Column(String, nullable=True)
    design_code = Column(String, nullable=True)
    pattern = Column(String, nullable=True)
    color = Column(String, nullable=True)
    # note: human-readable mapping/name columns removed; mapping tables live separately in the DB
    category = relationship("Category", back_populates="products")
    sales = relationship("ProductSale", back_populates="product", cascade="all, delete-orphan")


class ProductSale(Base):
    __tablename__ = "product_sale"
    sale_id = Column(Integer, primary_key=True, index=True)
    channel = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    sku = Column(String, ForeignKey("product.sku"), nullable=False)
    quantity = Column(Integer, nullable=False)
    product = relationship("Product", back_populates="sales")
