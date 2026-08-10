#!/bin/bash

set -e

cd "$(dirname "$0")/.."

set -a
source .env.local
set +a

go run main.go
