#!/bin/bash

# ============================================================================
# NeuraMemory-AI — Unified API Test Suite
# ============================================================================
# This script performs comprehensive testing of all API endpoints, including
# authentication, rate limiting, and memory management.
# It requires curl and jq to be installed.
#
# Usage:
#   chmod +x test-routes.sh
#   ./test-routes.sh                                # uses defaults
#   BASE_URL=http://localhost:4000 ./test-routes.sh  # custom port
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Default config
BASE_URL="${BASE_URL:-http://localhost:3000}"
VERBOSE="${VERBOSE:-false}"
TEST_RATE_LIMITS="${TEST_RATE_LIMITS:-false}"
RUN_OCR_SMOKE="${RUN_OCR_SMOKE:-false}"
HAS_JQ=$(command -v jq >/dev/null 2>&1 && echo "true" || echo "false")
API_V1="${BASE_URL}/api/v1"

# Shared state for tests
TOKEN=""
REGISTERED_USER_ID=""
TIMESTAMP=$(date +%s%N)

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"
}

print_section() {
  echo -e "\n${BLUE}━━━ $1 ━━━${NC}\n"
}

print_test() {
  echo -e "${YELLOW}TEST:${NC} $1"
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC} - $1"
  : $((PASSED_TESTS++))
  : $((TOTAL_TESTS++))
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC} - $1"
  echo -e "${RED}  Expected: $2${NC}"
  echo -e "${RED}  Got: $3${NC}"
  : $((FAILED_TESTS++))
  : $((TOTAL_TESTS++))
}

print_info() {
  echo -e "${CYAN}INFO:${NC} $1"
}

print_env_var() {
  local var_name="$1"
  local var_value="${!var_name}"
  local is_required="$2"

  if [ -z "$var_value" ]; then
    if [ "$is_required" = "required" ]; then
      echo -e "  ${RED}✗${NC} $var_name ${RED}(MISSING - REQUIRED)${NC}"
    else
      echo -e "  ${YELLOW}○${NC} $var_name ${YELLOW}(not set - optional)${NC}"
    fi
  else
    # Mask sensitive values
    if [[ "$var_name" =~ (SECRET|KEY|PASSWORD) ]]; then
      local masked="${var_value:0:8}****${var_value: -4}"
      echo -e "  ${GREEN}✓${NC} $var_name = ${masked}"
    else
      echo -e "  ${GREEN}✓${NC} $var_name = ${var_value}"
    fi
  fi
}

# Make HTTP request and return response
# Usage: make_request <method> <endpoint> [json_data] [expected_status] [extra_args...]
make_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local expected_status="$4"
  
  # Shift at most 4 arguments, or all if fewer than 4
  local to_shift=4
  if [ "$#" -lt 4 ]; then to_shift=$#; fi
  shift "$to_shift"
  
  # Remaining arguments are extra curl arguments

  local curl_args=(-s -w "\n%{http_code}" -X "$method")
  
  # Check if we are doing a file upload
  local is_multipart=false
  for arg in "$@"; do
    if [[ "$arg" == "-F" ]]; then
      is_multipart=true
      break
    fi
  done

  if [ "$is_multipart" = "false" ]; then
    curl_args+=(-H "Content-Type: application/json")
  fi
  
  if [ -n "$TOKEN" ]; then
    curl_args+=(-H "Authorization: Bearer $TOKEN")
  fi
  
  # Add extra args
  for arg in "$@"; do
    curl_args+=("$arg")
  done

  if [ -n "$data" ] && [ "$method" != "GET" ] && [ "$is_multipart" = "false" ]; then
    curl_args+=(-d "$data")
  fi
  
  curl_args+=("$BASE_URL$endpoint")

  if [ "$VERBOSE" = "true" ]; then
    echo -e "${CYAN}→ $method $BASE_URL$endpoint${NC}"
    [ -n "$data" ] && [ "$is_multipart" = "false" ] && echo -e "${CYAN}  Body: $data${NC}"
    [ -n "$TOKEN" ] && echo -e "${CYAN}  Auth: Bearer ${TOKEN:0:10}...${NC}"
  fi

  local response
  response=$(curl "${curl_args[@]}")

  local body=$(echo "$response" | sed '$d')
  local status=$(echo "$response" | tail -n1)

  if [ "$VERBOSE" = "true" ]; then
    echo -e "${CYAN}← Status: $status${NC}"
    if command -v jq &> /dev/null; then
      echo -e "${CYAN}  Response:$(echo "$body" | jq -C . 2>/dev/null || echo "$body")${NC}"
    else
      echo -e "${CYAN}  Response: $body${NC}"
    fi
  fi

  # Store for assertions
  LAST_RESPONSE_BODY="$body"
  LAST_RESPONSE_STATUS="$status"

  # Check status code if expected
  if [ -n "$expected_status" ]; then
    if [ "$status" = "$expected_status" ]; then
      return 0
    else
      return 1
    fi
  fi
}

