# Non-UI Test Suite

This directory contains a comprehensive test suite for batch processing that operates **without UI/browser automation**. All tests use Playwright's `APIRequestContext` for direct HTTP calls.

## Running Tests

### Run All Non-UI Tests
```bash
npm run test:no-ui
```

### Run by Category
```bash
# Unit tests only (< 5 seconds)
npm run test:unit

# API integration tests (~30 seconds)
npm run test:api

# Edge Function tests (~2-5 minutes)
npm run test:edge

# Full E2E workflow (~2-5 minutes)
npm run test:e2e
```

## Test Comparison

| Feature | UI Test (Browser) | API Test (No Browser) |
|---------|------------------|----------------------|
| **Speed** | 10-30 minutes | 2-5 minutes |
| **Reliability** | Flaky (timing issues) | Stable |
| **Debugging** | Screenshots | Raw JSON |
| **CI/CD** | Needs browser setup | Runs anywhere |

See full documentation in this file.
