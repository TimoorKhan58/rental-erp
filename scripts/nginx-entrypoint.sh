#!/bin/sh
set -eu

# Renders conf.d templates with environment substitution, then starts Nginx.
# Required: NGINX_SERVER_NAME (e.g. erp.example.com)

TEMPLATE_DIR="/etc/nginx/templates"
CONF_DIR="/etc/nginx/conf.d"

mkdir -p "$CONF_DIR" /var/www/certbot

if [ ! -f /etc/nginx/certs/fullchain.pem ] || [ ! -f /etc/nginx/certs/privkey.pem ]; then
  echo "[nginx-entrypoint] ERROR: TLS certificate files are missing."
  echo "[nginx-entrypoint] Place fullchain.pem and privkey.pem under nginx/certs/."
  echo "[nginx-entrypoint] See nginx/certs/README.md and docs/production/REVERSE_PROXY.md"
  exit 1
fi

export NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-erp.example.com}"

echo "[nginx-entrypoint] Rendering Nginx templates for server_name=${NGINX_SERVER_NAME}"

for template in "$TEMPLATE_DIR"/*.template; do
  [ -f "$template" ] || continue
  target="$CONF_DIR/$(basename "$template" .template)"
  # Only substitute NGINX_SERVER_NAME — leave nginx variables like $host intact.
  envsubst '${NGINX_SERVER_NAME}' < "$template" > "$target"
done

echo "[nginx-entrypoint] Testing Nginx configuration..."
nginx -t

echo "[nginx-entrypoint] Starting Nginx..."
exec nginx -g "daemon off;"