assert_status() {
  local expected="$1"
  local test_name="$2"

  if [ "$LAST_RESPONSE_STATUS" = "$expected" ]; then
    print_pass "$test_name (HTTP $LAST_RESPONSE_STATUS)"
  else
    print_fail "$test_name" "HTTP $expected" "HTTP $LAST_RESPONSE_STATUS"
  fi
}

assert_json_field() {
  local field="$1"
  local expected="$2"
  local test_name="$3"

  local actual=""
  if [ "$HAS_JQ" = "true" ]; then
    actual=$(echo "$LAST_RESPONSE_BODY" | jq -r ".$field" 2>/dev/null)
  else
    # Fallback for simple top-level fields (handles "field":"string" or "field":boolean/number)
    actual=$(echo "$LAST_RESPONSE_BODY" | sed -n "s/.*\"$field\":\s*\(\"[^\"]*\"\|[^,}]*\).*/\1/p" | sed 's/^"//;s/"$//' | head -n1)
  fi

  if [ "$actual" = "$expected" ]; then
    print_pass "$test_name ($field=$actual)"
  else
    print_fail "$test_name" "$field=$expected" "$field=$actual"
  fi
}

assert_json_field_exists() {
  local field="$1"
  local test_name="$2"

  local actual=""
  if [ "$HAS_JQ" = "true" ]; then
    actual=$(echo "$LAST_RESPONSE_BODY" | jq -r ".$field" 2>/dev/null)
  else
    # Fallback for simple top-level fields
    actual=$(echo "$LAST_RESPONSE_BODY" | sed -n "s/.*\"$field\":.*/exists/p")
  fi

  if [ "$actual" != "null" ] && [ -n "$actual" ]; then
    print_pass "$test_name ($field exists)"
  else
    print_fail "$test_name" "$field to exist" "$field is null or missing"
  fi
}

# ============================================================================
# Environment Variables & Pre-flight
# ============================================================================

list_environment_variables() {
  print_header "ENVIRONMENT VARIABLES"

  echo -e "${CYAN}Required Variables (Server-side):${NC}"
  print_env_var "DATABASE_URL" "required"
  print_env_var "QDRANT_URL" "required"
  print_env_var "OPENROUTER_API_KEY" "required"
  print_env_var "JWT_SECRET" "required"

  echo -e "\n${CYAN}Optional Variables:${NC}"
  print_env_var "PORT" "optional"
  print_env_var "NODE_ENV" "optional"
  print_env_var "QDRANT_API_KEY" "optional"

  echo ""
}

preflight_checks() {
  print_header "PRE-FLIGHT CHECKS"

  if command -v curl &> /dev/null; then
    print_pass "curl is installed"
  else
    print_fail "curl is installed" "curl found" "curl not found"
    exit 1
  fi

  if [ "$HAS_JQ" = "true" ]; then
    print_pass "jq is installed"
  else
    print_info "jq is not installed. JSON parsing will be limited (using sed fallback)."
  fi

  print_info "Checking server at $BASE_URL..."
  if curl -s --max-time 5 -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/register" 2>/dev/null | grep -q "^[0-9][0-9][0-9]$"; then
    print_pass "Server is reachable at $BASE_URL"
  else
    print_fail "Server is reachable" "Server responding" "Connection failed"
    echo -e "${RED}Please ensure the server is running at $BASE_URL${NC}"
    exit 1
  fi

  echo ""
}

