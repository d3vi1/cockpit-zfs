/**
 * Status and capacity color mapping utilities — no framework dependencies.
 * Returns CSS class names defined in zfs.css / zfs-theme.css.
 */

/** Map a ZFS pool/vdev/disk status string to the appropriate CSS class. */
export function formatStatus(status: string): string | undefined {
	switch (status) {
		case 'ONLINE':
			return 'zfs-status-online';
		case 'DEGRADED':
			return 'zfs-status-degraded';
		case 'FAULTED':
		case 'SUSPENDED':
		case 'OFFLINE':
		case 'REMOVED':
		case 'UNAVAIL':
			return 'zfs-status-faulted';
		case 'REPLACING':
			return 'zfs-status-replacing';
		default:
			return undefined;
	}
}

/**
 * Return a CSS class for capacity level (text or background variant).
 *
 * @param type - 'text' for foreground color, 'bg' for background color
 * @param capacity - current capacity percentage (0-100)
 * @param refreservationPercent - optional refreservation percentage to adjust available space
 */
export function getCapacityColor(type: 'text' | 'bg', capacity: number, refreservationPercent?: number): string {
	const availableSpace = refreservationPercent !== undefined ? 100 - refreservationPercent : 100;
	const capacityPercentOfAvailable = (capacity / availableSpace) * 100;

	if (capacityPercentOfAvailable <= 70) {
		return type === 'text' ? 'zfs-capacity-ok' : 'zfs-capacity-bg-ok';
	} else if (capacityPercentOfAvailable > 70 && capacityPercentOfAvailable <= 85) {
		return type === 'text' ? 'zfs-capacity-warning' : 'zfs-capacity-bg-warning';
	} else if (capacityPercentOfAvailable > 85 && capacityPercentOfAvailable <= 100) {
		return type === 'text' ? 'zfs-capacity-danger' : 'zfs-capacity-bg-danger';
	} else {
		return type === 'text' ? 'zfs-capacity-unknown' : 'zfs-capacity-bg-unknown';
	}
}
