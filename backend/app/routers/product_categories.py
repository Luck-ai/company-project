from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from .. import models, schemas, crud
from ..database import get_db
from sqlalchemy import select
from ..security import get_current_user
import io, csv

router = APIRouter(prefix="/categories", tags=["categories"])


@router.delete("/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        ok = await crud.delete_category(db, category_id, current_user.id)
    except ValueError as e:
        msg = str(e)
        if 'has products' in msg.lower():
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
    if not ok:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@router.put("/{category_id}", response_model=schemas.ProductCategoryOut)
async def update_category(category_id: int, updates: schemas.ProductCategoryCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        c = await crud.update_category(db, category_id, updates, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    return c


@router.post("/", response_model=schemas.ProductCategoryOut)
async def create_category(cat: schemas.ProductCategoryCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # enforce ownership from the authenticated token rather than trusting client-supplied user_id
    data = cat.model_dump()
    data['user_id'] = current_user.id
    c_schema = schemas.ProductCategoryCreate.model_validate(data)
    try:
        return await crud.create_category(db, c_schema)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[schemas.ProductCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await db.execute(select(models.ProductCategory).where(models.ProductCategory.user_id == current_user.id))
    return result.scalars().all()

@router.post("/upload")
async def upload_categories_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Upload a CSV file with category rows. Expected headers: name, description"""


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
            c_schema = schemas.ProductCategoryCreate.model_validate(data)
        except Exception as e:
            results.append({"row": row_no, "ok": False, "error": f"Validation error: {e}"})
            continue
        try:
            created = await crud.create_category(db, c_schema)
            results.append({"row": row_no, "ok": True, "category_id": created.id, "user_id": created.user_id})
        except ValueError as e:
            results.append({"row": row_no, "ok": False, "error": str(e)})
        except Exception as e:
            results.append({"row": row_no, "ok": False, "error": f"Unexpected error: {e}"})

    return {"results": results}
