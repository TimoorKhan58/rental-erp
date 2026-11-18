#!/usr/bin/env bash
# End-to-end onboarding check (SaaS phase 3d). Run against a TEST copy only.
#
# Creates a new business through the platform API, then walks it through
# everything a real customer does: first sign-in with a temporary password,
# password change, adding a staff member, a full rental (with isolation
# checks against business A), an owner password reset, and deactivate /
# reactivate.
#
#   B=http://localhost:3100 \
#   PLATFORM_EMAIL=... PLATFORM_PASSWORD=... \
#   JAR_A=jarA MT_IDS="cust order product warehouse" \
#     bash scripts/platform/rehearsal-onboarding-check.sh
#
# JAR_A / MT_IDS (a signed-in owner of an existing business A, and ids of
# its records) are optional; without them the isolation part is skipped.
set -u
B="${B:-http://localhost:3100}"
: "${PLATFORM_EMAIL:?PLATFORM_EMAIL required}" "${PLATFORM_PASSWORD:?PLATFORM_PASSWORD required}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
RUN="$(date +%s)"
SLUG="onboard-$RUN"
OWNER_EMAIL="owner-$RUN@rentcore.test"
STAFF_EMAIL="staff-$RUN@rentcore.test"
TEMP1="Temp-$RUN-Aa1"; OWNER_PW="Owner-$RUN-Bb2!"; STAFF_TEMP="Staff-$RUN-Cc3"; STAFF_PW="Staff-$RUN-Dd4!"; TEMP2="Reset-$RUN-Ee5"

pass=0; fail=0
check() { if [ "$2" = "$3" ]; then pass=$((pass+1)); printf "  ok    %s\n" "$1"; else fail=$((fail+1)); printf "  FAIL  %s (expected %s, got %s)\n" "$1" "$2" "$3"; fi; }
call() { curl -s -m 200 -H "content-type: application/json" -H "origin: $B" "$@"; }
status() { curl -s -m 200 -o /dev/null -w '%{http_code}' -H "content-type: application/json" -H "origin: $B" "$@"; }
signin() { rm -f "$1"; status -c "$1" -d "{\"email\":\"$2\",\"password\":\"$3\"}" "$B/api/auth/sign-in/email"; }
location() { curl -s -m 200 -o /dev/null -w '%{redirect_url}' -b "$1" "$B$2" | sed "s#$B##"; }
errcode() { grep -oE '"code":"[A-Z_]+"' | head -1 | cut -d'"' -f4; }
P="$WORK/platform"; O="$WORK/owner"; S="$WORK/staff"

curl -s -m 200 -o /dev/null "$B/login"

echo "== Platform owner creates the business"
check "platform owner signs in" 200 "$(signin "$P" "$PLATFORM_EMAIL" "$PLATFORM_PASSWORD")"
CREATED=$(call -b "$P" -d "{\"name\":\"Onboarding $RUN\",\"slug\":\"$SLUG\",\"currencyCode\":\"PKR\",\"currencySymbol\":\"Rs\",\"timezone\":\"Asia/Karachi\",\"owner\":{\"name\":\"Onboarding Owner\",\"email\":\"$OWNER_EMAIL\",\"temporaryPassword\":\"$TEMP1\"}}" "$B/api/platform/businesses")
BID=$(echo "$CREATED" | grep -oE '"id":"[0-9a-f-]{36}"' | head -1 | cut -d'"' -f4)
check "business created" yes "$([ -n "$BID" ] && echo yes || echo no)"
check "starter kit: 4 default accounts" 4 "$(echo "$CREATED" | grep -oE '"accountsCreated":[0-9]+' | cut -d: -f2)"
check "starter kit: 14 numbering sequences" 14 "$(echo "$CREATED" | grep -oE '"documentSequencesCreated":[0-9]+' | cut -d: -f2)"
check "same short name refused" 409 "$(status -b "$P" -d "{\"name\":\"Again\",\"slug\":\"$SLUG\",\"currencyCode\":\"PKR\",\"currencySymbol\":\"Rs\",\"timezone\":\"Asia/Karachi\",\"owner\":{\"name\":\"Again Owner\",\"email\":\"again-$RUN@rentcore.test\",\"temporaryPassword\":\"$TEMP1\"}}" "$B/api/platform/businesses")"
check "listed on the platform" yes "$(call -b "$P" "$B/api/platform/businesses" | grep -q "\"slug\":\"$SLUG\"" && echo yes || echo no)"

