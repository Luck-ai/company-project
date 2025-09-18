-- Seed data for product_categories, suppliers, and products
-- Assumes tables created according to app/models.py (SQLAlchemy models)
-- Tables: product_categories (id, name, description, user_id), suppliers (id, name, email, phone, address, user_id), products (id, name, sku, category_id, description, price, quantity, low_stock_threshold, supplier_id, user_id, last_updated)

-- NOTE: Adjust SERIAL/AUTOINCREMENT depending on your DB (Postgres uses SERIAL, SQLite uses INTEGER PRIMARY KEY AUTOINCREMENT)

-- Categories
INSERT INTO product_categories (id, name, description, user_id) VALUES
  (1, 'Beverages', 'Drinks, bottled and canned', 5),
  (2, 'Snacks', 'Chips, cookies, and snack bars', 5),
  (3, 'Dairy', 'Milk, cheese, yogurt', 5),
  (4, 'Household', 'Cleaning and household supplies', 5),
  (5, 'Produce', 'Fresh fruits and vegetables', 5),
  (6, 'Bakery', 'Bread and baked goods', 5);

-- Suppliers
INSERT INTO suppliers (id, name, email, phone, address, user_id) VALUES
  (1, 'Acme Beverages Co.', 'sales@acmebev.example', '+1-555-0101', '123 Beverage Lane, Cityville', 5),
  (2, 'SnackMasters Ltd.', 'orders@snackmasters.example', '+1-555-0202', '45 Crunch Ave, Snacktown', 5),
  (3, 'Dairy Delights', 'contact@dairydelights.example', '+1-555-0303', '77 Milk St, Cowburg', 5),
  (4, 'Home Essentials Inc.', 'support@homeessentials.example', '+1-555-0404', '9 Clean Way, Homemarket', 5),
  (5, 'Green Farms', 'info@greenfarms.example', '+1-555-0505', 'Farm Road 12, AgriCounty', 5);

-- Products
-- Use integer price in cents (matches Product.price:int); quantity/int; low_stock_threshold int
INSERT INTO products (id, name, sku, category_id, description, price, quantity, low_stock_threshold, supplier_id, user_id, last_updated) VALUES
  (1, 'Sparkling Water 500ml', 'BEV-0001', 1, 'Refreshing sparkling water', 120, 150, 20, 1, 5, CURRENT_TIMESTAMP),
  (2, 'Orange Juice 1L', 'BEV-0002', 1, '100% orange juice', 250, 30, 10, 1, 5, CURRENT_TIMESTAMP),
  (3, 'Potato Chips 150g', 'SNK-0001', 2, 'Crispy salted potato chips', 180, 8, 15, 2, 5, CURRENT_TIMESTAMP),
  (4, 'Chocolate Cookie Pack', 'SNK-0002', 2, 'Pack of 12 chocolate cookies', 220, 0, 10, 2, 5, CURRENT_TIMESTAMP),
  (5, 'Whole Milk 1L', 'DRY-0001', 3, 'Fresh whole milk', 130, 25, 10, 3, 5, CURRENT_TIMESTAMP),
  (6, 'Cheddar Cheese 200g', 'DRY-0002', 3, 'Aged cheddar cheese', 450, 5, 8, 3, 5, CURRENT_TIMESTAMP),
  (7, 'All-Purpose Cleaner 1L', 'HH-0001', 4, 'Multi-surface cleaner', 300, 60, 15, 4, 5, CURRENT_TIMESTAMP),
  (8, 'Banana (per kg)', 'PRD-0001', 5, 'Fresh bananas - per kg', 90, 0, 5, 5, 5, CURRENT_TIMESTAMP),
  (9, 'Sourdough Loaf', 'BKR-0001', 6, 'Artisan sourdough bread', 350, 12, 6, NULL, 5, CURRENT_TIMESTAMP),
  (10, 'Granola Bar', 'SNK-0003', 2, 'Oats and honey granola bar', 95, 45, 20, 2, 5, CURRENT_TIMESTAMP),
  (11, 'Sparkling Water 1.5L', 'BEV-0003', 1, 'Large sparkling water bottle', 200, 2, 10, 1, 5, CURRENT_TIMESTAMP),
  (12, 'Greek Yogurt 150g', 'DRY-0003', 3, 'Plain Greek yogurt', 110, 18, 12, 3, 5, CURRENT_TIMESTAMP),
  (13, 'Laundry Detergent 2L', 'HH-0002', 4, 'Liquid laundry detergent', 900, 3, 5, 4, 5, CURRENT_TIMESTAMP),
  (14, 'Apple (per kg)', 'PRD-0002', 5, 'Fresh red apples - per kg', 140, 80, 10, 5, 5, CURRENT_TIMESTAMP),
  (15, 'Butter 250g', 'DRY-0004', 3, 'Unsalted butter', 260, 0, 6, 3, 5, CURRENT_TIMESTAMP);

-- Useful queries
-- 1) Count products per category
SELECT pc.name AS category, COUNT(p.id) AS product_count
FROM product_categories pc
LEFT JOIN products p ON p.category_id = pc.id
GROUP BY pc.name
ORDER BY product_count DESC;

-- 2) List low stock products (quantity > 0 and quantity <= low_stock_threshold)
SELECT p.id, p.name, p.sku, p.quantity, p.low_stock_threshold, pc.name AS category
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
WHERE p.quantity > 0 AND p.quantity <= p.low_stock_threshold
ORDER BY (p.low_stock_threshold - p.quantity) ASC;

-- 3) List out-of-stock products (quantity = 0)
SELECT p.id, p.name, p.sku, p.quantity, pc.name AS category, s.name AS supplier
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.quantity = 0
ORDER BY p.name;

-- 4) Top suppliers by number of products
SELECT s.name AS supplier, COUNT(p.id) AS products_supplied
FROM suppliers s
LEFT JOIN products p ON p.supplier_id = s.id
GROUP BY s.name
ORDER BY products_supplied DESC;

-- 5) Replenish example: increase quantity and update last_updated
-- UPDATE products SET quantity = quantity + 50, last_updated = CURRENT_TIMESTAMP WHERE id = 3;

-- 6) Example delete (use with caution): remove a test product
-- DELETE FROM products WHERE id = 15;

-- End of seed file
