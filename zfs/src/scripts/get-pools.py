#!/usr/bin/env python3
import os, json, subprocess, logging
# --- minimal inline logger (works without external module) ---
import sys, os, logging
from logging.handlers import RotatingFileHandler, SysLogHandler
from pathlib import Path

def get_logger(name: str, file_basename: str, app_name: str = "cockpit-zfs") -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:  # avoid duplicate handlers if re-imported
        return logger
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    # 1) Syslog if available
    for addr in ("/dev/log", "/run/systemd/journal/syslog"):
        try:
            if os.path.exists(addr):
                h = SysLogHandler(address=addr, facility=SysLogHandler.LOG_USER)
                h.setFormatter(logging.Formatter(f"{name}: %(levelname)s: %(message)s"))
                logger.addHandler(h)
                logger.debug(f"Syslog handler attached via {addr}")
                return logger
        except Exception:
            pass

    # 2) User-writable rotating file
    def _candidates():
        xs = os.environ.get("XDG_STATE_HOME", os.path.expanduser("~/.local/state"))
        xc = os.environ.get("XDG_CACHE_HOME", os.path.expanduser("~/.cache"))
        xr = os.environ.get("XDG_RUNTIME_DIR")
        for base in [xs, xc, xr]:
            if base:
                yield os.path.join(base, app_name, "logs", file_basename)
        yield os.path.join(os.path.expanduser("~/.local/state"), app_name, "logs", file_basename)
        yield os.path.join("/tmp", app_name, file_basename)

    fmt = logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")
    for path in _candidates():
        try:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            fh = RotatingFileHandler(path, maxBytes=5 * 1024 * 1024, backupCount=3, delay=True)
            fh.setFormatter(fmt)
            logger.addHandler(fh)
            logger.debug(f"File logger attached at {path}")
            return logger
        except Exception:
            pass

    # 3) Fallback stdout
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    logger.warning("No syslog/file target available; logging to stdout.")
    return logger
# --- end inline logger ---


logger = get_logger("cockpit_zfs_getpools", "getpools.log")

