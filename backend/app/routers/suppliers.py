from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import models, schemas
from ..database import get_db
from .. import crud
from ..security import get_current_user
import io, csv

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("/", response_model=schemas.SupplierOut)
async def create_supplier(supplier: schemas.SupplierCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # enforce ownership from the authenticated token rather than trusting client-supplied user_id
    data = supplier.model_dump()
    data['user_id'] = current_user.id
    s_schema = schemas.SupplierCreate.model_validate(data)
    try:
        return await crud.create_supplier(db, s_schema)
    except ValueError as e:
        msg = str(e)
        if 'has products' in msg.lower():
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=400, detail=msg)


@router.get("/", response_model=List[schemas.SupplierOut])
async def list_suppliers(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await db.execute(select(models.Supplier).where(models.Supplier.user_id == current_user.id))
    return result.scalars().all()


@router.get("/{supplier_id}", response_model=schemas.SupplierOut)
async def get_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    s = await db.get(models.Supplier, supplier_id)
    if not s or s.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return s


@router.post("/upload")
async def upload_suppliers_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Upload a CSV file with supplier rows. Expected headers: name, email, phone, address"""
    
    try:
        raw = await file.read()
        stream = io.StringIO(raw.decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read/decode uploaded file as UTF-8")

    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV file must have a header row")

    results = []
    row_no = 1
    for row in reader:
        row_no += 1
        data = {k: (v if v != '' else None) for k, v in row.items()}
        data['user_id'] = current_user.id
        try:
            s_schema = schemas.SupplierCreate.model_validate(data)
        except Exception as e:
            results.append({"row": row_no, "ok": False, "error": f"Validation error: {e}"})
            continue
        try:
            created = await crud.create_supplier(db, s_schema)
            results.append({"row": row_no, "ok": True, "supplier_id": created.id, "user_id": created.user_id})
        except ValueError as e:
            results.append({"row": row_no, "ok": False, "error": str(e)})
        except Exception as e:
            results.append({"row": row_no, "ok": False, "error": f"Unexpected error: {e}"})

    return {"results": results}



@router.delete("/{supplier_id}")
async def delete_supplier(supplier_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        ok = await crud.delete_supplier(db, supplier_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not ok:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"ok": True}


@router.put("/{supplier_id}", response_model=schemas.SupplierOut)
async def update_supplier(supplier_id: int, updates: schemas.SupplierCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        s = await crud.update_supplier(db, supplier_id, updates, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return s
