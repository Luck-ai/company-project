import asyncio
import os
import sys
from typing import Optional

import pandas as pd
from sqlalchemy import select

# make sure project root is on path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal, engine
from app.models import Category, Base


def read_excel(path: str):
    # Try reading with pandas and infer header names
    df = pd.read_excel(path, engine="openpyxl")
    # Normalize column names
    cols = {c: c.strip() for c in df.columns}
    df.rename(columns=cols, inplace=True)
    # Drop trailing export metadata rows (e.g. rows containing 'Exported by' or 'Date Time')
    # and drop rows that are entirely empty
    # First, remove rows that contain those footer markers anywhere
    mask_footer = df.apply(lambda r: r.astype(str).str.contains('Exported by|Date Time', case=False, na=False).any(), axis=1)
    if mask_footer.any():
        df = df.loc[~mask_footer]

    # Drop rows where all values are NaN or empty strings
    def row_all_empty(row):
        for v in row:
            if not (pd.isna(v) or (isinstance(v, str) and v.strip() == "")):
                return False
        return True

    df = df.loc[~df.apply(row_all_empty, axis=1)]
    return df


async def ensure_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def import_categories(path: str):
    df = read_excel(path)

    # find columns by containing keywords
    id_col = None
    name_col = None
    subcol = None
    for c in df.columns:
        if "#" in c or c.strip() == "#":
            id_col = c
        if "ชื่อหมวดหมู่" in c:
            if name_col is None:
                name_col = c
        if "ชื่อหมวดหมู่ย่อย" in c:
            subcol = c

    if id_col is None or name_col is None:
        raise ValueError("Could not detect required columns in Excel file")

    async with AsyncSessionLocal() as session:
        # insert entries, row by row; treat empty subcategory as null
        for _, row in df.iterrows():
            name = str(row[name_col]).strip() if not pd.isna(row[name_col]) else None
            sub_name = None
            if subcol and not pd.isna(row[subcol]):
                v = str(row[subcol]).strip()
                if v:
                    sub_name = v

            # skip empty names
            if not name:
                continue

            # check existing by exact (name, subcategory)
            stmt = select(Category).where(Category.name == name)
            result = await session.execute(stmt)
            existing = result.scalars().all()
            matched = None
            for e in existing:
                if e.subcategory == sub_name:
                    matched = e
                    break

            if matched:
                print(f"Skipping existing: {name} / {sub_name}")
                continue

            new_cat = Category(name=name, subcategory=sub_name)
            session.add(new_cat)
            await session.commit()
            await session.refresh(new_cat)
            print(f"Inserted: {new_cat.category_id} - {new_cat.name} / {new_cat.subcategory}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Import categories from Excel into DB")
    parser.add_argument("file", help="Path to Excel file (.xlsx)")
    args = parser.parse_args()

    # Reconstruct the file path from argv to tolerate unquoted paths or accidental leading/trailing spaces
    import sys

    if len(sys.argv) > 1:
        raw_path = " ".join(sys.argv[1:])
    else:
        raw_path = args.file

    # strip surrounding quotes and whitespace
    file_path = raw_path.strip().strip('"').strip("'")

    async def _run_all():
        await ensure_tables()
        await import_categories(file_path)

    asyncio.run(_run_all())


if __name__ == "__main__":
    main()
