# Restore PostgreSQL from a Rental ERP backup (Phase 8-006) — Windows PowerShell
# Requires: psql on PATH, gunzip or Expand-Archive, DATABASE_URL
#
# Usage:
#   .\scripts\db\restore.ps1
#   .\scripts\db\restore.ps1 .\backups\rental-erp_20260711T120000Z.sql.gz

param(
  [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RootDir

if (-not $env:DATABASE_URL) {
  throw "[restore] DATABASE_URL is required"
}

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }

if (-not $BackupFile) {
  $latest = Get-ChildItem -Path $BackupDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "rental-erp_*" } |
    Sort-Object Name |
    Select-Object -Last 1
  if (-not $latest) {
    throw "[restore] No backups found in $BackupDir"
  }
  $BackupFile = $latest.FullName
}

if (-not (Test-Path $BackupFile)) {
  throw "[restore] Backup file not found: $BackupFile"
}

Write-Host "[restore] Restoring from $BackupFile"
Write-Host "[restore] Press Ctrl+C within 5 seconds to abort..."
Start-Sleep -Seconds 5

$TempSql = Join-Path $env:TEMP ("rental-erp-restore-" + [guid]::NewGuid().ToString() + ".sql")

try {
  if ($BackupFile -like "*.gz") {
    if (-not (Get-Command gunzip -ErrorAction SilentlyContinue)) {
      throw "[restore] gunzip is required for .sql.gz files"
    }
    & gunzip -c $BackupFile | Set-Content -Path $TempSql -Encoding utf8
  } elseif ($BackupFile -like "*.zip") {
    $TempDir = Join-Path $env:TEMP ("rental-erp-restore-" + [guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $TempDir | Out-Null
    Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force
    $extracted = Get-ChildItem -Path $TempDir -Filter "*.sql" | Select-Object -First 1
    if (-not $extracted) { throw "[restore] No .sql found inside ZIP" }
    Copy-Item $extracted.FullName $TempSql -Force
    Remove-Item $TempDir -Recurse -Force
  } else {
    Copy-Item $BackupFile $TempSql -Force
  }

  & psql --dbname="$env:DATABASE_URL" --set ON_ERROR_STOP=1 --file="$TempSql"
  if ($LASTEXITCODE -ne 0) { throw "[restore] psql failed" }
} finally {
  if (Test-Path $TempSql) { Remove-Item $TempSql -Force -ErrorAction SilentlyContinue }
}

Write-Host "[restore] Restore finished"
Write-Host "[restore] Validate with: npm run db:status"
