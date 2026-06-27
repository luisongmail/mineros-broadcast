#!/usr/bin/env python3
"""lint-migrations — Valida compatibilidad MySQL 8.0 puro en archivos .sql"""
import sys, re
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).parent / "migrations"
errors = 0

MARIADB_PATTERNS = [
    (re.compile(r'\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b', re.IGNORECASE), "ADD COLUMN IF NOT EXISTS (MariaDB only)"),
    (re.compile(r'\bADD\s+CONSTRAINT\s+IF\s+NOT\s+EXISTS\b', re.IGNORECASE), "ADD CONSTRAINT IF NOT EXISTS (MariaDB only)"),
    (re.compile(r'\bDROP\s+COLUMN\s+IF\s+EXISTS\b', re.IGNORECASE), "DROP COLUMN IF EXISTS (MariaDB only)"),
    (re.compile(r'\bDROP\s+INDEX\s+IF\s+EXISTS\b', re.IGNORECASE), "DROP INDEX IF EXISTS (MariaDB only)"),
]
MIXED_DML = re.compile(r',\s*\n\s*(UPDATE|DELETE)\s', re.IGNORECASE)

for f in sorted(MIGRATIONS_DIR.glob("*.sql")):
    text = f.read_text()
    file_errors = []

    for i, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith('--'):  # skip comment lines
            continue
        for pattern, msg in MARIADB_PATTERNS:
            if pattern.search(line):
                file_errors.append(f"  line {i}: {msg}")

    if MIXED_DML.search(text):
        file_errors.append("  UPDATE/DELETE mezclado dentro de bloque VALUES")

    if file_errors:
        print(f"❌ {f.name}:")
        for e in file_errors:
            print(e)
        errors += len(file_errors)

if errors:
    print(f"\n💥 {errors} error(s). Fix before committing.")
    sys.exit(1)
print("✅ All migrations passed MySQL 8.0 lint.")
