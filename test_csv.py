!/usr/bin/env python3
"""Test script to validate CSV format"""

import csv
import io
from datetime import datetime

# Your sample CSV content
csv_content = """quantity,sale_date
4,2024-01-12
2,2024-01-22
6,2024-02-08
3,2024-02-18
5,2024-03-05
1,2024-03-15
7,2024-04-02
4,2024-04-12
2,2024-05-06
8,2024-05-16"""

def test_csv_parsing():
    print("Testing CSV parsing...")
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    
    print(f"Fieldnames: {csv_reader.fieldnames}")
    
    for row_num, row in enumerate(csv_reader, start=2):
        print(f"Row {row_num}: {row}")
        
        # Test quantity parsing
        try:
            quantity = int(row['quantity'])
            print(f"  Quantity: {quantity} ✓")
        except (ValueError, KeyError) as e:
            print(f"  Quantity error: {e} ✗")
            continue
            
        # Test date parsing
        try:
            sale_date = datetime.strptime(row['sale_date'], '%Y-%m-%d')
            print(f"  Date: {sale_date} ✓")
        except (ValueError, KeyError) as e:
            print(f"  Date error: {e} ✗")
            continue
            
        print(f"  Row {row_num} parsed successfully ✓")
    
    print("CSV parsing test completed!")

if __name__ == "__main__":
    test_csv_parsing()