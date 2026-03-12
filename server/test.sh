#!/bin/bash

# ============================================================================
# NeuraMemory-AI Server API Test Suite
# ============================================================================
# This script performs comprehensive testing of all API endpoints.
# It requires curl and jq to be installed.
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Default config
BASE_URL="${BASE_URL:-http://localhost:3000}"
VERBOSE="${VERBOSE:-false}"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"
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
make_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local expected_status="$4"

  if [ "$VERBOSE" = "true" ]; then
    echo -e "${CYAN}→ $method $BASE_URL$endpoint${NC}"
    [ -n "$data" ] && echo -e "${CYAN}  Body: $data${NC}"
  fi

  local response=$(curl -s -w "\n%{http_code}" -X "$method" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"} \
    "$BASE_URL$endpoint")

  local body=$(echo "$response" | sed '$d')
  local status=$(echo "$response" | tail -n1)

  if [ "$VERBOSE" = "true" ]; then
    echo -e "${CYAN}← Status: $status${NC}"
    echo -e "${CYAN}  Response: $body${NC}"
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

  local actual=$(echo "$LAST_RESPONSE_BODY" | jq -r ".$field")

  if [ "$actual" = "$expected" ]; then
    print_pass "$test_name ($field=$actual)"
  else
    print_fail "$test_name" "$field=$expected" "$field=$actual"
  fi
}

assert_json_field_exists() {
  local field="$1"
  local test_name="$2"

  local actual=$(echo "$LAST_RESPONSE_BODY" | jq -r ".$field")

  if [ "$actual" != "null" ] && [ -n "$actual" ]; then
    print_pass "$test_name ($field exists)"
  else
    print_fail "$test_name" "$field to exist" "$field is null or missing"
  fi
}

# ============================================================================
# Environment Variables Listing
# ============================================================================

