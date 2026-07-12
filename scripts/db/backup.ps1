# Full PostgreSQL backup for Rental ERP (Phase 8-006) — Windows PowerShell
# Requires: pg_dump on PATH, gzip (or Compress-Archive fallback), DATABASE_URL
#
# Usage:
#   .\scripts\db\backup.ps1
#   $env:BACKUP_DIR="D:\backups\rental-erp"; .\scripts\db\backup.ps1

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $RootDir

if (-not $env:DATABASE_URL) {
  throw "[backup] DATABASE_URL is required"
}

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\backups" }
$RetentionDays = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 14 }
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$SqlFile = Join-Path $BackupDir "rental-erp_$Timestamp.sql"
$GzFile = "$SqlFile.gz"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "[backup] Writing dump to $SqlFile"
& pg_dump --dbname="$env:DATABASE_URL" --format=plain --no-owner --no-acl --file="$SqlFile"
if ($LASTEXITCODE -ne 0) { throw "[backup] pg_dump failed" }

if (Get-Command gzip -ErrorAction SilentlyContinue) {
  Write-Host "[backup] Compressing with gzip -> $GzFile"
  & gzip -f "$SqlFile"
  if ($LASTEXITCODE -ne 0) { throw "[backup] gzip failed" }
} else {
  Write-Host "[backup] gzip not found; creating ZIP archive"
  $ZipFile = "$SqlFile.zip"
  Compress-Archive -Path $SqlFile -DestinationPath $ZipFile -Force
  Remove-Item $SqlFile -Force
  $GzFile = $ZipFile
}

Write-Host "[backup] Completed: $GzFile"

if ($RetentionDays -gt 0) {
  $Cutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $BackupDir -File |
    Where-Object { $_.Name -like "rental-erp_*" -and $_.LastWriteTime -lt $Cutoff } |
    ForEach-Object {
      Write-Host "[backup] Pruning $($_.FullName)"
      Remove-Item $_.FullName -Force
    }
}

Write-Host "[backup] Done"
