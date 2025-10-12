#!/bin/bash

# Restart Mujarrad Backend on Render
# This script uses the Render API to trigger a service restart

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Mujarrad Backend Restart Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if RENDER_API_KEY is set
if [ -z "$RENDER_API_KEY" ]; then
    echo -e "${RED}Error: RENDER_API_KEY environment variable not set${NC}"
    echo ""
    echo "To set your Render API key:"
    echo "  export RENDER_API_KEY='your-api-key-here'"
    echo ""
    echo "Get your API key from: https://dashboard.render.com/account/settings"
    exit 1
fi

# Check if SERVICE_ID is set (optional, can be passed as argument)
SERVICE_ID="${1:-$RENDER_SERVICE_ID}"

if [ -z "$SERVICE_ID" ]; then
    echo -e "${RED}Error: SERVICE_ID not provided${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 <service-id>"
    echo ""
    echo "Or set environment variable:"
    echo "  export RENDER_SERVICE_ID='srv-xxxxxxxxxxxxxxxxxxxxx'"
    echo ""
    echo "Find your service ID at: https://dashboard.render.com/web/mujarrad"
    exit 1
fi

echo -e "${YELLOW}Service ID: ${SERVICE_ID}${NC}"
echo ""

# Confirm restart
read -p "Are you sure you want to restart the backend service? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Restart cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Triggering service restart...${NC}"

# Call Render API to restart service
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.render.com/v1/services/${SERVICE_ID}/restart" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 202 ]; then
    echo -e "${GREEN}✓ Service restart triggered successfully!${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${YELLOW}Note: The service may take 1-2 minutes to fully restart${NC}"
    echo "Check status at: https://dashboard.render.com/web/${SERVICE_ID}"
    echo ""
    echo -e "${GREEN}After restart completes, try logging in again:${NC}"
    echo "  mujarrad auth login"
else
    echo -e "${RED}✗ Failed to restart service${NC}"
    echo "HTTP Status: $HTTP_CODE"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
fi