list_environment_variables() {
  print_header "ENVIRONMENT VARIABLES"

  echo -e "${CYAN}Required Variables:${NC}"
  print_env_var "MONGODB_URI" "required"
  print_env_var "QDRANT_URL" "required"
  print_env_var "OPENROUTER_API_KEY" "required"
  print_env_var "JWT_SECRET" "required"

  echo -e "\n${CYAN}Optional Variables:${NC}"
  print_env_var "PORT" "optional"
  print_env_var "NODE_ENV" "optional"
  print_env_var "QDRANT_API_KEY" "optional"
  print_env_var "OPENROUTER_BASE_URL" "optional"
  print_env_var "OPENROUTER_REFERER" "optional"
  print_env_var "OPENROUTER_TITLE" "optional"
  print_env_var "JWT_EXPIRES_IN" "optional"

  echo ""
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

preflight_checks() {
  print_header "PRE-FLIGHT CHECKS"

  # Check if curl is installed
  if command -v curl &> /dev/null; then
    print_pass "curl is installed"
  else
    print_fail "curl is installed" "curl found" "curl not found"
    echo -e "${RED}Please install curl to run this test suite${NC}"
    exit 1
  fi

  # Check if jq is installed
  if jq --version >/dev/null 2>&1; then
    print_pass "jq is installed"
  else
    print_fail "jq is installed" "jq found" "jq not found"
    echo -e "${RED}Please install jq to run this test suite${NC}"
    exit 1
  fi

  # Check if server is reachable
  print_info "Checking server at $BASE_URL..."
  if curl -s --max-time 5 -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/register" 2>/dev/null | grep -q "^[0-9]*$"; then
    print_pass "Server is reachable at $BASE_URL"
  else
    print_fail "Server is reachable" "Server responding" "Connection failed"
    echo -e "${RED}Please ensure the server is running at $BASE_URL${NC}"
    exit 1
  fi

  echo ""
}

# ============================================================================
# API Endpoint Tests
# ============================================================================

test_register_endpoint() {
  print_section "POST /api/v1/register - Registration Endpoint"

  # Generate unique email for this test run
  TIMESTAMP=$(date +%s%N)
  TEST_EMAIL="test_${TIMESTAMP}@example.com"
  TEST_PASSWORD="SecurePass123"

  # Test 1: Successful registration
  print_test "Valid registration with strong password"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "201" "Should return 201 Created"
  assert_json_field "success" "true" "Response should have success=true"
  assert_json_field "message" "Account created successfully." "Should return success message"
  assert_json_field_exists "token" "Should return JWT token"
  assert_json_field_exists "user.id" "Should return user ID"
  assert_json_field "user.email" "$TEST_EMAIL" "Should return user email"

  # Store token for later use
  REGISTERED_USER_TOKEN=$(echo "$LAST_RESPONSE_BODY" | jq -r '.token')
  REGISTERED_USER_ID=$(echo "$LAST_RESPONSE_BODY" | jq -r '.user.id')

  # Test 2: Duplicate email registration
  print_test "Duplicate email registration should fail"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "409" "Should return 409 Conflict"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 3: Invalid email format
  print_test "Invalid email format should fail"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"not-an-email\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 4: Missing email field
  print_test "Missing email field should fail"
  make_request "POST" "/api/v1/register" \
    "{\"password\":\"$TEST_PASSWORD\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 5: Missing password field
  print_test "Missing password field should fail"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"test@example.com\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 6: Password too short
  print_test "Password shorter than 8 characters should fail"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"short_${TIMESTAMP}@example.com\",\"password\":\"Short1\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 7: Password without uppercase
  print_test "Password without uppercase letter should fail"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"nouppercase_${TIMESTAMP}@example.com\",\"password\":\"lowercase123\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 8: Password without number
  print_test "Password without number should fail"
  make_request "POST" "/api/v1/register" \
    "{\"email\":\"nonumber_${TIMESTAMP}@example.com\",\"password\":\"NoNumberHere\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 9: Empty request body
  print_test "Empty request body should fail"
  make_request "POST" "/api/v1/register" "{}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 10: Malformed JSON
  print_test "Malformed JSON should fail gracefully"
  make_request "POST" "/api/v1/register" "{invalid json"
  # Should return 400 or 500, depending on Express error handling
  if [ "$LAST_RESPONSE_STATUS" = "400" ] || [ "$LAST_RESPONSE_STATUS" = "500" ]; then
    print_pass "Malformed JSON handled (HTTP $LAST_RESPONSE_STATUS)"
  else
    print_fail "Malformed JSON handled" "HTTP 400 or 500" "HTTP $LAST_RESPONSE_STATUS"
  fi
}

test_login_endpoint() {
  print_section "POST /api/v1/login - Login Endpoint"

  # Use the account created in registration tests
  TEST_EMAIL="test_${TIMESTAMP}@example.com"
  TEST_PASSWORD="SecurePass123"

  # Test 1: Successful login
  print_test "Valid login with correct credentials"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "200" "Should return 200 OK"
  assert_json_field "success" "true" "Response should have success=true"
  assert_json_field "message" "Login successful." "Should return success message"
  assert_json_field_exists "token" "Should return JWT token"
  assert_json_field_exists "user.id" "Should return user ID"
  assert_json_field "user.email" "$TEST_EMAIL" "Should return user email"

  # Verify user ID matches registration
  local login_user_id=$(echo "$LAST_RESPONSE_BODY" | jq -r '.user.id')
  if [ "$login_user_id" = "$REGISTERED_USER_ID" ]; then
    print_pass "User ID matches registration"
  else
    print_fail "User ID matches registration" "$REGISTERED_USER_ID" "$login_user_id"
  fi
  : $((TOTAL_TESTS++))

  # Test 2: Wrong password
  print_test "Login with wrong password should fail"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword123\"}"
  assert_status "401" "Should return 401 Unauthorized"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 3: Non-existent user
  print_test "Login with non-existent email should fail"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"nonexistent_${TIMESTAMP}@example.com\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "401" "Should return 401 Unauthorized"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 4: Invalid email format
  print_test "Login with invalid email format should fail"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"not-an-email\",\"password\":\"$TEST_PASSWORD\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 5: Missing email field
  print_test "Login without email should fail"
  make_request "POST" "/api/v1/login" \
    "{\"password\":\"$TEST_PASSWORD\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 6: Missing password field
  print_test "Login without password should fail"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$TEST_EMAIL\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 7: Empty password
  print_test "Login with empty password should fail"
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"\"}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 8: Empty request body
  print_test "Login with empty body should fail"
  make_request "POST" "/api/v1/login" "{}"
  assert_status "400" "Should return 400 Bad Request"
  assert_json_field "success" "false" "Response should have success=false"

  # Test 9: Case sensitivity check
  print_test "Email should be case-sensitive or normalized"
  local upper_email=$(echo "$TEST_EMAIL" | tr '[:lower:]' '[:upper:]')
  make_request "POST" "/api/v1/login" \
    "{\"email\":\"$upper_email\",\"password\":\"$TEST_PASSWORD\"}"
  # This will fail if emails are case-sensitive (expected behavior)
  # or succeed if they're normalized to lowercase
  print_info "Response status: $LAST_RESPONSE_STATUS (implementation dependent)"
  : $((TOTAL_TESTS++))
}

# ============================================================================
# Test Summary
# ============================================================================

print_summary() {
  print_header "TEST SUMMARY"

  echo -e "Total Tests:  ${TOTAL_TESTS}"
  echo -e "${GREEN}Passed:       ${PASSED_TESTS}${NC}"
  echo -e "${RED}Failed:       ${FAILED_TESTS}${NC}"

  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}\n"
    exit 0
  else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}\n"
    exit 1
  fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  print_header "NeuraMemory-AI API Test Suite"

  echo "Base URL: $BASE_URL"
  echo "Verbose:  $VERBOSE"
  echo ""

  # Load .env if it exists
  if [ -f "$(dirname "$0")/.env" ]; then
    print_info "Loading environment from .env file"
    while IFS= read -r line || [ -n "$line" ]; do
      # Skip empty lines and comments
      [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
      # Export the variable (handles special characters safely)
      if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
      fi
    done < "$(dirname "$0")/.env"
  fi

  list_environment_variables
  preflight_checks

  # Run all endpoint tests
  test_register_endpoint
  test_login_endpoint

  # Print final summary
  print_summary
}

# Run main function
main "$@"
