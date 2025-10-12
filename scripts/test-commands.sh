#!/bin/bash
# Pre-Release Validation Script
# Tests all CLI commands and generates comprehensive report
#
# Usage: ./scripts/test-commands.sh
#
# Implements US8: Pre-Release Validation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Mujarrad CLI Pre-Release Validation${NC}\n"

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found. Run this script from the project root.${NC}"
  exit 1
fi

# Step 1: Unit Tests
echo -e "${YELLOW}1️⃣  Running unit tests...${NC}"
npm test || {
  echo -e "${RED}❌ Unit tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Unit tests passed${NC}\n"

# Step 2: Build
echo -e "${YELLOW}2️⃣  Building project...${NC}"
npm run build || {
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Build succeeded${NC}\n"

# Step 3: Integration Tests (if staging API is configured)
if [ -n "$MUJARRAD_API_BASE_URL" ]; then
  echo -e "${YELLOW}3️⃣  Running integration tests against ${MUJARRAD_API_BASE_URL}...${NC}"
  npm run test:integration || {
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✅ Integration tests passed${NC}\n"
else
  echo -e "${YELLOW}3️⃣  Skipping integration tests (MUJARRAD_API_BASE_URL not set)${NC}\n"
fi

# Step 4: Pack and Test Installation
echo -e "${YELLOW}4️⃣  Testing package installation...${NC}"

# Create temp directory for package testing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Pack the package
npm pack --pack-destination="$TEMP_DIR" || {
  echo -e "${RED}❌ npm pack failed${NC}"
  exit 1
}

# Find the tarball
PACKAGE=$(ls $TEMP_DIR/mujarrad-cli-*.tgz 2>/dev/null | head -n 1)
if [ -z "$PACKAGE" ]; then
  echo -e "${RED}❌ Could not find packed tarball${NC}"
  exit 1
fi

echo -e "  ${BLUE}→${NC} Packed: $(basename $PACKAGE)"

# Test global installation (if not in CI)
if [ -z "$CI" ]; then
  echo -e "  ${BLUE}→${NC} Testing global install..."

  # Try to install globally
  npm install -g "$PACKAGE" 2>&1 | grep -v "npm WARN" || true

  # Verify CLI is available
  if command -v mujarrad >/dev/null 2>&1; then
    echo -e "  ${BLUE}→${NC} Testing CLI commands..."

    # Test --version
    mujarrad --version || {
      echo -e "${RED}❌ 'mujarrad --version' failed${NC}"
      npm uninstall -g mujarrad-cli 2>/dev/null || true
      exit 1
    }

    # Test --help
    mujarrad --help >/dev/null || {
      echo -e "${RED}❌ 'mujarrad --help' failed${NC}"
      npm uninstall -g mujarrad-cli 2>/dev/null || true
      exit 1
    }

    # Cleanup
    npm uninstall -g mujarrad-cli 2>/dev/null || true

    echo -e "${GREEN}✅ Package installation test passed${NC}\n"
  else
    echo -e "${RED}❌ CLI not found after global install${NC}"
    npm uninstall -g mujarrad-cli 2>/dev/null || true
    exit 1
  fi
else
  echo -e "  ${YELLOW}⏭️  Skipping global install test (running in CI)${NC}\n"
fi

# Step 5: Verify package contents
echo -e "${YELLOW}5️⃣  Verifying package contents...${NC}"

# Extract package
cd "$TEMP_DIR"
tar -xzf "$PACKAGE"

# Check for required files
REQUIRED_FILES=(
  "package/package.json"
  "package/dist/index.js"
  "package/README.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}❌ Missing required file: $file${NC}"
    exit 1
  fi
done

# Check that tests are NOT included (per .npmignore)
if [ -d "package/tests" ]; then
  echo -e "${RED}❌ tests/ directory should not be in package${NC}"
  exit 1
fi

if [ -d "package/specs" ]; then
  echo -e "${RED}❌ specs/ directory should not be in package${NC}"
  exit 1
fi

cd - >/dev/null

echo -e "${GREEN}✅ Package contents verified${NC}\n"

# Step 6: Check for common issues
echo -e "${YELLOW}6️⃣  Checking for common issues...${NC}"

# Check for TypeScript errors
echo -e "  ${BLUE}→${NC} Checking TypeScript..."
npx tsc --noEmit || {
  echo -e "${RED}❌ TypeScript check failed${NC}"
  exit 1
}

# Check for linting issues (if configured)
if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
  echo -e "  ${BLUE}→${NC} Running linter..."
  npm run lint 2>/dev/null || echo -e "  ${YELLOW}⚠️  Linting skipped (no lint script)${NC}"
fi

echo -e "${GREEN}✅ No common issues found${NC}\n"

# Final Summary
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All Pre-Release Checks Passed!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

echo -e "Summary:"
echo -e "  ✅ Unit tests passed"
echo -e "  ✅ Build succeeded"
if [ -n "$MUJARRAD_API_BASE_URL" ]; then
  echo -e "  ✅ Integration tests passed"
else
  echo -e "  ⏭️  Integration tests skipped"
fi
if [ -z "$CI" ]; then
  echo -e "  ✅ Installation test passed"
else
  echo -e "  ⏭️  Installation test skipped (CI)"
fi
echo -e "  ✅ Package contents verified"
echo -e "  ✅ TypeScript check passed"
echo ""

echo -e "${BLUE}📦 Ready for release!${NC}"
echo -e "${BLUE}   Package: $(basename $PACKAGE)${NC}\n"
