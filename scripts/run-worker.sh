#!/usr/bin/env bash
# Haradan BE Worker Starter Script for macOS / Linux

BE_DIR="$(cd "$(dirname "$0")/../../haradan-be" 2>/dev/null && pwd)"
if [ ! -d "$BE_DIR" ]; then
  BE_DIR="$(cd "$(dirname "$0")/../haradan-be" 2>/dev/null && pwd)"
fi

if [ -d "$BE_DIR" ]; then
  cd "$BE_DIR" || exit
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
  export TJK_ENABLED="true"
  export STORAGE_PROVIDER="b2"
  export IMAGE_PROCESSOR_PROVIDER="tinify"
  export S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
  export S3_REGION="${S3_REGION:-us-east-1}"
  export S3_BUCKET="${S3_BUCKET:-test}"
  export S3_ACCESS_KEY="${S3_ACCESS_KEY:-test}"
  export S3_SECRET_KEY="${S3_SECRET_KEY:-test}"
  export TINIFY_API_KEY="${TINIFY_API_KEY:-test}"
  echo "🚀 haradan-be worker baslatiliyor..."
  go run ./cmd/worker
else
  echo "❌ haradan-be dizini bulunamadi."
  exit 1
fi