def _pool_props(pool_name):
    """Fetch extra per-pool properties via ``zpool get``."""
    defaults = {
        "ashift": "0", "comment": "-",
        "autoexpand": "off", "autoreplace": "off", "autotrim": "off",
        "delegation": "on", "listsnapshots": "off", "readonly": "off",
        "failmode": "wait", "altroot": "-",
    }
    try:
        res = subprocess.run(
            ["zpool", "get", ",".join(defaults.keys()), pool_name,
             "-Hp", "-o", "property,value"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True
        )
        if res.returncode == 0:
            for line in res.stdout.strip().splitlines():
                parts = line.split("\t", 1)
                if len(parts) == 2:
                    defaults[parts[0]] = parts[1]
    except Exception as e:
        logger.warning(f"zpool get failed for {pool_name}: {e}")
    return defaults

def _on_off_to_bool(val):
    return val.lower() in ("on", "yes", "true", "1")

def _parse_vdevs_from_status(pool_name):
    """Parse VDev topology from ``zpool status -P`` output for a single pool.

    Returns a groups dict matching the libzfs structure:
        {"data": [...], "cache": [...], "dedup": [...], "log": [...], "spare": [...], "special": [...]}

    Each VDev entry has: name, status, guid, path, stats, children (list of child disks).
    """
    groups = {"data": [], "cache": [], "dedup": [], "log": [], "spare": [], "special": []}
    try:
        res = subprocess.run(
            ["zpool", "status", "-P", pool_name],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True
        )
        if res.returncode != 0:
            logger.warning(f"zpool status failed for {pool_name}: {res.stderr.strip()}")
            return groups

        lines = res.stdout.splitlines()

        # Find the config section (starts after "config:" header)
        config_start = None
        for i, line in enumerate(lines):
            if line.strip().startswith("config:"):
                config_start = i + 1
                break
        if config_start is None:
            return groups

        # Parse indentation-based tree from the config section.
        # Typical output:
        #   NAME                    STATE     READ WRITE CKSUM
        #   testpool-mirror         ONLINE       0     0     0
        #     mirror-0              ONLINE       0     0     0
        #       /dev/disk/by-...    ONLINE       0     0     0
        #       /dev/disk/by-...    ONLINE       0     0     0

        # Skip the header row (NAME STATE READ WRITE CKSUM) and blank lines
        in_config = False
        current_group = "data"
        current_vdev = None

        # Special section keywords that change the current group
        section_keywords = {
            "cache": "cache",
            "log": "log",
            "logs": "log",
            "dedup": "dedup",
            "spare": "spare",
            "spares": "spare",
            "special": "special",
        }

        for i in range(config_start, len(lines)):
            line = lines[i]
            stripped = line.strip()

            # Stop at "errors:" line or blank after config
            if stripped.startswith("errors:") or (in_config and stripped == ""):
                break

            # Skip blank lines and the column header
            if not stripped:
                continue
            if stripped.startswith("NAME") and "STATE" in stripped:
                in_config = True
                continue
            if not in_config:
                continue

            # Determine indentation level (number of leading tabs or groups of spaces)
            indent = len(line) - len(line.lstrip())
            parts = stripped.split()
            if len(parts) < 2:
                continue

            entry_name = parts[0]
            entry_state = parts[1] if len(parts) > 1 else "UNKNOWN"

            # Parse read/write/checksum errors from columns
            read_err = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
            write_err = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0
            cksum_err = int(parts[4]) if len(parts) > 4 and parts[4].isdigit() else 0
            stats = {"read_errors": read_err, "write_errors": write_err, "checksum_errors": cksum_err}

            # Level 0 = pool name (indent ~2), level 1 = vdev/section keyword (indent ~4),
            # level 2 = disk (indent ~6+).  We use relative indent to the pool line.
            # The pool line is the first data line (indent typically 2-4 chars).
            # VDevs are indented one more level, disks one more than that.

            # Check if this is a section keyword (cache, log, spare, etc.)
            if entry_name.lower() in section_keywords:
                current_group = section_keywords[entry_name.lower()]
                current_vdev = None
                continue

            # Pool-level line (the pool name itself) - skip it
            if entry_name == pool_name:
                continue

            # Determine if this is a VDev line or a disk line.
            # VDev names: mirror-N, raidz1-N, raidz2-N, raidz3-N, draid-..., or a bare disk path
            # Disk paths start with / (absolute paths from -P flag)
            is_disk = entry_name.startswith("/")

            if not is_disk:
                # This is a VDev (mirror-0, raidz1-0, etc.) or a replacing-N entry
                vdev_type = "disk"
                for prefix in ("mirror", "raidz3", "raidz2", "raidz1", "draid"):
                    if entry_name.startswith(prefix):
                        vdev_type = prefix if prefix != "mirror" else "mirror"
                        break

                current_vdev = {
                    "name": entry_name,
                    "type": vdev_type,
                    "status": entry_state,
                    "guid": "",
                    "path": "",
                    "stats": stats,
                    "children": [],
                }
                groups[current_group].append(current_vdev)
            else:
                # This is a disk line (path starts with /)
                disk_entry = {
                    "name": entry_name.split("/")[-1],
                    "type": "disk",
                    "status": entry_state,
                    "guid": "",
                    "path": entry_name,
                    "stats": stats,
                    "children": [],
                }
                if current_vdev is not None:
                    current_vdev["children"].append(disk_entry)
                else:
                    # Bare disk directly under pool (no mirror/raidz wrapper) -
                    # create a single-disk VDev
                    single_vdev = {
                        "name": entry_name.split("/")[-1],
                        "type": "disk",
                        "status": entry_state,
                        "guid": "",
                        "path": entry_name,
                        "stats": stats,
                        "children": [],
                    }
                    groups[current_group].append(single_vdev)

    except Exception as e:
        logger.warning(f"Failed to parse vdevs for {pool_name}: {e}")

    return groups


def _pools_from_zpool_list_min():
    """Permission-friendly fallback when libzfs /dev/zfs is blocked."""
    try:
        # -H (scripted) -p (parsable numbers) -o selected fields
        res = subprocess.run(
            ["zpool", "list", "-Hpo", "name,size,allocated,capacity,free,health,guid"],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True
        )
        if res.returncode != 0:
            logger.error(f"zpool list failed: {res.stderr.strip()}")
            return []

        pools = []
        for line in res.stdout.strip().splitlines():
            if not line:
                continue
            name, size, alloc, cap, free, health, guid = line.split()
            props = _pool_props(name)
            groups = _parse_vdevs_from_status(name)
            pools.append({
                "name": name,
                "status": health,
                "guid": guid,
                "properties": {
                    "size": {"parsed": int(size)},
                    "allocated": {"parsed": int(alloc)},
                    "capacity": {"rawvalue": int(cap.rstrip("%"))},
                    "free": {"parsed": int(free)},
                    "health": {"parsed": health},
                    "ashift": {"rawvalue": props["ashift"]},
                    "comment": {"value": props["comment"]},
                    "autoexpand": {"parsed": _on_off_to_bool(props["autoexpand"])},
                    "autoreplace": {"parsed": _on_off_to_bool(props["autoreplace"])},
                    "autotrim": {"parsed": props["autotrim"]},
                    "delegation": {"parsed": _on_off_to_bool(props["delegation"])},
                    "listsnapshots": {"parsed": _on_off_to_bool(props["listsnapshots"])},
                    "readonly": {"parsed": _on_off_to_bool(props["readonly"])},
                    "failmode": {"parsed": props["failmode"]},
                    "altroot": {"value": props["altroot"]},
                },
                "root_dataset": None,
                "scan": {
                    "function": None, "start_time": None, "end_time": None, "pause": None,
                    "state": None, "errors": 0, "percentage": 0,
                    "total_secs_left": 0, "bytes_issued": 0,
                    "bytes_processed": 0, "bytes_to_process": 0,
                },
                "groups": groups,
                "status_code": "OK",
                "status_detail": "",
                "error_count": 0,
            })
        logger.info(f"Pools (fallback) discovered: {len(pools)}")
        return pools
    except Exception as e:
        logger.error(f"Fallback zpool parse failed: {e}")
        return []

def basic_typed_children(children):
    try:
        for i in range(0, len(children)):
            children[i]["properties"]["creation"]["parsed"] = str(children[i]["properties"]["creation"]["parsed"])
            if len(children[i].get("children", [])) >= 1:
                children[i]["children"] = basic_typed_children(children[i]["children"])
        return children
    except Exception as e:
        logger.error(f"Exception in basic_typed_children: {e}")
        return []

def main():
    try:
        logger.info("=" * 80)
        logger.info("Starting a new run of get-pools script")

        try:
            import libzfs
        except Exception as e:
            logger.error(f"libzfs import failed: {e}")
            print(json.dumps(_pools_from_zpool_list_min(), indent=4))
            return

        try:
            with libzfs.ZFS() as zfs:
                z_pools = []
                for p in zfs.pools:
                    pool = p.asdict()
                    root_dataset = pool.get("root_dataset")
                    if root_dataset is not None:
                        pool["root_dataset"]["properties"]["creation"]["parsed"] = str(
                            pool["root_dataset"]["properties"]["creation"]["parsed"]
                        )
                        if "scan" in pool:
                            pool["scan"]["start_time"] = str(pool["scan"]["start_time"])
                            pool["scan"]["end_time"] = str(pool["scan"]["end_time"])
                            pool["scan"]["pause"] = str(pool["scan"]["pause"])
                        pool["root_dataset"]["children"] = basic_typed_children(pool["root_dataset"]["children"])
                    else:
                        pool["root_dataset"] = None

                    logger.debug(f"Parsed pool data: {{'name': '{pool['name']}', 'status': '{pool['status']}'}}")
                    z_pools.append(pool)

                logger.info(f"Pools discovered: {len(z_pools)}")
                print(json.dumps(z_pools, indent=4, default=str))
        except PermissionError as e:
            logger.error(f"Permission opening libzfs: {e}")
            print(json.dumps(_pools_from_zpool_list_min(), indent=4))
        except Exception as e:
            logger.error(f"Unhandled exception with libzfs: {e}")
            print(json.dumps(_pools_from_zpool_list_min(), indent=4))
    except Exception as e:
        logger.error(f"Exception in main: {e}")
        print("[]")

if __name__ == "__main__":
    main()