# ============================================================================
# Auth Tests
# ============================================================================

test_auth_endpoints() {
  print_section "AUTH ENDPOINTS"

  TEST_EMAIL="test_${TIMESTAMP}@neuramemory.test"
  TEST_PASSWORD="SecurePass123"

  # 1. Register
  print_test "POST /api/v1/register — valid credentials"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "201" "Register new user"
  assert_json_field "success" "true" "Registration success field"
  
  if [ "$HAS_JQ" = "true" ]; then
    REGISTERED_USER_ID=$(echo "$LAST_RESPONSE_BODY" | jq -r '.user.id' 2>/dev/null)
    TOKEN=$(echo "$LAST_RESPONSE_BODY" | jq -r '.token' 2>/dev/null)
  else
    REGISTERED_USER_ID=$(echo "$LAST_RESPONSE_BODY" | sed -n 's/.*"id":\s*"\([^"]*\)".*/\1/p' | head -n1)
    TOKEN=$(echo "$LAST_RESPONSE_BODY" | sed -n 's/.*"token":\s*"\([^"]*\)".*/\1/p' | head -n1)
  fi

  # 2. Duplicate Registration
  print_test "POST /api/v1/register — duplicate email"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "409" "Duplicate email rejected"

  # 3. Weak Password
  print_test "POST /api/v1/register — weak password (no uppercase)"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"weak_${TIMESTAMP}@test.com\",\"password\":\"weakpassword1\"}"
  assert_status "400" "Weak password rejected"

  # 4. Success Login
  print_test "POST /api/v1/login — valid credentials"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "200" "Login successful"
  assert_json_field "success" "true" "Login success field"
  
  # Refresh token
  if [ "$HAS_JQ" = "true" ]; then
    TOKEN=$(echo "$LAST_RESPONSE_BODY" | jq -r '.token' 2>/dev/null)
  else
    TOKEN=$(echo "$LAST_RESPONSE_BODY" | sed -n 's/.*"token":\s*"\([^"]*\)".*/\1/p' | head -n1)
  fi

  # 5. Wrong Password
  print_test "POST /api/v1/login — wrong password"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPass999\"}"
  assert_status "401" "Wrong password rejected"

  if [ -z "$TOKEN" ]; then
    echo -e "${RED}  ⚠ Could not extract JWT token. Remaining tests will fail.${NC}"
  else
    print_info "Token extracted (${#TOKEN} chars)"
  fi
}

# ============================================================================
# Memory Guard Tests
# ============================================================================

test_memory_guards() {
  print_section "MEMORY ROUTES — Auth Guard"

  local OLD_TOKEN=$TOKEN
  TOKEN="" # Temporarily clear token

  print_test "GET /api/v1/memories — no auth token"
  make_request "GET" "/api/v1/memories"
  assert_status "401" "Rejected without token"

  print_test "POST /api/v1/memories/text — invalid token"
  TOKEN="invalid.token.here"
  make_request "POST" "/api/v1/memories/text" "{\"text\": \"Hello world\"}"
  assert_status "401" "Rejected with invalid token"

  TOKEN=$OLD_TOKEN # Restore token
}

# ============================================================================
# Memory CRUD Tests
# ============================================================================

