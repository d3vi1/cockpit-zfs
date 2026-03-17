/**
 * Pure formatting utilities — no framework dependencies.
 * Extracted from composables/helpers.ts during Vue→React migration.
 */

/** Convert raw bytes to a human-readable binary size string (e.g. "1.50 GiB"). */
export const convertBytesToSize = (bytes: number, precision: number = 2): string => {
	if (bytes == null || isNaN(bytes)) {
		return 'N/A';
	}

	if (bytes === 0) {
		return `0 B`;
	}

	const binarySizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	const base = 1024;

	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), binarySizes.length - 1);
	const convertedSize = (bytes / Math.pow(base, i)).toFixed(precision);

	return `${convertedSize} ${binarySizes[i]}`;
};

/** Convert a human-readable size string (binary or decimal) back to raw bytes. */
export const convertSizeToBytes = (size: string): number => {
	const binarySizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	const base = 1024;
	const decimalBase = 1000;

	const match = size.trim().match(/(\d+\.?\d*)\s*([a-zA-Z]+)/i);
	if (!match) {
		throw new Error(`Invalid size format: "${size}"`);
	}

	const [value, unit] = match.slice(1);
	const normalizedUnit = unit.toLowerCase();

	const decimalSizes = ['b', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb'];

	// Check for binary unit
	const index = binarySizes.findIndex((sizeUnit) => sizeUnit.toLowerCase() === normalizedUnit);
	if (index !== -1) {
		return parseFloat(value) * Math.pow(base, index);
	}

	// Check for decimal unit
	const decimalIndex = decimalSizes.findIndex((sizeUnit) => sizeUnit.toLowerCase() === normalizedUnit);
	if (decimalIndex !== -1) {
		const decimalBytes = parseFloat(value) * Math.pow(decimalBase, decimalIndex);
		const binaryBytes = decimalBytes * Math.pow(decimalBase / base, decimalIndex);
		return binaryBytes;
	}

	throw new Error(`Unrecognized unit: "${unit}"`);
};

/** Extract the numeric part from a data-size string like "1.50 GiB". */
export const getSizeNumberFromString = (sizeString: string): number => {
	const [value] = sizeString.split(' ');
	return parseFloat(value);
};

/** Extract the unit part from a data-size string like "1.50 GiB". */
export const getSizeUnitFromString = (sizeString: string): string => {
	const [, unit] = sizeString.split(' ');
	return unit;
};

/** Format quota / refreservation bytes into a human-readable string. */
export const getQuotaRefreservUnit = (bytes: number): string => {
	const sizes = ['kib', 'mib', 'gib', 'tib'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));

	if (i === 0) {
		return `${bytes} Bytes`;
	}

	const convertedSize = (bytes / Math.pow(1024, i)).toFixed(2);
	return `${convertedSize} ${sizes[i - 1]}`;
};

