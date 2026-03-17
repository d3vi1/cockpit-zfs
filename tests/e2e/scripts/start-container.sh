#!/bin/bash
set -euo pipefail

# Start the cockpit-zfs E2E test container using Apple's container CLI.
# This script is idempotent: it will skip steps that are already done.
#
# The container uses a custom kernel (6.18.5 with CONFIG_MODULES=y) so that
# ZFS kernel modules (built from OpenZFS 2.4.1) can be loaded at boot.

CONTAINER_NAME="cockpit-zfs-e2e"
IMAGE_NAME="cockpit-zfs-e2e:latest"
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CUSTOM_KERNEL="$REPO_ROOT/tests/e2e/.kernel/vmlinux-custom-6.18.5"

echo "=== cockpit-zfs E2E container launcher ==="
echo "Repo root: $REPO_ROOT"
echo ""

# Check if container already exists and is running
EXISTING=$(/usr/local/bin/container list 2>/dev/null | grep "$CONTAINER_NAME" || true)
if [ -n "$EXISTING" ]; then
  echo "Container '$CONTAINER_NAME' is already running."
  echo "$EXISTING"
  echo ""
  echo "Cockpit UI: http://localhost:9090"
  echo "SSH:        ssh -p 2222 testuser@localhost  (password: testpass)"
  exit 0
fi

# Check if custom kernel exists
if [ ! -f "$CUSTOM_KERNEL" ]; then
  echo "ERROR: Custom kernel not found at: $CUSTOM_KERNEL"
  echo "The custom kernel with CONFIG_MODULES=y is required for ZFS support."
  echo "See tests/e2e/README for build instructions."
  exit 1
fi

# Check if image exists
IMAGE_EXISTS=$(/usr/local/bin/container image list 2>/dev/null | grep "$CONTAINER_NAME" || true)
if [ -z "$IMAGE_EXISTS" ]; then
  echo "Image '$IMAGE_NAME' not found. Building..."
  /usr/local/bin/container build \
    -t "$CONTAINER_NAME" \
    -f "$REPO_ROOT/tests/e2e/Containerfile" \
    -m 4G \
    "$REPO_ROOT"
  echo "Image built successfully."
fi

# Start the container with custom kernel for ZFS module support
echo "Starting container '$CONTAINER_NAME' with custom kernel..."
/usr/local/bin/container run \
  --name "$CONTAINER_NAME" \
  -p 9090:9090 \
  -p 2222:22 \
  -m 4G \
  --cpus 4 \
  -k "$CUSTOM_KERNEL" \
  -d \
  "$IMAGE_NAME"

echo "Container started."

# Wait for systemd to be ready
echo "Waiting for systemd to initialize..."
for i in $(seq 1 30); do
  if /usr/local/bin/container exec "$CONTAINER_NAME" systemctl is-system-running --wait 2>/dev/null; then
    break
  fi
  sleep 2
done

# Wait for Cockpit
echo "Waiting for Cockpit to be ready..."
for i in $(seq 1 30); do
  if curl -sk --connect-timeout 2 http://localhost:9090/ >/dev/null 2>&1; then
    echo "Cockpit is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: Cockpit did not become ready within 60 seconds."
    echo "Check container logs: container logs $CONTAINER_NAME"
  fi
  sleep 2
done

# Verify ZFS modules loaded
echo "Checking ZFS modules..."
if /usr/local/bin/container exec "$CONTAINER_NAME" lsmod 2>/dev/null | grep -q zfs; then
  echo "ZFS modules loaded successfully."
else
  echo "WARNING: ZFS modules not loaded. Attempting manual load..."
  /usr/local/bin/container exec "$CONTAINER_NAME" modprobe zfs 2>&1 || true
fi

echo ""
echo "=== Container is running ==="
echo "Cockpit UI: http://localhost:9090"
echo "SSH:        ssh -p 2222 testuser@localhost  (password: testpass)"
echo ""
echo "To set up ZFS fixtures:"
echo "  container exec $CONTAINER_NAME /usr/local/bin/setup-zfs-fixtures.sh"
