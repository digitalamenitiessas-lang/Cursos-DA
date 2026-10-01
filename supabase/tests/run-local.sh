#!/usr/bin/env bash
set -euo pipefail

# Requires PostgreSQL 17+ tools on PATH. No TCP listener or cloud credentials.
project_dir="$(cd "$(dirname "$0")/../.." && pwd)"
test_cluster="$(mktemp -d /tmp/orbita-pg.XXXXXX)"
test_log="$test_cluster/test.log"
cleanup() {
  pg_ctl -D "$test_cluster/data" -m fast -w stop >/dev/null 2>&1 || true
  rm -rf "$test_cluster"
}
trap cleanup EXIT
initdb -D "$test_cluster/data" --auth=trust --no-locale -E UTF8 >"$test_log" 2>&1
pg_ctl -D "$test_cluster/data" -l "$test_cluster/postgres.log" -o "-k $test_cluster -p 55439 -c listen_addresses=''" -w start >>"$test_log" 2>&1
for source_file in \
  "$project_dir/supabase/tests/local-bootstrap.sql" \
  "$project_dir/supabase/migrations/202609290001_academy.sql" \
  "$project_dir/supabase/migrations/202609290002_transactions.sql" \
  "$project_dir/supabase/migrations/202609290003_progress.sql" \
  "$project_dir/supabase/tests/security.sql"; do
  if ! psql -h "$test_cluster" -p 55439 -d postgres -v ON_ERROR_STOP=1 -f "$source_file" >>"$test_log" 2>&1; then
    cat "$test_log"
    exit 1
  fi
done
assertions="$(awk '/NOTICE:  PASS:/ { n++ } END { print n+0 }' "$test_log")"
printf 'PostgreSQL: all migrations applied; %s security assertions passed; fixtures rolled back.\n' "$assertions"
printf 'Auth and Storage interfaces were local SQL stubs; hosted services were not tested.\n'
