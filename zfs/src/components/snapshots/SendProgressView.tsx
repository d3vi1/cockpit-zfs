/**
 * SendProgressView -- progress display for snapshot send operations.
 *
 * Shows a PatternFly Progress bar with percentage, status text, and
 * bytes sent / total size information.
 */

import React, { useMemo } from 'react';
import {
	Flex,
	FlexItem,
	Progress,
	ProgressMeasureLocation,
	ProgressVariant,
	Content,
} from '@patternfly/react-core';

// ────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────

export type SendStatus = 'idle' | 'sending' | 'completed' | 'failed';

export interface SendProgressViewProps {
	/** Current send status. */
	status: SendStatus;
	/** Percentage of transfer completed (0-100). */
	percentage: number;
	/** Whether the send is using force overwrite mode. */
	isOverwriting?: boolean;
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

export const SendProgressView: React.FC<SendProgressViewProps> = ({
	status,
	percentage,
	isOverwriting = false,
}) => {
	const progressVariant = useMemo(() => {
		switch (status) {
			case 'completed':
				return ProgressVariant.success;
			case 'failed':
				return ProgressVariant.danger;
			default:
				return undefined;
		}
	}, [status]);

	const statusLabel = useMemo(() => {
		switch (status) {
			case 'sending':
				return isOverwriting ? 'Overwriting...' : 'Sending...';
			case 'completed':
				return 'Transfer Complete';
			case 'failed':
				return 'Transfer Failed';
			default:
				return '';
		}
	}, [status, isOverwriting]);

	if (status === 'idle') {
		return null;
	}

	return (
		<Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
			<FlexItem>
				<Content component="small">{statusLabel}</Content>
			</FlexItem>
			<FlexItem>
				<Progress
					value={percentage}
					title="Send progress"
					label={`${percentage.toFixed(2)}%`}
					variant={progressVariant}
					measureLocation={ProgressMeasureLocation.outside}
					aria-label="Snapshot send progress"
				/>
			</FlexItem>
		</Flex>
	);
};

export default SendProgressView;
