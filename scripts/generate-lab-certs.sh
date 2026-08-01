#!/usr/bin/env bash
# Generate self-signed TLS PEMs for lab / dress-rehearsal only (Phase 20 RC1).
# NEVER use these certificates in real production.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/nginx/certs"
CN="${NGINX_SERVER_NAME:-localhost}"
DAYS="${CERT_DAYS:-825}"

mkdir -p "${CERT_DIR}"

if [[ -f "${CERT_DIR}/fullchain.pem" || -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "Refusing to overwrite existing PEMs in ${CERT_DIR}."
  echo "Remove fullchain.pem / privkey.pem first if you intend to regenerate."
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate lab certificates."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "${TMP_DIR}/privkey.pem" \
  -out "${TMP_DIR}/fullchain.pem" \
  -days "${DAYS}" \
  -subj "/CN=${CN}" \
  -addext "subjectAltName=DNS:${CN},DNS:localhost,IP:127.0.0.1"

cp "${TMP_DIR}/fullchain.pem" "${CERT_DIR}/fullchain.pem"
cp "${TMP_DIR}/privkey.pem" "${CERT_DIR}/privkey.pem"
chmod 644 "${CERT_DIR}/fullchain.pem"
chmod 600 "${CERT_DIR}/privkey.pem"

echo "Lab certificates written to ${CERT_DIR}/"
echo "  CN/SAN: ${CN}, localhost, 127.0.0.1"
echo "Set NGINX_SERVER_NAME=${CN} (or localhost) in .env.production for rehearsal."
echo "Replace with a real CA-issued certificate before production go-live."
