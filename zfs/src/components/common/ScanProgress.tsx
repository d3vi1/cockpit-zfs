/**
 * ScanProgress — scrub / resilver progress display.
 *
 * Reads scan data from ZfsDataContext and renders a PatternFly Progress bar
 * with status text, percentage, bytes processed, and time remaining.
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
import type { PoolScanObject } from '@45drives/houston-common-lib';
import {
	convertBytesToSize,
	convertSecondsToString,
	convertTimestampToLocal,
} from '../../utils/formatters';

export interface ScanProgressProps {
	/** Scan data for the pool. Pass null/undefined when not yet loaded. */
	scan: PoolScanObject | null | undefined;
	/** Pool status code (e.g. "OK"). When not OK, statusDetail is shown instead. */
	statusCode?: string;
	/** Pool status detail message shown when statusCode !== "OK". */
	statusDetail?: string;
	/** If true, render a compact (mini) variant for pool list rows. */
	mini?: boolean;
}

// ── Helpers ──

function getScanFunction(fn: string | undefined): string {
	switch (fn) {
		case 'RESILVER':
			return 'Resilvering';
		case 'SCRUB':
			return 'Scrubbing';
		case 'NONE':
			return 'N/A';
		default:
			return '';
	}
}

function getProgressVariant(scan: PoolScanObject): ProgressVariant | undefined {
	if (scan.pause && scan.pause !== 'None') {
		return ProgressVariant.warning;
	}
	switch (scan.state) {
		case 'SCANNING':
			return undefined; // default (info blue)
		case 'FINISHED':
			return ProgressVariant.success;
		case 'CANCELED':
			return ProgressVariant.danger;
		default:
			return undefined;
	}
}

function getStateMessageClass(scan: PoolScanObject): string {
	if (scan.pause && scan.pause !== 'None') {
		return 'zfs-status-degraded';
	}
	switch (scan.state) {
		case 'FINISHED':
			return 'zfs-status-online';
		case 'CANCELED':
			return 'zfs-status-faulted';
		default:
			return '';
	}
}

function adjustPercentage(pct: number, state: string): number {
	const rounded = parseFloat(pct.toFixed(2));
	if (state === 'FINISHED' && rounded > 90) return 100;
	return rounded;
}

// ── Component ──

export const ScanProgress: React.FC<ScanProgressProps> = ({
	scan,
	statusCode,
	statusDetail,
	mini = false,
}) => {
	// If pool status is not OK, show the status detail instead
	const isPoolOk = !statusCode || statusCode === 'OK';

	const scanFn = useMemo(() => getScanFunction(scan?.function), [scan?.function]);

	const stateMessage = useMemo(() => {
		if (!scan) return 'Loading scrub/resilver data...';
		if (scan.state === null || scan.state === undefined) return 'No scrub/resilver data found.';

		if (scan.pause && scan.pause !== 'None') {
			return `${scanFn} paused at ${scan.pause}`;
		}

		switch (scan.state) {
			case 'SCANNING':
				return `${scanFn} started at ${convertTimestampToLocal(scan.start_time)}`;
			case 'FINISHED':
				return `${scanFn} finished at ${convertTimestampToLocal(scan.end_time)}`;
			case 'CANCELED':
				return `${scanFn} canceled at ${convertTimestampToLocal(scan.end_time)}`;
			case 'NONE':
				return 'N/A';
			default:
				return '';
		}
	}, [scan, scanFn]);

	const miniStateMsg = useMemo(() => {
		if (!scan) return 'Loading...';
		if (scan.state === null || scan.state === undefined) return 'No scrub/resilver data found.';

		const pct = parseFloat((scan.percentage ?? 0).toFixed(1));

		if (scan.pause && scan.pause !== 'None') {
			return `${scanFn} Paused (${pct}%)`;
		}

		switch (scan.state) {
			case 'SCANNING':
				return `${scanFn}... (${pct}%)`;
			case 'FINISHED':
				return `${scanFn} Complete`;
			case 'CANCELED':
				return `${scanFn} Canceled (${pct}%)`;
			case 'NONE':
				return 'N/A';
			default:
				return '';
		}
	}, [scan, scanFn]);

	const displayMessage = isPoolOk ? stateMessage : (statusDetail ?? '');
	const displayMiniMsg = isPoolOk ? miniStateMsg : (statusDetail ?? '');

	// Nothing to show
	if (!scan && isPoolOk) {
		return (
			<Content component={ContentVariants.small}>
				Loading scrub/resilver data...
			</Content>
		);
	}

	const percentage = scan ? adjustPercentage(scan.percentage ?? 0, scan.state) : 0;
	const processed = convertBytesToSize(scan?.bytes_issued ?? 0);
	const total = convertBytesToSize(scan?.bytes_processed ?? 0);
	const timeLeft = convertSecondsToString(scan?.total_secs_left ?? 0);
	const variant = scan ? getProgressVariant(scan) : undefined;
	const msgClass = scan ? getStateMessageClass(scan) : '';

	const isScanning = scan?.state === 'SCANNING';
	const isPaused = !!(scan?.pause && scan.pause !== 'None');
	const isFinished = scan?.state === 'FINISHED';
	const isCanceled = scan?.state === 'CANCELED';
	const showProgress = scan && scan.state !== null && scan.state !== undefined;

	// ── Mini variant (pool list rows) ──
	if (mini) {
		return (
			<Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }}>
				<FlexItem>
					<Content component={ContentVariants.small}>
						<strong className={msgClass}>{displayMiniMsg}</strong>
					</Content>
				</FlexItem>
				{showProgress && scan.state !== 'NONE' && (
					<FlexItem>
						<Progress
							value={percentage}
							variant={variant}
							size={ProgressSize.sm}
							title={`${processed}/${total}`}
							aria-label="Scan progress"
						/>
					</FlexItem>
				)}
			</Flex>
		);
	}

	// ── Full variant (pool detail) ──
	return (
		<Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
			<FlexItem>
				<strong className={msgClass}>{displayMessage}</strong>
			</FlexItem>

			{showProgress && scan.state !== 'NONE' && (
				<>
					<FlexItem>
						<Progress
							value={percentage}
							variant={variant}
							size={ProgressSize.lg}
							measureLocation="inside"
							aria-label="Scan progress"
						/>
					</FlexItem>

					<FlexItem>
						<Content component={ContentVariants.small}>
							{processed} of {total} processed.
						</Content>
					</FlexItem>

					{isScanning && !isPaused && !isCanceled && !isFinished && (
						<FlexItem>
							<Content component={ContentVariants.small}>
								Completes in {timeLeft}.
							</Content>
						</FlexItem>
					)}

					{isScanning && isPaused && !isCanceled && !isFinished && (
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

export default ScanProgress;
