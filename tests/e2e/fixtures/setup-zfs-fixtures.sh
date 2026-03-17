#!/bin/bash
set -euo pipefail

echo "=== Setting up ZFS test fixtures ==="

LOOP_DIR="/var/lib/zfs-test-disks"
mkdir -p "$LOOP_DIR"

# Create 8 x 1GB sparse files
for i in $(seq 1 8); do
  FILE="$LOOP_DIR/disk${i}.img"
  if [ ! -f "$FILE" ]; then
    echo "Creating sparse file: $FILE (1GB)"
    truncate -s 1G "$FILE"
  else
    echo "Sparse file already exists: $FILE"
  fi
done

# Attach loop devices
LOOPS=()
for i in $(seq 1 8); do
  FILE="$LOOP_DIR/disk${i}.img"
  # Check if already attached
  EXISTING=$(losetup -j "$FILE" 2>/dev/null | head -1 | cut -d: -f1 || true)
  if [ -n "$EXISTING" ]; then
    echo "Already attached: $FILE -> $EXISTING"
    LOOPS+=("$EXISTING")
  else
    LOOP=$(losetup --find --show "$FILE")
    echo "Attached: $FILE -> $LOOP"
    LOOPS+=("$LOOP")
  fi
done

echo ""
echo "Loop devices: ${LOOPS[*]}"
echo ""

LOOP1="${LOOPS[0]}"
LOOP2="${LOOPS[1]}"
LOOP3="${LOOPS[2]}"
LOOP4="${LOOPS[3]}"
LOOP5="${LOOPS[4]}"
LOOP6="${LOOPS[5]}"
LOOP7="${LOOPS[6]}"
LOOP8="${LOOPS[7]}"

# --- Pool 1: testpool-mirror (mirror of loop1 + loop2) ---
if ! zpool list testpool-mirror &>/dev/null; then
  echo "Creating testpool-mirror (mirror: $LOOP1 $LOOP2)..."
  zpool create -f testpool-mirror mirror "$LOOP1" "$LOOP2"

  # Create datasets
  zfs create testpool-mirror/data
  zfs create testpool-mirror/data/documents
  zfs create testpool-mirror/data/media

  # Set some properties
  zfs set compression=lz4 testpool-mirror/data
  zfs set quota=500M testpool-mirror/data/documents

  # Write some test data
  dd if=/dev/urandom of=/testpool-mirror/data/documents/testfile.bin bs=1M count=10 2>/dev/null

  # Create snapshots
  zfs snapshot testpool-mirror/data@snap1
  zfs snapshot testpool-mirror/data/documents@snap1

  echo "testpool-mirror created successfully."
else
  echo "testpool-mirror already exists, skipping."
fi

# --- Pool 2: testpool-raidz (raidz of loop3 + loop4 + loop5, spare loop6) ---
if ! zpool list testpool-raidz &>/dev/null; then
  echo "Creating testpool-raidz (raidz: $LOOP3 $LOOP4 $LOOP5, spare: $LOOP6)..."
  zpool create -f testpool-raidz raidz "$LOOP3" "$LOOP4" "$LOOP5" spare "$LOOP6"

  # Create datasets
  zfs create testpool-raidz/backups
  zfs create testpool-raidz/logs

  # Set properties
  zfs set compression=zstd testpool-raidz/backups
  zfs set atime=off testpool-raidz/logs

  # Write some test data
  dd if=/dev/urandom of=/testpool-raidz/backups/backup1.bin bs=1M count=5 2>/dev/null

  # Create snapshots
  zfs snapshot testpool-raidz/backups@daily-1
  zfs snapshot testpool-raidz/backups@daily-2

  echo "testpool-raidz created successfully."
else
  echo "testpool-raidz already exists, skipping."
fi

# --- Pool 3: testpool-importable (created on loop7, then exported) ---
if ! zpool list testpool-importable &>/dev/null; then
  # Check if it's already exported (importable)
  if zpool import 2>/dev/null | grep -q testpool-importable; then
    echo "testpool-importable already exported and ready for import testing."
  else
    echo "Creating testpool-importable on $LOOP7 then exporting..."
    zpool create -f testpool-importable "$LOOP7"
    zfs create testpool-importable/archived
    dd if=/dev/urandom of=/testpool-importable/archived/old-data.bin bs=1M count=2 2>/dev/null
    zfs snapshot testpool-importable/archived@final
    zpool export testpool-importable
    echo "testpool-importable exported (ready for import testing)."
  fi
else
  echo "testpool-importable is currently imported, exporting..."
  zpool export testpool-importable
  echo "testpool-importable exported."
fi

# --- Loop8: left free for create-pool wizard testing ---
echo ""
echo "Loop device $LOOP8 left free for create-pool wizard testing."

echo ""
echo "=== ZFS fixture setup complete ==="
echo ""
echo "Summary:"
echo "  testpool-mirror  : mirror ($LOOP1, $LOOP2) - datasets + snapshots"
echo "  testpool-raidz   : raidz ($LOOP3, $LOOP4, $LOOP5) spare ($LOOP6)"
echo "  testpool-importable : exported (on $LOOP7) - ready for import test"
echo "  Free device      : $LOOP8 - for create-pool wizard"
echo ""
zpool list 2>/dev/null || true
echo ""
zpool status 2>/dev/null || true
