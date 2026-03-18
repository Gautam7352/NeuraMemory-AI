#!/usr/bin/env bash
# =============================================================================
# NeuraMemory-AI — API Route Test Script
#
# Tests all auth and memory endpoints with curl.
# Requires: curl, jq (for pretty-printing JSON)
#
# Usage:
#   chmod +x test-routes.sh
#   ./test-routes.sh                    # uses defaults
#   BASE_URL=http://localhost:4000 ./test-routes.sh   # custom port
#   TEST_EMAIL=me@test.com TEST_PASSWORD=MyPass123 ./test-routes.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override via env vars)
# ---------------------------------------------------------------------------
BASE_URL="${BASE_URL:-http://localhost:3000}"
API="${BASE_URL}/api/v1"
TEST_EMAIL="${TEST_EMAIL:-testuser_$(date +%s)@neuramemory.test}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass123}"
TOKEN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
  echo ""
  echo -e "${YELLOW}▶ TEST: $1${NC}"
}

print_pass() {
  echo -e "${GREEN}  ✓ PASS: $1${NC}"
  PASS=$((PASS + 1))
}

print_fail() {
  echo -e "${RED}  ✗ FAIL: $1${NC}"
  FAIL=$((FAIL + 1))
}

# Execute a curl request, capture HTTP status and body
# Usage: do_request <method> <url> [extra_curl_args...]
# Sets: HTTP_STATUS, HTTP_BODY
do_request() {
  local method="$1"
  local url="$2"
  shift 2

  local response
  response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" "$@" 2>&1) || true

  HTTP_STATUS=$(echo "$response" | tail -n1)
  HTTP_BODY=$(echo "$response" | sed '$d')
}

# Pretty-print response
print_response() {
  echo "  Status: ${HTTP_STATUS}"
  if command -v jq &> /dev/null; then
    echo "  Body:   $(echo "$HTTP_BODY" | jq -C . 2>/dev/null || echo "$HTTP_BODY")"
  else
    echo "  Body:   ${HTTP_BODY}"
  fi
}

assert_status() {
  local expected="$1"
  local test_name="$2"
  if [ "$HTTP_STATUS" = "$expected" ]; then
    print_pass "$test_name (HTTP $HTTP_STATUS)"
  else
    print_fail "$test_name (expected $expected, got $HTTP_STATUS)"
  fi
}

# =============================================================================
#  1. AUTH ROUTES
# =============================================================================

print_header "AUTH ROUTES"

# ── 1.1 Register — Happy path ────────────────────────────────────────────────
print_test "POST /api/v1/register — valid credentials"
do_request POST "${API}/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}"
print_response
assert_status "201" "Register new user"

# ── 1.2 Register — Duplicate email ───────────────────────────────────────────
print_test "POST /api/v1/register — duplicate email"
do_request POST "${API}/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}"
print_response
assert_status "409" "Duplicate email rejected"

# ── 1.3 Register — Missing password ─────────────────────────────────────────
print_test "POST /api/v1/register — missing password"
do_request POST "${API}/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"missing@test.com\"}"
print_response
assert_status "400" "Missing password rejected"

# ── 1.4 Register — Weak password (no uppercase) ─────────────────────────────
print_test "POST /api/v1/register — weak password (no uppercase)"
do_request POST "${API}/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"weak@test.com\", \"password\": \"weakpassword1\"}"
print_response
assert_status "400" "Weak password rejected"

# ── 1.5 Register — Invalid email ────────────────────────────────────────────
print_test "POST /api/v1/register — invalid email"
do_request POST "${API}/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"not-an-email\", \"password\": \"${TEST_PASSWORD}\"}"
print_response
assert_status "400" "Invalid email rejected"

# ── 1.6 Login — Happy path ──────────────────────────────────────────────────
print_test "POST /api/v1/login — valid credentials"
do_request POST "${API}/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}"
print_response
assert_status "200" "Login successful"

# Extract token for subsequent requests
if command -v jq &> /dev/null; then
  TOKEN=$(echo "$HTTP_BODY" | jq -r '.token // empty' 2>/dev/null || true)
fi

if [ -z "$TOKEN" ]; then
  echo -e "${RED}  ⚠ Could not extract JWT token. Remaining tests will fail.${NC}"
else
  echo -e "${GREEN}  🔑 Token extracted (${#TOKEN} chars)${NC}"
fi

