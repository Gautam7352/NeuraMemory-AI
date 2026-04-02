# 🧪 [Testing Improvement] Add unit tests for `registerRateLimiter` middleware

## Description

**🎯 What:**
Added a comprehensive suite of unit tests for the missing `registerRateLimiter` (as well as `loginRateLimiter`) middleware inside `server/src/middleware/rateLimit.test.ts`. The implementation makes use of dynamic imports and `vi.stubEnv` to mock `process.env.NODE_ENV` properly at import time so both development/testing limits and production strict limits can be accurately verified.

**📊 Coverage:**
The new test suite covers:
- **Development/Test Environment:** Verifies that both the register and login limiters correctly set standard rate limit headers (i.e., `ratelimit-limit` header set to 10,000) while allowing requests to pass through.
- **Production Environment:** Verifies that the register limiter blocks requests and returns an exact `429` error response with the correct custom message after 10 attempts.
- **Production Environment:** Verifies that the login limiter blocks requests and returns an exact `429` error response with the correct custom message after 5 attempts.

**✨ Result:**
Test coverage in the rate limit middleware was increased from 0 to 4 functional integration-style tests that guarantee no regressions on production limits during future modifications or refactors.
