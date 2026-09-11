#!/bin/sh
# Read the hook payload from stdin
PAYLOAD=$(cat)
if [ -z "$PAYLOAD" ] || [ "$PAYLOAD" = "{}" ]; then
    echo "{}"
    exit 0
fi

# Extract workspace path (accounting for possible spacing variations)
WORKSPACE=$(echo "$PAYLOAD" | grep -o '"workspacePaths":\s*\["[^"]*"' | sed 's/"workspacePaths":\s*\["//')

if [ -z "$WORKSPACE" ]; then
    echo "{}"
    exit 0
fi

SESSION_FILE="$WORKSPACE/.job-assistant-session.json"

if [ -f "$SESSION_FILE" ]; then
    USER_ID=$(grep -o '"userId":\s*"[^"]*"' "$SESSION_FILE" | sed 's/"userId":\s*"//' | sed 's/"//')
    EMAIL=$(grep -o '"email":\s*"[^"]*"' "$SESSION_FILE" | sed 's/"email":\s*"//' | sed 's/"//')
    
    if [ -n "$USER_ID" ] && [ -n "$EMAIL" ]; then
        echo "{\"injectSteps\": [{\"ephemeralMessage\": \"SYSTEM CACHE: The current logged-in user is User ID: $USER_ID, Email: $EMAIL.\"}]}"
        exit 0
    fi
fi

echo "{}"