/** Get a locale-formatted timestamp string for the current moment. */
export function getTimestampString(): string {
	const currentDateTime = new Date();
	const timestampString = currentDateTime.toLocaleString('en-US', {
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	return timestampString;
}

/** Generate a snapshot-style timestamp like "2024.01.15-09.30.45". */
export function getSnapshotTimestamp(): string {
	const currentDateTime = new Date();

	const year = currentDateTime.getFullYear();
	const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
	const day = String(currentDateTime.getDate()).padStart(2, '0');
	const hour = String(currentDateTime.getHours()).padStart(2, '0');
	const minute = String(currentDateTime.getMinutes()).padStart(2, '0');
	const second = String(currentDateTime.getSeconds()).padStart(2, '0');

	return `${year}.${month}.${day}-${hour}.${minute}.${second}`;
}

/** Parse a timestamp string into a raw Unix timestamp (seconds). */
export function getRawTimestampFromString(timestampString: string | undefined | null): number | null {
	if (timestampString === undefined || timestampString === null) {
		return null;
	}
	const rawTimestamp = new Date(timestampString).getTime() / 1000;
	return rawTimestamp;
}

/** Convert a raw Unix timestamp (seconds) to an ISO-ish "YYYY-MM-DD HH:MM:SS" string. */
export function convertRawTimestampToString(rawTimestamp: number): string {
	const date = new Date(rawTimestamp * 1000);
	const timestamp = date.toISOString().replace(/T|Z/g, ' ').trim();
	return timestamp.substring(0, 19);
}

/** Convert a UTC timestamp string to a local formatted string. */
export function convertTimestampToLocal(timestamp: string): string {
	const hasSpace = timestamp.includes(' ');
	const utcTimestamp = hasSpace ? timestamp.replace(' ', 'T') + 'Z' : timestamp;

	const localTimestamp = new Date(utcTimestamp).toLocaleString('en-US', {
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
	});

	const rearrangedTimestamp = localTimestamp.replace(/\//g, '-').replace(',', '');
	const [date, time] = rearrangedTimestamp.split(' ');
	const [month, day, year] = date.split('-');
	const rearrangedDate = `${year}-${month}-${day}`;

	return `${rearrangedDate} ${time}`;
}

/** Convert a timestamp to "YYYY-MM-DD HH:MM:SS" custom format. */
export function convertTimestampFormat(timestamp: string): string {
	const parsedTimestamp = new Date(timestamp);
	const year = parsedTimestamp.getFullYear();
	const month = (parsedTimestamp.getMonth() + 1).toString().padStart(2, '0');
	const day = parsedTimestamp.getDate().toString().padStart(2, '0');
	const hours = parsedTimestamp.getHours().toString().padStart(2, '0');
	const minutes = parsedTimestamp.getMinutes().toString().padStart(2, '0');
	const seconds = parsedTimestamp.getSeconds().toString().padStart(2, '0');

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/** Convert seconds to a human-readable duration string. */
export function convertSecondsToString(seconds: number): string {
	let result = '';

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0) {
		result += `${hours} hour${hours > 1 ? 's' : ''} `;
	}

	if (minutes > 0) {
		result += `${minutes} minute${minutes > 1 ? 's' : ''} `;
	}

	if (hours === 0 && minutes === 0) {
		result += `${seconds} second${seconds > 1 ? 's' : ''} `;
	}

	return result.trim();
}

/** Validate a capacity string like "32G", "9.01T", "500M". */
export function isCapacityPatternInvalid(capacityStr: string): boolean {
	return /^(\d+(\.\d+)?)(\s*[KMGTP]{1})$/i.test(capacityStr);
}

/**
 * Format a capacity string like "32G" → "32 GB".
 * Throws if the format is unrecognised.
 */
export function formatCapacityString(capacityStr: string): string {
	const match = capacityStr.match(/^(\d+(\.\d+)?)(\s*[KMGTP])?$/i);
	if (!match) {
		throw new Error("Invalid capacity string format. Expected format like '32G', '500M', '9.01T', '1P'.");
	}

	const value = parseFloat(match[1]);
	const unit = match[3] ? match[3].trim().toUpperCase() : "G";
	const decimalUnit = `${unit}B`;

	return `${value} ${decimalUnit}`;
}

/**
 * Convert decimal size units (KB/MB/GB/TB/PB) to binary (KiB/MiB/GiB/TiB/PiB).
 * Leaves binary units, percentages, plain numbers, and non-matching strings unchanged.
 */
export function changeUnitToBinary(capacity: any): any {
	if (capacity == null) return capacity;

	if (typeof capacity !== 'string') return capacity;

	const s = capacity.trim();

	// Leave percents or plain numbers alone
	if (/^\d+(\.\d+)?\s*%$/.test(s) || /^\d+(\.\d+)?$/.test(s)) return capacity;

	// Already binary (KiB/MiB/GiB/TiB/PiB) -> return as-is
	if (/^\d+(\.\d+)?\s*[KMGTPE]iB$/i.test(s)) return s.replace(/\s+/, ' ');

	// Decimal KB/MB/GB/TB/PB -> add "i"
	const m = s.match(/^(\d+(?:\.\d+)?)\s*([KMGTPE])B$/i);
	if (m) return `${m[1]} ${m[2]}iB`;

	// Non-matching strings -> leave unchanged
	return capacity;
}