# ── 1.7 Login — Wrong password ──────────────────────────────────────────────
print_test "POST /api/v1/login — wrong password"
do_request POST "${API}/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_EMAIL}\", \"password\": \"WrongPass999\"}"
print_response
assert_status "401" "Wrong password rejected"

# ── 1.8 Login — Non-existent user ───────────────────────────────────────────
print_test "POST /api/v1/login — non-existent user"
do_request POST "${API}/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"nobody@test.com\", \"password\": \"${TEST_PASSWORD}\"}"
print_response
assert_status "401" "Non-existent user rejected"

# ── 1.9 Login — Malformed JSON ──────────────────────────────────────────────
print_test "POST /api/v1/login — malformed JSON body"
do_request POST "${API}/login" \
  -H "Content-Type: application/json" \
  -d "{bad json"
print_response
assert_status "400" "Malformed JSON rejected"

# =============================================================================
#  2. MEMORY ROUTES — Auth Guard
# =============================================================================

print_header "MEMORY ROUTES — Auth Guard"

# ── 2.1 No token ────────────────────────────────────────────────────────────
print_test "POST /api/v1/memories/text — no auth token"
do_request POST "${API}/memories/text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Hello world\"}"
print_response
assert_status "401" "Rejected without token"

# ── 2.2 Invalid token ───────────────────────────────────────────────────────
print_test "POST /api/v1/memories/text — invalid token"
do_request POST "${API}/memories/text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid.token.here" \
  -d "{\"text\": \"Hello world\"}"
print_response
assert_status "401" "Rejected with invalid token"

# ── 2.3 Malformed Authorization header ──────────────────────────────────────
print_test "POST /api/v1/memories/text — malformed auth header"
do_request POST "${API}/memories/text" \
  -H "Content-Type: application/json" \
  -H "Authorization: Token ${TOKEN}" \
  -d "{\"text\": \"Hello world\"}"
print_response
assert_status "401" "Rejected with non-Bearer scheme"

# =============================================================================
#  3. MEMORY ROUTES — Create (text, link, document)
# =============================================================================

print_header "MEMORY ROUTES — Create"

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

# ── 3.1 POST /memories/text — Happy path ────────────────────────────────────
print_test "POST /api/v1/memories/text — valid text"
do_request POST "${API}/memories/text" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"text": "My name is Shivam. I love building AI systems and I prefer dark mode everywhere. I am currently working on NeuraMemory project."}'
print_response
assert_status "201" "Create memory from text"

# ── 3.2 POST /memories/text — Empty text ────────────────────────────────────
print_test "POST /api/v1/memories/text — empty text"
do_request POST "${API}/memories/text" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"text": ""}'
print_response
assert_status "400" "Empty text rejected"

# ── 3.3 POST /memories/text — Missing text field ────────────────────────────
print_test "POST /api/v1/memories/text — missing text field"
do_request POST "${API}/memories/text" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{}'
print_response
assert_status "400" "Missing text field rejected"

# ── 3.4 POST /memories/link — Happy path ────────────────────────────────────
print_test "POST /api/v1/memories/link — valid URL"
do_request POST "${API}/memories/link" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"url": "https://httpbin.org/html"}'
print_response
assert_status "201" "Create memory from link"

# ── 3.5 POST /memories/link — Invalid URL ───────────────────────────────────
print_test "POST /api/v1/memories/link — invalid URL"
do_request POST "${API}/memories/link" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"url": "not-a-url"}'
print_response
assert_status "400" "Invalid URL rejected"

# ── 3.6 POST /memories/link — FTP URL ───────────────────────────────────────
print_test "POST /api/v1/memories/link — non-HTTP URL"
do_request POST "${API}/memories/link" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"url": "ftp://files.example.com/doc.txt"}'
print_response
assert_status "400" "Non-HTTP URL rejected"

# ── 3.7 POST /memories/link — Missing URL ───────────────────────────────────
print_test "POST /api/v1/memories/link — missing url field"
do_request POST "${API}/memories/link" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{}'
print_response
assert_status "400" "Missing url field rejected"

# ── 3.8 POST /memories/document — TXT file ──────────────────────────────────
print_test "POST /api/v1/memories/document — plain text file"

# Create a temporary test file
TMP_FILE=$(mktemp /tmp/neuramemory_test_XXXXXX.txt)
cat > "$TMP_FILE" <<'EOF'
I have a dog named Bruno. I am a vegetarian. I am learning Rust programming.
I have a presentation on machine learning tomorrow at 3 PM.
EOF