echo "== Owner's first sign-in"
check "owner signs in with the temporary password" 200 "$(signin "$O" "$OWNER_EMAIL" "$TEMP1")"
check "pages lead to /change-password" /change-password "$(location "$O" /dashboard)"
check "business APIs refused until changed" PASSWORD_CHANGE_REQUIRED "$(call -b "$O" "$B/api/customers" | errcode)"
check "owner cannot use the platform API" 404 "$(status -b "$O" "$B/api/platform/businesses")"
check "wrong current password refused" 422 "$(status -b "$O" -d "{\"currentPassword\":\"wrong-$RUN\",\"newPassword\":\"$OWNER_PW\"}" "$B/api/account/password")"
check "owner chooses a password" 200 "$(status -b "$O" -d "{\"currentPassword\":\"$TEMP1\",\"newPassword\":\"$OWNER_PW\"}" "$B/api/account/password")"
check "app opens afterwards" 200 "$(status -b "$O" "$B/api/customers")"
check "owner sees no other business's customers" 0 "$(call -b "$O" "$B/api/customers?pageSize=1" | grep -oE '"total":[0-9]+' | head -1 | cut -d: -f2)"

echo "== Owner adds a staff member"
check "staff created" 200 "$(status -b "$O" -d "{\"name\":\"Onboarding Staff\",\"email\":\"$STAFF_EMAIL\",\"password\":\"$STAFF_TEMP\",\"role\":\"manager\"}" "$B/api/users")"
check "staff signs in" 200 "$(signin "$S" "$STAFF_EMAIL" "$STAFF_TEMP")"
check "staff must choose their own password" PASSWORD_CHANGE_REQUIRED "$(call -b "$S" "$B/api/customers" | errcode)"
check "staff chooses a password" 200 "$(status -b "$S" -d "{\"currentPassword\":\"$STAFF_TEMP\",\"newPassword\":\"$STAFF_PW\"}" "$B/api/account/password")"
check "staff works in the same business" 200 "$(status -b "$S" "$B/api/customers")"

if [ -n "${JAR_A:-}" ] && [ -n "${MT_IDS:-}" ]; then
  echo "== Full rental and isolation (scripts/tenancy/rehearsal-two-business-check.sh)"
  OUT=$(B="$B" JAR_A="$JAR_A" JAR_B="$O" MT_IDS="$MT_IDS" bash "$(dirname "$0")/../tenancy/rehearsal-two-business-check.sh" 2>&1)
  echo "$OUT" | grep -E "FAIL" || true
  check "two-business check" 0 "$(echo "$OUT" | grep -oE 'failed: [0-9]+' | cut -d' ' -f2)"
else
  echo "== Full rental and isolation: skipped (set JAR_A and MT_IDS)"
fi

echo "== Owner password reset"
check "platform resets the owner's password" 200 "$(status -b "$P" -d "{\"temporaryPassword\":\"$TEMP2\"}" "$B/api/platform/businesses/$BID/owner-password")"
check "old password stops working" 401 "$(signin "$WORK/x" "$OWNER_EMAIL" "$OWNER_PW")"
check "temporary password signs in" 200 "$(signin "$O" "$OWNER_EMAIL" "$TEMP2")"
check "must choose a new password again" PASSWORD_CHANGE_REQUIRED "$(call -b "$O" "$B/api/customers" | errcode)"
check "owner chooses a new password" 200 "$(status -b "$O" -d "{\"currentPassword\":\"$TEMP2\",\"newPassword\":\"$OWNER_PW\"}" "$B/api/account/password")"

echo "== Deactivate and reactivate"
check "deactivate" 200 "$(status -b "$P" -X PATCH -d '{"isActive":false}' "$B/api/platform/businesses/$BID")"
check "owner's session ended" 401 "$(status -b "$O" "$B/api/customers")"
check "staff cannot sign in" 403 "$(signin "$S" "$STAFF_EMAIL" "$STAFF_PW")"
check "reactivate" 200 "$(status -b "$P" -X PATCH -d '{"isActive":true}' "$B/api/platform/businesses/$BID")"
check "owner signs in again" 200 "$(signin "$O" "$OWNER_EMAIL" "$OWNER_PW")"
check "app works again" 200 "$(status -b "$O" "$B/api/customers")"

echo; echo "business: $SLUG ($BID)"
echo "passed: $pass, failed: $fail"
[ "$fail" -eq 0 ]
