# TLS certificate placeholders — do NOT commit real certificates or private keys.
#
# Required filenames (mounted at /etc/nginx/certs inside the nginx container):
#
#   fullchain.pem   — certificate + intermediate chain (e.g. Let's Encrypt fullchain.pem)
#   privkey.pem     — private key (e.g. Let's Encrypt privkey.pem)
#
# How to supply certificates:
#   1. Organization / purchased cert: copy PEM files here with the names above.
#   2. Let's Encrypt (certbot): see docs/production/REVERSE_PROXY.md
#   3. Lab / dress rehearsal only: `npm run certs:lab` (self-signed; browsers will warn)
#
# The Nginx container **refuses to start** until both PEMs exist (see scripts/nginx-entrypoint.sh).
#
# Example (local only — never commit):
#   cp /etc/letsencrypt/live/erp.example.com/fullchain.pem ./fullchain.pem
#   cp /etc/letsencrypt/live/erp.example.com/privkey.pem ./privkey.pem
#
# This directory is gitignored for *.pem except documentation.
