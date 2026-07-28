$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RootDir

if (-not $env:DATABASE_URL) {
  throw "[migrate-safe] DATABASE_URL is required"
}

if (-not $env:BETTER_AUTH_SECRET) { $env:BETTER_AUTH_SECRET = "ops-migrate-placeholder-secret-32chars!!" }
if (-not $env:APP_URL) { $env:APP_URL = "http://localhost:3000" }
if (-not $env:APP_ENV) { $env:APP_ENV = "local" }

Write-Host "[migrate-safe] Step 1/3: create verified backup"
& "$PSScriptRoot\backup.ps1"
if ($LASTEXITCODE -ne 0) { throw "[migrate-safe] backup failed" }

Write-Host "[migrate-safe] Step 2/3: apply migrations"
npm run db:migrate:deploy
if ($LASTEXITCODE -ne 0) { throw "[migrate-safe] migration deploy failed" }

Write-Host "[migrate-safe] Step 3/3: verify migration status"
npm run db:status
if ($LASTEXITCODE -ne 0) { throw "[migrate-safe] migration status failed" }

Write-Host "[migrate-safe] Done"
