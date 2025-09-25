from fastapi.testclient import TestClient
from backend.app.main import app


client = TestClient(app)


def test_create_category_product_sale():
    # create category
    r = client.post("/categories/", json={"name": "Beverages", "subcategory": "Soda"})
    assert r.status_code == 200
    cat = r.json()
    assert cat["name"] == "Beverages"

    # create product
    payload = {"sku": "COKE001", "name": "Coke Can", "category_id": cat["category_id"], "stock_level": 100}
    r = client.post("/products/", json=payload)
    assert r.status_code == 200
    prod = r.json()
    assert prod["sku"] == "COKE001"

    # create sale
    sale = {"channel": "online", "date": "2025-09-25", "sku": "COKE001", "quantity": 2}
    r = client.post("/sales/", json=sale)
    assert r.status_code == 200
    s = r.json()
    assert s["sku"] == "COKE001"
