#!/usr/bin/env bash
# Applies every migration to a plain Postgres (with a small stand-in for Supabase) and runs the tests.
# Usage: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bash ./scripts/test-db.sh
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a throwaway Postgres}"
cd "$(dirname "$0")/.."
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do echo "migration $f"; psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
out=$(psql "$DATABASE_URL" -tA -v ON_ERROR_STOP=1 -f supabase/tests/10_portal.sql)
echo "$out"
echo "$out" | grep -q "ALL PORTAL DATABASE TESTS PASSED"
