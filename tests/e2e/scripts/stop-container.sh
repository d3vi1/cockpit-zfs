#!/bin/bash
set -euo pipefail

# Stop and optionally remove the cockpit-zfs E2E test container.

CONTAINER_NAME="cockpit-zfs-e2e"

echo "=== Stopping cockpit-zfs E2E container ==="

# Check if running
EXISTING=$(/usr/local/bin/container list 2>/dev/null | grep "$CONTAINER_NAME" || true)
if [ -z "$EXISTING" ]; then
  echo "Container '$CONTAINER_NAME' is not running."
  exit 0
fi

echo "Stopping container '$CONTAINER_NAME'..."
/usr/local/bin/container stop "$CONTAINER_NAME"
echo "Container stopped."

# If --rm flag passed, also delete the container
if [ "${1:-}" = "--rm" ] || [ "${1:-}" = "--remove" ]; then
  echo "Removing container '$CONTAINER_NAME'..."
  /usr/local/bin/container rm "$CONTAINER_NAME" 2>/dev/null || true
  echo "Container removed."
fi

echo "Done."