test_memory_crud() {
  print_section "MEMORY ENDPOINTS (CRUD)"

  # 1. Create Text Memory
  print_test "POST /api/v1/memories/text — valid text"
  make_request "POST" "/api/v1/memories/text" \
    '{"text": "My name is Gautam. I am testing the unified script. I love automation."}'
  assert_status "201" "Create text memory"

  # 2. Create Link Memory
  print_test "POST /api/v1/memories/link — valid URL"
  make_request "POST" "/api/v1/memories/link" \
    '{"url": "https://httpbin.org/html"}'
  assert_status "201" "Create link memory"

  # 3. Create Document Memory
  print_test "POST /api/v1/memories/document — plain text file"
  TMP_FILE="./test_doc_$(date +%s).txt"
  echo "I am a temporary test file content for document memory testing." > "$TMP_FILE"
  
  make_request "POST" "/api/v1/memories/document" "" "201" "-F" "file=@${TMP_FILE};type=text/plain"
  assert_status "201" "Create document memory"
  rm -f "$TMP_FILE"

  # 4. List Memories
  print_test "GET /api/v1/memories — list all"
  make_request "GET" "/api/v1/memories"
  assert_status "200" "List all memories"
  assert_json_field_exists "data" "Data field exists in list"

  # 5. Filter by Kind
  print_test "GET /api/v1/memories?kind=semantic — filter"
  make_request "GET" "/api/v1/memories?kind=semantic"
  assert_status "200" "Filter by kind"

  # 6. Delete All
  print_test "DELETE /api/v1/memories — delete all"
  make_request "DELETE" "/api/v1/memories"
  assert_status "200" "Delete all memories成功"

  # 7. Verify Empty
  print_test "GET /api/v1/memories — verify empty"
  make_request "GET" "/api/v1/memories"
  
  local count=""
  if [ "$HAS_JQ" = "true" ]; then
    count=$(echo "$LAST_RESPONSE_BODY" | jq -r '.data | length' 2>/dev/null)
  else
    # Very crude check for empty data array
    if [[ "$LAST_RESPONSE_BODY" =~ \"data\":\[\] ]]; then
      count="0"
    else
      count="unknown"
    fi
  fi
  if [ "$count" = "0" ]; then
    print_pass "Memories list is empty after delete (count=0)"
  else
    print_fail "Memories list empty" "count=0" "count=$count"
  fi
}

# ============================================================================
# Rate Limit Tests
# ============================================================================

test_rate_limits() {
  if [ "$TEST_RATE_LIMITS" != "true" ]; then
    print_info "Skipping rate-limit tests (set TEST_RATE_LIMITS=true to enable)"
    return
  fi

  print_section "RATE LIMITING"

  print_test "Login endpoint should eventually return 429"
  local attempts=0
  local hit_rate_limit="false"

  while [ $attempts -lt 30 ]; do
    attempts=$((attempts + 1))
    # Using a fresh email to not interfere with main tests, but many hits on /login
    make_request "POST" "/api/v1/login" \
      "{\"email\":\"rate_${attempts}_${TIMESTAMP}@test.com\",\"password\":\"WrongPassword\"}"

    if [ "$LAST_RESPONSE_STATUS" = "429" ]; then
      hit_rate_limit="true"
      break
    fi
  done

  if [ "$hit_rate_limit" = "true" ]; then
    print_pass "Rate limit triggered after $attempts attempts (HTTP 429)"
  else
    print_fail "Rate limit triggered" "HTTP 429 within 30 attempts" "No 429 observed"
  fi
}

# ============================================================================
# Summary
# ============================================================================

print_summary() {
  print_header "TEST SUMMARY"

  echo -e "Total Tests:  ${TOTAL_TESTS}"
  echo -e "${GREEN}Passed:       ${PASSED_TESTS}${NC}"
  echo -e "${RED}Failed:       ${FAILED_TESTS}${NC}"

  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}✓ ALL TESTS PASSED!${NC}\n"
    exit 0
  else
    echo -e "\n${BOLD}${RED}✗ SOME TESTS FAILED${NC}\n"
    exit 1
  fi
}

# ============================================================================
# Main
# ============================================================================

main() {
  print_header "NeuraMemory-AI Unified API Test Suite"

  echo -e "${CYAN}Base URL:${NC} $BASE_URL"
  echo -e "${CYAN}Verbose:${NC}  $VERBOSE"
  echo ""

  # Load .env if it exists in the same directory
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$SCRIPT_DIR/.env" ]; then
    print_info "Loading environment from .env file"
    set -a
    [ -f "$SCRIPT_DIR/.env" ] && . "$SCRIPT_DIR/.env"
    set +a
  fi

  list_environment_variables
  preflight_checks

  test_auth_endpoints
  test_memory_guards
  test_memory_crud
  test_rate_limits

  print_summary
}

main "$@"
