/**
 * TrimProgress — per-disk trim progress display.
 *
 * Renders a PatternFly Progress bar for a single disk's trim operation,
 * showing state, percentage, and bytes processed.
 */

import React, { useMemo } from 'react';
import {
	Flex,
	FlexItem,
	Progress,
	ProgressVariant,
	ProgressSize,
	Content,
	ContentVariants,
} from '@patternfly/react-core';
import type { DiskStats } from '../../types';
import {
	convertBytesToSize,
	convertRawTimestampToString,
	convertTimestampToLocal,
} from '../../utils/formatters';

export interface TrimProgressProps {
	/** Disk stats object containing trim state and bytes. */
	disk: DiskStats;
	/** The vdev type this disk belongs to (e.g. "data", "log"). */
	vdevType?: string;
	/** If true, render a compact (mini) variant for disk rows. */
	mini?: boolean;
}

// ── Helpers ──

function getTrimState(stateNum: number): string {
	switch (stateNum) {
		case 0:
			return 'none';
		case 1:
			return 'active';
		case 2:
			return 'canceled';
		case 3:
			return 'suspended';
		case 4:
			return 'finished';
		default:
			return 'none';
	}
}

function upperCaseWord(word: string): string {
	if (!word) return '';
	return word.charAt(0).toUpperCase() + word.slice(1);
}

function getProgressVariant(state: string): ProgressVariant | undefined {
	switch (state) {
		case 'active':
			return undefined; // default info blue
		case 'finished':
			return ProgressVariant.success;
		case 'canceled':
			return ProgressVariant.danger;
		case 'suspended':
			return ProgressVariant.warning;
		default:
			return undefined;
	}
}

function getMessageClass(state: string): string {
	switch (state) {
		case 'canceled':
			return 'zfs-status-faulted';
		case 'suspended':
			return 'zfs-status-degraded';
		case 'finished':
			return 'zfs-status-online';
		default:
			return '';
	}
}

function calcTrimPercentage(disk: DiskStats): number {
	const st = disk.stats;
	if (!st) return 0;
	if (st.trim_state === 4) return 100;

	const est = st.trim_bytes_est ?? 0;
	const done = st.trim_bytes_done ?? 0;
	if (est <= 0) return 0;

	return (done / est) * 100;
}

function adjustTrimPercentage(pct: number): number {
	if (pct <= 0) return 0;
	if (pct >= 99.95) return 100;
	if (pct > 0 && pct < 99.5) return parseFloat(pct.toFixed(2));
	return 0;
}

function getTrimTimestamp(disk: DiskStats): string {
	return convertTimestampToLocal(convertRawTimestampToString(disk.stats.trim_action_time));
}

// ── Component ──

export const TrimProgress: React.FC<TrimProgressProps> = ({
	disk,
	vdevType = 'unknown',
	mini = false,
}) => {
	const trimState = useMemo(() => getTrimState(disk.stats.trim_state), [disk.stats.trim_state]);
	const rawPct = useMemo(() => calcTrimPercentage(disk), [disk]);
	const percentage = useMemo(() => adjustTrimPercentage(rawPct), [rawPct]);
	const variant = useMemo(() => getProgressVariant(trimState), [trimState]);
	const msgClass = useMemo(() => getMessageClass(trimState), [trimState]);

	const processed = convertBytesToSize(disk.stats.trim_bytes_done ?? 0);
	const total = convertBytesToSize(disk.stats.trim_bytes_est ?? 0);

	// Not supported
	if (disk.stats.trim_notsup === 1) {
		return (
			<Content component={ContentVariants.small}>
				Trim not supported on {disk.name}
				{vdevType !== 'unknown' && ` (${upperCaseWord(vdevType)})`}.
			</Content>
		);
	}

	const trimMessage = useMemo(() => {
		switch (trimState) {
			case 'none':
				return 'No Trim Activity';
			case 'active':
				return `Trim active, started at ${getTrimTimestamp(disk)}`;
			case 'canceled':
				return 'Trim canceled';
			case 'suspended':
				return 'Trim is suspended';
			case 'finished':
				return `Trim finished at ${getTrimTimestamp(disk)}`;
			default:
				return '';
		}
	}, [trimState, disk]);

	// ── Mini variant (disk rows) ──
	if (mini) {
		if (trimState === 'none') {
			return (
				<Content component={ContentVariants.small} className={msgClass}>
					No Trim Activity
				</Content>
			);
		}

		return (
			<Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
				<FlexItem>
					<Content component={ContentVariants.small}>
						<strong className={msgClass}>
							Trim {upperCaseWord(trimState)} ({percentage}%)
						</strong>
					</Content>
				</FlexItem>
				{trimState !== 'none' && (
					<FlexItem>
						<Progress
							value={percentage}
							variant={variant}
							size={ProgressSize.sm}
							title={`${processed}/${total}`}
							aria-label={`Trim progress for ${disk.name}`}
						/>
					</FlexItem>
				)}
			</Flex>
		);
	}

	// ── Full variant (pool detail trim section) ──
	return (
		<Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
			<FlexItem>
				<strong className={msgClass}>{trimMessage}</strong>
			</FlexItem>

			{trimState !== 'none' && (
				<FlexItem>
					<Content component={ContentVariants.small} className={msgClass}>
						Disk: {disk.name} ({upperCaseWord(vdevType)})
					</Content>
				</FlexItem>
			)}

			{trimState !== 'none' && (
				<>
					<FlexItem>
						<Progress
							value={percentage}
							variant={variant}
							size={ProgressSize.lg}
							measureLocation="inside"
							aria-label={`Trim progress for ${disk.name}`}
						/>
					</FlexItem>

					<FlexItem>
						<Content component={ContentVariants.small}>
							{processed} of {total} processed.
						</Content>
					</FlexItem>

					{trimState === 'suspended' && (
						<FlexItem>
							<Content component={ContentVariants.small}>
								Resume to continue or cancel to stop.
							</Content>
						</FlexItem>
					)}
				</>
			)}
		</Flex>
	);
};

export default TrimProgress;
