import asyncio
import os
import sys
from datetime import datetime
from typing import Optional

import pandas as pd
from sqlalchemy import select

# make project root importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import AsyncSessionLocal
from app.models import ProductSale, Product


def read_excel(path: str) -> pd.DataFrame:
    # Header is on second row in the exports this project uses
    df = pd.read_excel(path, engine="openpyxl", header=1)
    # strip column names
    cols = {c: c.strip() for c in df.columns}
    df.rename(columns=cols, inplace=True)

    # drop footer rows that contain export metadata
    mask_footer = df.apply(lambda r: r.astype(str).str.contains('Exported by|Date Time', case=False, na=False).any(), axis=1)
    if mask_footer.any():
        df = df.loc[~mask_footer]

    # drop fully empty rows
    def row_all_empty(row):
        for v in row:
            if not (pd.isna(v) or (isinstance(v, str) and v.strip() == "")):
                return False
        return True

    df = df.loc[~df.apply(row_all_empty, axis=1)]
    return df


def detect_columns(df: pd.DataFrame):
    # Map expected Thai column fragments to columns found in the sheet
    col_map = {
        "date": None,
        "sku": None,
        "quantity": None,
        "channel": None,
    }

    for c in df.columns:
        lc = c.strip()
        # วันที่ทำรายการ -> date
        if "วันที่" in lc or "วันที่ทำรายการ" in lc:
            col_map["date"] = c
        # รหัสสินค้า -> sku
        if "รหัส" in lc and "สินค้า" in lc:
            col_map["sku"] = c
        # จำนวน -> quantity
        if "จำนวน" in lc:
            col_map["quantity"] = c
        # ช่องทางการขาย -> channel
        if "ช่องทาง" in lc or "ช่องทางการขาย" in lc:
            col_map["channel"] = c

    return col_map


def normalize_channel(raw: Optional[str]) -> str:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return "unknown"
    s = str(raw).strip()
    if s == "":
        return "unknown"
    # Examples of raw values: "TIKTOK - PAJARA OFFICIAL", "Facebook PAJARA", "Shopee"
    # Strategy: split on common separators, remove tokens like 'PAJARA' and 'OFFICIAL', then
    # return the remaining channel name (preserve case except trim).
    # split on hyphen first, otherwise split on slash or multiple spaces
    parts = [p.strip() for p in s.replace("/", " - ").split("-") if p.strip()]
    # take the first non-empty part as the candidate (this often contains the actual channel)
    candidate = parts[0] if parts else s
    # remove tokens 'PAJARA' and 'OFFICIAL' from candidate or trailing tokens
    tokens = [t.strip() for t in candidate.split() if t.strip()]
    filtered = [t for t in tokens if t.upper() not in ("PAJARA", "OFFICIAL")]
    if filtered:
        return " ".join(filtered)
    # if nothing left after filtering, fallback to 'unknown'
    return "unknown"


