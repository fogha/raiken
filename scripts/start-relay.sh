#!/bin/bash

# Start the Raiken relay server
# This script can be run alongside your main application

echo "🌐 Starting Raiken Relay Server..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Set default port if not specified
export RELAY_PORT=${RELAY_PORT:-3001}

echo "   Port: $RELAY_PORT"
echo "   PID file: /tmp/raiken-relay.pid"
echo ""

# Start the relay server
node relay-server.js &
RELAY_PID=$!

# Save PID for later cleanup
echo $RELAY_PID > /tmp/raiken-relay.pid

echo "✓ Relay server started (PID: $RELAY_PID)"
echo ""
echo "To stop the server:"
echo "  kill \$(cat /tmp/raiken-relay.pid)"
echo "  rm /tmp/raiken-relay.pid"
echo ""
echo "Health check:"
echo "  curl http://localhost:$RELAY_PORT/health"

# Wait for the process
wait $RELAY_PID