do_request POST "${API}/memories/document" \
  -H "$AUTH_HEADER" \
  -F "file=@${TMP_FILE};type=text/plain"
print_response
assert_status "201" "Create memory from TXT document"

rm -f "$TMP_FILE"

# ── 3.9 POST /memories/document — No file ───────────────────────────────────
print_test "POST /api/v1/memories/document — no file attached"
do_request POST "${API}/memories/document" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{}'
print_response
assert_status "400" "No file rejected"

# ── 3.10 POST /memories/document — Unsupported file type ────────────────────
print_test "POST /api/v1/memories/document — unsupported file type (.csv)"
TMP_CSV=$(mktemp /tmp/neuramemory_test_XXXXXX.csv)
echo "name,age" > "$TMP_CSV"
echo "Shivam,25" >> "$TMP_CSV"

do_request POST "${API}/memories/document" \
  -H "$AUTH_HEADER" \
  -F "file=@${TMP_CSV};type=text/csv"
print_response
# Multer will reject or controller will reject with 400/415
if [ "$HTTP_STATUS" = "400" ] || [ "$HTTP_STATUS" = "415" ]; then
  print_pass "Unsupported file type rejected (HTTP $HTTP_STATUS)"
else
  print_fail "Expected 400 or 415, got $HTTP_STATUS"
fi

rm -f "$TMP_CSV"

# =============================================================================
#  4. MEMORY ROUTES — Read
# =============================================================================

print_header "MEMORY ROUTES — Read"

# ── 4.1 GET /memories — List all ────────────────────────────────────────────
print_test "GET /api/v1/memories — list all memories"
do_request GET "${API}/memories" \
  -H "$AUTH_HEADER"
print_response
assert_status "200" "List all memories"

# ── 4.2 GET /memories — Filter by kind ──────────────────────────────────────
print_test "GET /api/v1/memories?kind=semantic — filter by kind"
do_request GET "${API}/memories?kind=semantic" \
  -H "$AUTH_HEADER"
print_response
assert_status "200" "Filter by kind"

# ── 4.3 GET /memories — Filter by source ────────────────────────────────────
print_test "GET /api/v1/memories?source=text — filter by source"
do_request GET "${API}/memories?source=text" \
  -H "$AUTH_HEADER"
print_response
assert_status "200" "Filter by source"

# ── 4.4 GET /memories — Custom limit ────────────────────────────────────────
print_test "GET /api/v1/memories?limit=2 — custom limit"
do_request GET "${API}/memories?limit=2" \
  -H "$AUTH_HEADER"
print_response
assert_status "200" "Custom limit"

# ── 4.5 GET /memories — No auth ─────────────────────────────────────────────
print_test "GET /api/v1/memories — without auth"
do_request GET "${API}/memories"
print_response
assert_status "401" "List without auth rejected"

# =============================================================================
#  5. MEMORY ROUTES — Delete
# =============================================================================

print_header "MEMORY ROUTES — Delete"

# ── 5.1 DELETE /memories — No auth ──────────────────────────────────────────
print_test "DELETE /api/v1/memories — without auth"
do_request DELETE "${API}/memories"
print_response
assert_status "401" "Delete without auth rejected"

# ── 5.2 DELETE /memories — Happy path ───────────────────────────────────────
print_test "DELETE /api/v1/memories — delete all memories"
do_request DELETE "${API}/memories" \
  -H "$AUTH_HEADER"
print_response
assert_status "200" "Delete all memories"

# ── 5.3 GET /memories — Verify empty after delete ───────────────────────────
print_test "GET /api/v1/memories — verify empty after delete"
do_request GET "${API}/memories" \
  -H "$AUTH_HEADER"
print_response
assert_status "200" "List after delete"

if command -v jq &> /dev/null; then
  COUNT=$(echo "$HTTP_BODY" | jq -r '.data | length' 2>/dev/null || echo "?")
  if [ "$COUNT" = "0" ]; then
    print_pass "Memories list is empty after delete"
  else
    print_fail "Expected 0 memories after delete, got ${COUNT}"
  fi
fi

# =============================================================================
#  SUMMARY
# =============================================================================

echo ""
print_header "TEST SUMMARY"
echo ""
TOTAL=$((PASS + FAIL))
echo -e "  ${GREEN}Passed: ${PASS}${NC} / ${TOTAL}"
echo -e "  ${RED}Failed: ${FAIL}${NC} / ${TOTAL}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}  ⚠ Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}  ✓ All tests passed!${NC}"
  exit 0
fi
