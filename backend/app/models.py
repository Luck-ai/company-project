from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class Supplier(Base):
    __tablename__ = 'suppliers'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    address = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)

    user = relationship('User', backref='suppliers')


class Product(Base):
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    sku = Column(String(64), unique=True, index=True, nullable=True)
    category_id = Column(Integer, ForeignKey('product_categories.id'), nullable=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False, default=0)
    quantity = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=False, default=0)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    supplier = relationship('Supplier', backref='products')
    category = relationship('ProductCategory', backref='products')
    user = relationship('User', backref='products')


class ProductCategory(Base):
    __tablename__ = 'product_categories'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)

    user = relationship('User', backref='product_categories')


class ProductSale(Base):
    __tablename__ = 'product_sales'

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    quantity = Column(Integer, nullable=False)
    sale_price = Column(Numeric(12, 2), nullable=False)
    sale_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # ORM relationships
    product = relationship('Product', backref='sales')
    user = relationship('User', backref='product_sales')


class StockMovement(Base):
    __tablename__ = 'stock_movements'

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    movement_type = Column(String(50), nullable=False)  # 'sale', 'restock', 'adjustment', 'initial'
    quantity_change = Column(Integer, nullable=False)  # positive for additions, negative for subtractions
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    reference_id = Column(Integer, nullable=True)  # FK to sale_id, purchase_order_id, etc.
    reference_type = Column(String(50), nullable=True)  # 'sale', 'purchase_order', 'manual_adjustment'
    notes = Column(Text, nullable=True)
    transaction_date = Column(DateTime(timezone=True), nullable=True)  # Actual date of the transaction (sale date, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ORM relationships
    product = relationship('Product', backref='stock_movements')
    user = relationship('User', backref='stock_movements')


class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False, index=True)
    quantity_ordered = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default='pending')  # pending, completed, cancelled
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    
    # ORM relationships
    user = relationship('User', backref='purchase_orders')
    supplier = relationship('Supplier', backref='purchase_orders')
    product = relationship('Product', backref='purchase_orders')


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Email verification
    is_verified = Column(Boolean, nullable=False, default=False)
    verification_token = Column(String(255), nullable=True, index=True)
    verification_sent_at = Column(DateTime(timezone=True), nullable=True)



