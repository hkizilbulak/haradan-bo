# Haradan BE Worker Starter Script for Windows PowerShell
$beDir = Resolve-Path (Join-Path $PSScriptRoot "..\..\haradan-be") -ErrorAction SilentlyContinue

if (-not $beDir -or -not (Test-Path $beDir)) {
    $beDir = Resolve-Path (Join-Path $PSScriptRoot "..\haradan-be") -ErrorAction SilentlyContinue
}

if ($beDir -and (Test-Path $beDir)) {
    Set-Location $beDir
    if (Test-Path ".env") {
        Get-Content .env | ForEach-Object {
            if ($_ -match "^\s*([^#=]+)\s*=\s*(.*)\s*$") {
                [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
            }
        }
    }
    $env:TJK_ENABLED = "true"
    $env:STORAGE_PROVIDER = "b2"
    $env:IMAGE_PROCESSOR_PROVIDER = "tinify"
    if (-not $env:S3_ENDPOINT) { $env:S3_ENDPOINT = "http://localhost:9000" }
    if (-not $env:S3_REGION) { $env:S3_REGION = "us-east-1" }
    if (-not $env:S3_BUCKET) { $env:S3_BUCKET = "test" }
    if (-not $env:S3_ACCESS_KEY) { $env:S3_ACCESS_KEY = "test" }
    if (-not $env:S3_SECRET_KEY) { $env:S3_SECRET_KEY = "test" }
    if (-not $env:TINIFY_API_KEY) { $env:TINIFY_API_KEY = "test" }
    Write-Host "🚀 haradan-be worker baslatiliyor..." -ForegroundColor Green
    go run ./cmd/worker
} else {
    Write-Error "haradan-be dizini bulunamadi."
}
