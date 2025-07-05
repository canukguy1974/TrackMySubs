#!/bin/bash

# Reset scan limit script for TrackMySubs
# Usage: ./reset-scan-limit.sh <user-email>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <user-email>"
    echo "Example: $0 user@example.com"
    exit 1
fi

USER_EMAIL="$1"

echo "🔧 Resetting scan limit for: $USER_EMAIL"

# Check if node is available
if command -v node &> /dev/null; then
    NODE_CMD="node"
elif command -v nodejs &> /dev/null; then
    NODE_CMD="nodejs"
else
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Run the reset command
$NODE_CMD manage-limits.js reset "$USER_EMAIL"

echo "✅ Scan limit reset completed!"