def parse_date(raw) -> Optional[datetime.date]:
    if pd.isna(raw):
        return None
    if isinstance(raw, datetime):
        return raw.date()
    # pandas may parse dates as Timestamp
    try:
        parsed = pd.to_datetime(raw, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.date()
    except Exception:
        return None


async def import_sales(path: str, dry_run: bool = False, create_missing: bool = False):
    df = read_excel(path)
    cols = detect_columns(df)

    if not cols["sku"] or not cols["quantity"] or not cols["date"]:
        raise ValueError("Could not detect required columns (sku, quantity, date) in sales Excel file")

    print(f"Starting sales import: {len(df)} rows, dry_run={dry_run}, create_missing={create_missing}")
    
    processed = 0
    skipped = 0
    created_products = 0
    matched_skus = 0
    errors = 0

    async with AsyncSessionLocal() as session:
        for _, row in df.iterrows():
            sku = None
            if not pd.isna(row[cols["sku"]]):
                sku = str(row[cols["sku"]]).strip()
            if not sku or sku == "nan":
                # skip rows without sku
                skipped += 1
                continue

            qty = 0
            if not pd.isna(row[cols["quantity"]]):
                try:
                    qty = int(float(row[cols["quantity"]]))
                except Exception:
                    qty = 0

            chan = normalize_channel(row[cols["channel"]]) if cols.get("channel") else "unknown"
            date_val = parse_date(row[cols["date"]])
            if date_val is None:
                # if date missing, skip the row
                skipped += 1
                continue

            # ensure product exists
            prod = await session.get(Product, sku)
            original_sku = sku  # Keep track of the original SKU from sales data
            
            # Enhanced fallback matching for SKUs with suffixes
            if prod is None:
                print(f"Product not found for exact SKU: {sku}, attempting fallback matching...")
                try:
                    # Try multiple matching strategies:
                    
                    # Strategy 1: Find products whose SKU starts with the sales SKU
                    # (e.g., 'SC-0020-SS-PI-FF' matches 'SC-0020-SS-PI-FF\CL')
                    stmt = select(Product).where(Product.sku.like(f"{sku}%"))
                    res = await session.execute(stmt)
                    candidates = res.scalars().all()
                    
                    if candidates:
                        print(f"Found {len(candidates)} candidates using prefix match: {[p.sku for p in candidates]}")
                        
                        if len(candidates) == 1:
                            prod = candidates[0]
                            sku = prod.sku  # Use the actual SKU for the sale record
                            matched_skus += 1
                            print(f"Matched '{original_sku}' to '{sku}'")
                        else:
                            # Multiple candidates: prefer exact prefix matches with common suffixes
                            # Priority: \CL > /CL > -CL > others, then by shortest length
                            priority_suffixes = [r'\CL', '/CL', '-CL']
                            best_candidate = None
                            
                            for suffix in priority_suffixes:
                                exact_match = next((p for p in candidates if p.sku == f"{original_sku}{suffix}"), None)
                                if exact_match:
                                    best_candidate = exact_match
                                    break
                            
                            if not best_candidate:
                                # No priority suffix match, choose shortest SKU (likely most basic variant)
                                candidates.sort(key=lambda p: len(p.sku))
                                best_candidate = candidates[0]
                            
                            prod = best_candidate
                            sku = prod.sku  # Use the actual SKU for the sale record
                            matched_skus += 1
                            print(f"Multiple matches found, selected '{sku}' for '{original_sku}'")
                    
                    # Strategy 2: If no prefix matches, try finding products where sales SKU is a prefix
                    # (e.g., handle cases where sales has 'ABC-123-XL' but DB has 'ABC-123')
                    if prod is None:
                        stmt = select(Product).where(Product.sku.like(f"%{sku.split('-')[0]}%"))
                        res = await session.execute(stmt)
                        broad_candidates = res.scalars().all()
                        
                        # Filter to those that could be matches (same base pattern)
                        potential_matches = []
                        sku_parts = sku.split('-')
                        for candidate in broad_candidates:
                            candidate_parts = candidate.sku.replace('\\', '-').replace('/', '-').split('-')
                            # Check if major parts match (allowing for extra suffixes)
                            if len(candidate_parts) >= len(sku_parts):
                                match = True
                                for i, part in enumerate(sku_parts):
                                    if i < len(candidate_parts) and candidate_parts[i] != part:
                                        match = False
                                        break
                                if match:
                                    potential_matches.append(candidate)
                        
                        if potential_matches:
                            print(f"Found {len(potential_matches)} potential matches: {[p.sku for p in potential_matches]}")
                            potential_matches.sort(key=lambda p: len(p.sku))
                            prod = potential_matches[0]
                            sku = prod.sku
                            matched_skus += 1
                            print(f"Broad match: '{original_sku}' to '{sku}'")
                        
                except Exception as e:
                    print(f"Error during fallback matching: {e}")
                    prod = None

            if prod is None:
                # If product not found, check if we should create it or skip
                if create_missing:
                    if dry_run:
                        # report what would be created/inserted in dry-run mode
                        print(f"Would create product SKU={sku} (minimal) and insert sale: sku={sku}, date={date_val}, qty={qty}, channel={chan}")
                        continue
                    else:
                        # Create minimal product record so sales can be linked
                        prod = Product(sku=sku, name=f"Auto-created for {sku}", stock_level=0)
                        session.add(prod)
                        await session.flush()  # Ensure it's available for the sale insert
                        created_products += 1
                        print(f"Created missing product: {sku}")
                else:
                    # Product not found and create_missing=False, skip this sale
                    error_msg = f"Product not found for SKU: {sku}. Use create_missing=True to auto-create missing products."
                    print(f"SKIPPING SALE: {error_msg}")
                    skipped += 1
                    if not dry_run:
                        # In real mode, we might want to collect these errors for reporting
                        pass
                    continue

            if dry_run:
                action_msg = f"Would insert sale: sku={sku}"
                if sku != original_sku:
                    action_msg += f" (matched from {original_sku})"
                action_msg += f", date={date_val}, qty={qty}, channel={chan}"
                print(action_msg)
                processed += 1
            else:
                try:
                    sale = ProductSale(channel=chan, date=date_val, sku=sku, quantity=qty)
                    session.add(sale)
                    await session.commit()
                    processed += 1
                    success_msg = f"Inserted sale sku={sku}"
                    if sku != original_sku:
                        success_msg += f" (matched from {original_sku})"
                    success_msg += f" date={date_val} qty={qty} channel={chan}"
                    print(success_msg)
                except Exception as e:
                    await session.rollback()
                    error_msg = f"Failed to insert sale for SKU {sku}: {str(e)}"
                    print(f"ERROR: {error_msg}")
                    errors += 1
                    # Continue with next row instead of failing completely
                    continue

    # Print summary
    print(f"Import complete. Processed: {processed}, Skipped: {skipped}, Created products: {created_products}, Matched SKUs: {matched_skus}, Errors: {errors}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Import sales from Excel into DB (header on second row)")
    parser.add_argument("file", help="Path to Excel file (.xlsx)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without writing to the database")
    parser.add_argument("--create-missing", action="store_true", help="Create minimal Product records when SKU not found")
    args = parser.parse_args()

    file_path = args.file
    if not os.path.exists(file_path):
        raw_args = sys.argv[1:]
        end_idx = len(raw_args)
        for i, a in enumerate(raw_args):
            if isinstance(a, str) and a.startswith("-"):
                end_idx = i
                break
        raw_path = " ".join(raw_args[:end_idx])
        file_path = raw_path.strip().strip('"').strip("'")

    async def _run():
        await import_sales(file_path, dry_run=args.dry_run, create_missing=args.create_missing)

    asyncio.run(_run())


if __name__ == "__main__":
    main()
