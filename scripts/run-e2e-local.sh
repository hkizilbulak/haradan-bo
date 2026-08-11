#!/usr/bin/env bash
set -euo pipefail

bo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
be_root="$(cd "$bo_root/../haradan-be" && pwd)"
required_db='postgres://localhost:5432/haradan_test?sslmode=disable'

if [[ "${TEST_DATABASE_URL:-}" != "$required_db" ]]; then
  echo 'TEST_DATABASE_URL must target the dedicated localhost haradan_test database.' >&2
  exit 1
fi

runtime_dir="$(mktemp -d /private/tmp/haradan-e2e.XXXXXX)"
worker_marker="$runtime_dir/start-worker"
pids=()

cleanup() {
  local exit_code=$?
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  if [[ $exit_code -ne 0 ]]; then
    for log_file in "$runtime_dir"/*.log; do
      [[ -f "$log_file" ]] || continue
      echo "--- $(basename "$log_file") (tail) ---" >&2
      tail -80 "$log_file" >&2
    done
  fi
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

export DATABASE_URL="$required_db"
export APP_ENV=development
export AUTH_JWT_SECRET="$(openssl rand -hex 32)"
export EMAIL_PROVIDER=unconfigured
export STORAGE_PROVIDER=unconfigured
export IMAGE_PROCESSOR_PROVIDER=unconfigured
export TJK_ENABLED=true
export TJK_BASE_URL='http://127.0.0.1:18081'
export TJK_HTTP_TIMEOUT=5s
export WORKER_POLL_INTERVAL=200ms
export WORKER_LEASE_DURATION=2h5m
export E2E_RUN_ID="$(date +%s)-$$"
export E2E_ADMIN_EMAIL="haradan-e2e-admin-${E2E_RUN_ID}@example.test"
export E2E_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
export E2E_CREATED_ADMIN_EMAIL="haradan-e2e-created-${E2E_RUN_ID}@example.test"
export E2E_CATEGORY_A="E2E Kategori A ${E2E_RUN_ID}"
export E2E_CATEGORY_B="E2E Kategori B ${E2E_RUN_ID}"
export E2E_PACKAGE_A="E2E Paket A ${E2E_RUN_ID}"
export E2E_PACKAGE_B="E2E Paket B ${E2E_RUN_ID}"
export E2E_CAMPAIGN="E2E Kampanya ${E2E_RUN_ID}"
export E2E_BANNER_TITLE="E2E Banner ${E2E_RUN_ID}"
export E2E_BANNER_ASSET_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
export E2E_BANNER_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
export E2E_WORKER_START_FILE="$worker_marker"

wait_for_url() {
  local url=$1
  local attempts=100
  for ((i=1; i<=attempts; i++)); do
    if curl --silent --fail --max-time 1 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  echo "Local service did not become ready: $url" >&2
  return 1
}

(cd "$be_root" && go run ./cmd/migrate up) >"$runtime_dir/migrate.log" 2>&1

active_tjk="$(psql "$required_db" -Atc "select count(*) from hrd_tjk_sync_runs where status in ('QUEUED','RUNNING')")"
if [[ "$active_tjk" != '0' ]]; then
  echo 'haradan_test contains an active TJK run; cancel it before acceptance.' >&2
  exit 1
fi

(cd "$bo_root" && node e2e/fake-tjk-server.mjs) >"$runtime_dir/fake-tjk.log" 2>&1 &
pids+=("$!")
wait_for_url 'http://127.0.0.1:18081/TR/YarisSever/Query/DataRows/Atlar?PageNumber=1'

(cd "$be_root" && HTTP_ADDR=:8080 go run ./cmd/api) >"$runtime_dir/backend.log" 2>&1 &
pids+=("$!")
wait_for_url 'http://127.0.0.1:8080/api/health'

node -e '
const payload = {email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, firstName: "E2E", lastName: "Yönetici"};
fetch("http://127.0.0.1:8080/api/v1/auth/register", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(payload)})
  .then(async (response) => { if (response.status !== 201) throw new Error(`admin seed registration failed: ${response.status}`); })
  .catch((error) => { console.error(error.message); process.exit(1); });
'

psql "$required_db" -v ON_ERROR_STOP=1 -c "
UPDATE hrd_users
SET role='admin', status='ACTIVE', email_verified_at=COALESCE(email_verified_at, now()), updated_at=now()
WHERE email_normalized=lower('${E2E_ADMIN_EMAIL}');

INSERT INTO hrd_media_assets (
  id, owner_user_id, provider, master_object_key, content_type, byte_size,
  width_px, height_px, lifecycle_status, technical_metadata, created_at, updated_at
)
SELECT '${E2E_BANNER_ASSET_ID}', id, 'B2', 'e2e/${E2E_BANNER_ASSET_ID}.png',
       'image/png', 68, 16, 6, 'MASTER_READY', '{}', now(), now()
FROM hrd_users WHERE email_normalized=lower('${E2E_ADMIN_EMAIL}');

INSERT INTO hrd_banners (
  id, placement, status, asset_id, title, alt_text, sort_order, version,
  created_by_user_id, created_at, updated_at
)
SELECT '${E2E_BANNER_ID}', 'HOMEPAGE', 'INACTIVE', '${E2E_BANNER_ASSET_ID}',
       '${E2E_BANNER_TITLE}', 'E2E banner', 0, 1, id, now(), now()
FROM hrd_users WHERE email_normalized=lower('${E2E_ADMIN_EMAIL}');
" >"$runtime_dir/seed.log" 2>&1

(cd "$bo_root" && BACKEND_API_URL='http://127.0.0.1:8080' PORT=3000 go run .) >"$runtime_dir/bo.log" 2>&1 &
pids+=("$!")
wait_for_url 'http://127.0.0.1:3000/login'

(
  while [[ ! -f "$worker_marker" ]]; do sleep 0.1; done
  cd "$be_root"
  exec go run ./cmd/worker
) >"$runtime_dir/worker.log" 2>&1 &
pids+=("$!")

cd "$bo_root"
npx playwright test

horse_count="$(psql "$required_db" -Atc "select count(*) from hrd_horses where tjk_number='E2E-${E2E_RUN_ID}' and original_name='E2E TAY ${E2E_RUN_ID}'")"
if [[ "$horse_count" != '1' ]]; then
  echo 'Fake TJK horse was not persisted.' >&2
  exit 1
fi
