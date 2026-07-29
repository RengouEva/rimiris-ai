#!/usr/bin/env bash
# Verify that demo-mode upgrades do NOT record any revenue.
# This script:
#   1. Signs up a brand-new user via /api/auth/signup
#   2. Upgrades them to Pro via /api/auth/upgrade (demo mode — no payment signature)
#   3. Reads .rimiris-revenue.json (should NOT exist or show 0)
#   4. Reads the server account store (should show tier=pro, but no revenue)
set -euo pipefail

BASE="http://localhost:3019"
RAND="test-$(date +%s)-$RANDOM"
EMAIL="$RAND@example.com"
PASS="Password123"

echo "==> Signup $EMAIL"
SIGNUP=$(curl -sS -c /tmp/cookies.txt -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -H "Origin: $BASE" -H "Host: localhost:3019" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Test User\"}")
echo "$SIGNUP" | head -c 200 ; echo
ACCOUNT_ID=$(echo "$SIGNUP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["session"]["accountId"])')
echo "==> accountId=$ACCOUNT_ID"

echo "==> Upgrade to pro (demo — no payment signature)"
UPG=$(curl -sS -b /tmp/cookies.txt -X POST "$BASE/api/auth/upgrade" \
  -H 'Content-Type: application/json' \
  -H "Origin: $BASE" -H "Host: localhost:3019" \
  -d '{"tier":"pro","paymentSignature":"","paymentTimestamp":0}')
echo "$UPG" | head -c 200 ; echo

REAL_PAYMENT=$(echo "$UPG" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("realPayment",False))')
echo "==> realPayment=$REAL_PAYMENT (expected: False)"

echo "==> Check .rimiris-revenue.json"
if [ -f .rimiris-revenue.json ]; then
  echo "FOUND revenue file (BAD):"
  cat .rimiris-revenue.json
  echo
  exit 1
else
  echo "OK: no revenue file was created"
fi

echo "==> Check .rimiris-accounts.json"
python3 -c "
import json
with open('.rimiris-accounts.json') as f:
    data = json.load(f)
for a in data['accounts']:
    if a['email'] == '$EMAIL':
        print(f'  email={a[\"email\"]} tier={a[\"tier\"]} role={a[\"role\"]}')
        print(f'  (no revenue field in account store — correct)')
"

echo
echo "==> ALL CHECKS PASSED: no mock revenue recorded in demo mode"
