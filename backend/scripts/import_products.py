import asyncio
import os
import sys
from typing import Optional

import pandas as pd
from sqlalchemy import select, text

# ensure project root is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal, engine
from app.models import Category, Product, Base

import re

# Allowed size tokens (normalized form)
ALLOWED_SIZES = {"XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "F", "FF"}


def normalize_size(raw: Optional[str]) -> Optional[str]:
    """Normalize a raw size string and return a canonical token if allowed.

    Rules:
    - Trim and uppercase.
    - Replace common separators/spaces.
    - Map common synonyms (e.g. "XXL" and "2XL").
    - If the result contains only digits (e.g., "42") or looks like a numeric range, return None.
    - Only return values in ALLOWED_SIZES.
    """
    if not raw:
        return None
    s = str(raw).strip().upper()
    if not s:
        return None
    # Take first part if slash or comma separated
    if '/' in s:
        s = s.split('/')[0].strip()
    if ',' in s:
        s = s.split(',')[0].strip()
    # Remove whitespace
    s = s.replace(' ', '')
    # Common normalization: allow both XXL and 2XL -> normalize to XXL and include 2XL as allowed
    # Convert forms like '2XL' -> '2XL' (kept), 'XXL' -> 'XXL'
    # If string is purely numeric or looks like a numeric-range, ignore
    if re.fullmatch(r"\d+(?:[-–]\d+)?", s):
        return None
    # Standardize some common variants
    # Map 'XXL' and synonyms: keep as-is
    if s in ALLOWED_SIZES:
        return s
    # Try to map repeated X forms like 'XXXXL' to nearest known token (simple heuristic)
    if s.endswith('XL') and s.count('X') >= 2:
        # e.g. 'XXXL' or 'XXXXL' -> '3XL' if 3 Xs, else cap to '3XL'
        xcount = s.count('X')
        if xcount == 3:
            return '3XL' if '3XL' in ALLOWED_SIZES else None
        if xcount == 2:
            return 'XXL' if 'XXL' in ALLOWED_SIZES else None
    # Map one-size tokens
    if s in ('ONE', 'ONESIZE', 'OS'):
        return 'F' if 'F' in ALLOWED_SIZES else None
    # Accept forms like '2X' or '2XL' normalize to '2XL'
    m = re.match(r'^(2|3)[Xx](?:L)?$', s)
    if m:
        tok = (m.group(1) + 'XL').upper()
        if tok in ALLOWED_SIZES:
            return tok
    return None


def normalize_color(raw: Optional[str]) -> Optional[str]:
    """Return a cleaned color string or None.

    Rules:
    - Trim; if value is numeric-only (e.g., '01', '123') return None.
    - If contains letters, return trimmed string (preserve original case except surrounding whitespace).
    - If comma-separated, take first token.
    """
    if not raw:
        return None
    s = str(raw).strip()
    if not s:
        return None
    # If comma-separated, take first non-empty
    if ',' in s:
        parts = [p.strip() for p in s.split(',') if p.strip()]
        s = parts[0] if parts else s
    if '/' in s:
        s = s.split('/')[0].strip()
    # If contains any letter, accept. If only digits or punctuation, reject.
    if re.search(r'[A-Za-zก-ฮ]', s):
        return s
    # If it's something like '01' or '123' reject
    if re.fullmatch(r'[\d\W_]+', s):
        return None
    # If contains digits but also letters, accept (e.g., 'Red1')
    if re.search(r'\d', s) and not re.search(r'[A-Za-zก-ฮ]', s):
        return None
    return s


def read_excel(path: str):
    # Header is on second row (index 1)
    df = pd.read_excel(path, engine="openpyxl", header=1)
    # Normalize column names
    cols = {c: c.strip() for c in df.columns}
    df.rename(columns=cols, inplace=True)
    # Drop footer metadata and empty rows
    mask_footer = df.apply(lambda r: r.astype(str).str.contains('Exported by|Date Time', case=False, na=False).any(), axis=1)
    if mask_footer.any():
        df = df.loc[~mask_footer]

    def row_all_empty(row):
        for v in row:
            if not (pd.isna(v) or (isinstance(v, str) and v.strip() == "")):
                return False
        return True

    df = df.loc[~df.apply(row_all_empty, axis=1)]
    return df


async def import_products(path: str, dry_run: bool = False):
    df = read_excel(path)

    # no mappings are loaded; importer will not populate human-readable name columns

    # detect columns
    sku_col = None
    name_col = None
    cat_col = None
    subcol = None
    qty_col = None
    for c in df.columns:
        lc = c.strip()
        if "รหัสสินค้า" in lc or "รหัส" in lc:
            sku_col = c
        if "ชื่อสินค้า" in lc:
            name_col = c
        if "หมวดหมู่ย่อย" in lc:
            subcol = c
        if "หมวดหมู่" in lc and "หมวดหมู่ย่อย" not in lc:
            cat_col = c
        if "จำนวน" in lc:
            qty_col = c

    if not all([sku_col, name_col, cat_col, qty_col]):
        raise ValueError("Could not detect required columns in product Excel file")

    async with AsyncSessionLocal() as session:
        for _, row in df.iterrows():
            sku = str(row[sku_col]).strip() if not pd.isna(row[sku_col]) else None
            if not sku:
                continue
            prod_name = str(row[name_col]).strip() if not pd.isna(row[name_col]) else None

            raw_cat = str(row[cat_col]).strip() if not pd.isna(row[cat_col]) else ""
            sub_name = None
            if subcol and not pd.isna(row[subcol]):
                s = str(row[subcol]).strip()
                if s:
                    sub_name = s

            # Special-case: some category fields contain combined 'แถม คริสต์มาส' => main 'แถม', sub 'คริสต์มาส'
            if raw_cat.startswith("แถม") and (not sub_name):
                parts = raw_cat.split()
                if len(parts) > 1:
                    main_cat = parts[0]
                    sub_name = " ".join(parts[1:])
                else:
                    main_cat = raw_cat
            else:
                main_cat = raw_cat

            # parse qty as int from float
            qty = 0
            if not pd.isna(row[qty_col]):
                try:
                    qty = int(float(row[qty_col]))
                except Exception:
                    qty = 0

            # parse SKU from the back so we don't accidentally assign color into pattern
            def extract_size(sku_str: str) -> Optional[str]:
                if not sku_str:
                    return None
                parts = sku_str.split("-")
                last = parts[-1].strip()
                # size is the last dash-separated segment (do not split on '/')
                if last == "":
                    return None
                return last

            size_val = extract_size(sku)
            size_val = normalize_size(size_val)
            sku_parts = [p.strip() for p in sku.split("-") if p.strip() != ""]
            prefix_val = sku_parts[0] if len(sku_parts) > 0 else None
            design_val = sku_parts[1] if len(sku_parts) > 1 else None

            # work from the back: base_parts are everything except the size segment
            base_parts = sku_parts[:-1] if len(sku_parts) >= 2 else sku_parts
            pattern_val = None
            color_val = None

            if base_parts:
                last_base = base_parts[-1]
                # do NOT split last_base on '/'; treat it as the full color code
                if last_base != size_val:
                    color_val = last_base
            # normalize color (ignore numeric-only color codes)
            color_val = normalize_color(color_val)

            # Try to detect an explicit pattern that sits before the color (if present)
            if len(base_parts) >= 3:
                candidate = base_parts[-2]
                # avoid treating numeric design codes as pattern (e.g. '0049')
                if candidate and not candidate.isdigit():
                    pattern_val = pattern_val or candidate

            # guard: if pattern was inferred but equals the color, drop it
            if pattern_val and color_val and pattern_val == color_val:
                pattern_val = None
            # also avoid color equal to size
            if color_val and size_val and color_val == size_val:
                color_val = None


            # find or create category
            stmt = select(Category).where(Category.name == main_cat)
            res = await session.execute(stmt)
            candidates = res.scalars().all()
            cat_obj = None
            for c in candidates:
                if c.subcategory == sub_name:
                    cat_obj = c
                    break

            if cat_obj is None:
                # try match with null subcategory
                for c in candidates:
                    if c.subcategory is None:
                        cat_obj = c
                        break

            if cat_obj is None:
                if dry_run:
                    print(f"Would create category: {main_cat} / {sub_name}")
                    # create a lightweight stub to use for messaging (no category_id)
                    class _Stub:
                        def __init__(self, name, sub):
                            self.category_id = None
                            self.name = name
                            self.subcategory = sub

                    cat_obj = _Stub(main_cat, sub_name)
                else:
                    # create new category entry
                    cat_obj = Category(name=main_cat, subcategory=sub_name)
                    session.add(cat_obj)
                    await session.commit()
                    await session.refresh(cat_obj)
                    print(f"Created category: {cat_obj.category_id} - {cat_obj.name} / {cat_obj.subcategory}")

            # upsert product
            prod = await session.get(Product, sku)
            if prod:
                if dry_run:
                    print(f"Would update product: {prod.sku} -> category {cat_obj.name} / {cat_obj.subcategory}, stock {qty}, size {size_val}")
                else:
                    prod.name = prod_name or prod.name
                    prod.category_id = cat_obj.category_id
                    prod.stock_level = qty
                    prod.size = size_val
                    # update parsed sku parts as well
                    prod.prefix = prefix_val or prod.prefix
                    prod.design_code = design_val or prod.design_code
                    # only update pattern if it is present and distinct from color
                    if pattern_val and pattern_val != (color_val or prod.pattern):
                        prod.pattern = pattern_val
                    prod.color = color_val or prod.color
                    session.add(prod)
                    await session.commit()
                    await session.refresh(prod)
                    print(f"Updated product: {prod.sku} -> category {prod.category_id}, stock {prod.stock_level}, size {prod.size}, prefix {prod.prefix}, design {prod.design_code}, pattern {prod.pattern}, color {prod.color}")
            else:
                if dry_run:
                    print(f"Would insert product: {sku} -> category {cat_obj.name} / {cat_obj.subcategory}, stock {qty}, size {size_val}")
                else:
                    # avoid storing pattern equal to color
                    if pattern_val and color_val and pattern_val == color_val:
                        store_pattern = None
                    else:
                        store_pattern = pattern_val
                    prod = Product(sku=sku, name=prod_name or "", category_id=cat_obj.category_id, stock_level=qty, size=size_val, prefix=prefix_val, design_code=design_val, pattern=store_pattern, color=color_val)
                    # no mapping/population of prefix_name/pattern_name/color_name per user request
                    session.add(prod)
                    await session.commit()
                    await session.refresh(prod)
                    print(f"Inserted product: {prod.sku} -> category {prod.category_id}, stock {prod.stock_level}, size {prod.size}, prefix {prod.prefix}, design {prod.design_code}, pattern {prod.pattern}, color {prod.color}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Import products from Excel into DB (header on second row)")
    parser.add_argument("file", help="Path to Excel file (.xlsx)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without writing to the database")
    args = parser.parse_args()

    # reconstruct path robustly: prefer argparse value if it points to an existing file
    file_path = args.file
    if not os.path.exists(file_path):
        # join argv parts until the first option (starts with '-') to support unquoted paths
        raw_args = sys.argv[1:]
        end_idx = len(raw_args)
        for i, a in enumerate(raw_args):
            if isinstance(a, str) and a.startswith("-"):
                end_idx = i
                break
        raw_path = " ".join(raw_args[:end_idx])
        file_path = raw_path.strip().strip('"').strip("'")

    async def _run():
        await import_products(file_path, dry_run=args.dry_run)

    asyncio.run(_run())


if __name__ == "__main__":
    main()
