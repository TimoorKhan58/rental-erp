#!/usr/bin/env bash
# Two-business rehearsal check (SaaS phase 2). Run against a TEST database only.
#
#   B=http://localhost:3100 JAR_A=jarA JAR_B=jarB MT_IDS="cust order product warehouse" \
#     bash scripts/tenancy/rehearsal-two-business-check.sh
#
# JAR_A / JAR_B are curl cookie jars of a signed-in owner of business A and B.
# Business B sets itself up, runs a full rental, then tries to reach A's data.
set -u
B="${B:-http://localhost:3100}"
JA="${JAR_A:?JAR_A required}"
JB="${JAR_B:?JAR_B required}"
read -r A_CUST A_ORDER A_PRODUCT A_WAREHOUSE <<< "${MT_IDS:?MT_IDS required}"

pass=0; fail=0
check() { # name, expected, actual
  if [ "$2" = "$3" ]; then pass=$((pass+1)); printf "  ok    %s\n" "$1"; else fail=$((fail+1)); printf "  FAIL  %s (expected %s, got %s)\n" "$1" "$2" "$3"; fi
}
jb() { curl -s -m 200 -b "$JB" -X "$1" -H 'content-type: application/json' ${3:+-d "$3"} "$B$2"; }
code() { curl -s -m 200 -b "$JB" -X "$1" -H 'content-type: application/json' ${3:+-d "$3"} -o /dev/null -w '%{http_code}' "$B$2"; }
field() { grep -oE "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
id() { grep -oE '"id":"[0-9a-f-]{36}"' | head -1 | cut -d'"' -f4; }

echo "== Business B sets itself up"
WH=$(jb POST /api/warehouses '{"name":"B Main Store","address":"B City"}' | id)
PR=$(jb POST /api/products '{"name":"B Chair","unit":"pcs","rentalRate":50}' | id)
jb POST /api/inventory "{\"productId\":\"$PR\",\"warehouseId\":\"$WH\",\"quantityOnHand\":100}" > /dev/null
PHONE=$(curl -s -m 60 -b "$JA" "$B/api/customers?pageSize=1" | grep -oE '"phone":"[^"]+"' | head -1 | cut -d'"' -f4)
CU=$(jb POST /api/customers "{\"name\":\"B Customer\",\"phone\":\"$PHONE\",\"address\":\"B Road\"}" | id)
check "B can reuse a phone number that business A also has" "yes" "$([ -n "$CU" ] && echo yes || echo no)"

echo "== Business B runs a full rental"
R=$(jb POST /api/rental-orders "{\"customerId\":\"$CU\",\"warehouseId\":\"$WH\",\"startDate\":\"2030-01-10\",\"endDate\":\"2030-01-12\",\"items\":[{\"productId\":\"$PR\",\"quantity\":10,\"dailyRate\":50}]}")
O=$(echo "$R" | id); LINE=$(echo "$R" | grep -oE '"items":\[\{"id":"[0-9a-f-]{36}"' | grep -oE '[0-9a-f-]{36}')
check "order created" "DRAFT" "$(echo "$R" | field status)"
check "confirm" "CONFIRMED" "$(jb POST /api/rental-orders/$O/confirm | field status)"
check "reserve" "RESERVED" "$(jb POST /api/rental-orders/$O/reserve "{\"items\":[{\"productId\":\"$PR\",\"quantity\":10}]}" | field status)"
D=$(jb POST /api/dispatches "{\"rentalOrderId\":\"$O\",\"dispatchDate\":\"2030-01-10\",\"deliveryMethod\":\"CUSTOMER_PICKUP\",\"deliveryAddress\":\"B Road\",\"items\":[{\"productId\":\"$PR\",\"rentalOrderItemId\":\"$LINE\",\"quantity\":10}]}" | id)
jb PATCH /api/dispatches/$D '{"markReady":true}' > /dev/null
check "dispatch complete" "COMPLETED" "$(jb POST /api/dispatches/$D/complete | field status)"
RT=$(jb POST /api/returns "{\"rentalOrderId\":\"$O\",\"dispatchId\":\"$D\",\"returnDate\":\"2030-01-12\",\"items\":[{\"rentalOrderItemId\":\"$LINE\",\"quantity\":10}]}" | id)
jb POST /api/returns/$RT/receive > /dev/null
jb POST /api/returns/$RT/inspect "{\"items\":[{\"rentalOrderItemId\":\"$LINE\",\"goodQuantity\":9,\"damagedQuantity\":1,\"lostQuantity\":0,\"missingQuantity\":0}]}" > /dev/null
check "return complete" "COMPLETED" "$(jb POST /api/returns/$RT/complete | field status)"
check "order completed" "COMPLETED" "$(jb GET /api/rental-orders/$O | field status)"
INV=$(jb POST /api/rental-invoices/generate "{\"rentalOrderId\":\"$O\"}" | id)
check "invoice issued" "ISSUED" "$(jb POST /api/rental-invoices/$INV/issue | field status)"
TOTAL=$(jb GET /api/rental-invoices/$INV | grep -oE '"grandTotal":[0-9.]+' | head -1 | cut -d: -f2)
PAY=$(jb POST /api/payments "{\"rentalInvoiceId\":\"$INV\",\"customerId\":\"$CU\",\"paymentDate\":\"2030-01-12\",\"paymentMethod\":\"CASH\",\"amount\":$TOTAL}" | id)
check "payment posted" "POSTED" "$(jb POST /api/payments/$PAY/post | field status)"
check "invoice paid" "PAID" "$(jb GET /api/rental-invoices/$INV | field status)"
check "notifications created for B" "yes" "$([ "$(jb GET '/api/notifications?pageSize=5' | grep -c '"id"')" -gt 0 ] && echo yes || echo no)"

echo "== Business B tries to reach business A's data"
check "read A's customer" 404 "$(code GET /api/customers/$A_CUST)"
check "read A's order" 404 "$(code GET /api/rental-orders/$A_ORDER)"
check "edit A's customer" 404 "$(code PATCH /api/customers/$A_CUST '{"notes":"x"}')"
check "delete A's product" 404 "$(code DELETE /api/products/$A_PRODUCT)"
check "cancel A's order" 404 "$(code POST /api/rental-orders/$A_ORDER/cancel)"
check "book A's customer/warehouse/product" 404 "$(code POST /api/rental-orders "{\"customerId\":\"$A_CUST\",\"warehouseId\":\"$A_WAREHOUSE\",\"startDate\":\"2030-02-01\",\"endDate\":\"2030-02-02\",\"items\":[{\"productId\":\"$A_PRODUCT\",\"quantity\":1,\"dailyRate\":1}]}")"
check "B's lists contain only B's records (customers)" 1 "$(jb GET '/api/customers?pageSize=50' | grep -oE '"total":[0-9]+' | head -1 | cut -d: -f2)"
check "A's customer untouched" "null" "$(curl -s -m 60 -b "$JA" "$B/api/customers/$A_CUST" | grep -oE '"notes":(null|"[^"]*")' | cut -d: -f2)"

echo; echo "passed: $pass, failed: $fail"
[ "$fail" -eq 0 ]
