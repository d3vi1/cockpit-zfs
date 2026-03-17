/**
 * StatusDisplay — pool / vdev / disk health status indicator.
 *
 * Renders a PatternFly Label colored according to the ZFS status string
 * (ONLINE, DEGRADED, FAULTED, etc.) using the CSS classes from zfs.css
 * via formatStatus().
 */

import React from 'react';
import { Flex, FlexItem, Label } from '@patternfly/react-core';
import {
	CheckCircleIcon,
	ExclamationTriangleIcon,
	ExclamationCircleIcon,
	QuestionCircleIcon,
	InProgressIcon,
} from '@patternfly/react-icons';
import { formatStatus } from '../../utils/statusColors';

export interface StatusDisplayProps {
	/** Raw ZFS status string, e.g. "ONLINE", "DEGRADED", "FAULTED". */
	status: string;
	/** Optional extra detail text shown after the status label. */
	detail?: string;
	/** If true, render a compact label without surrounding Flex layout. */
	compact?: boolean;
}

/** Map a ZFS status to a PatternFly Label color. */
function getLabelColor(status: string): 'green' | 'orange' | 'red' | 'blue' | 'grey' {
	switch (status) {
		case 'ONLINE':
			return 'green';
		case 'DEGRADED':
			return 'orange';
		case 'FAULTED':
		case 'SUSPENDED':
		case 'OFFLINE':
		case 'REMOVED':
		case 'UNAVAIL':
			return 'red';
		case 'REPLACING':
			return 'orange';
		default:
			return 'grey';
	}
}

/** Pick an appropriate icon for the status. */
function getStatusIcon(status: string): React.ReactElement {
	switch (status) {
		case 'ONLINE':
			return <CheckCircleIcon />;
		case 'DEGRADED':
		case 'REPLACING':
			return <ExclamationTriangleIcon />;
		case 'FAULTED':
		case 'SUSPENDED':
		case 'OFFLINE':
		case 'REMOVED':
		case 'UNAVAIL':
			return <ExclamationCircleIcon />;
		default:
			return <QuestionCircleIcon />;
	}
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
	status,
	detail,
	compact = false,
}) => {
	const cssClass = formatStatus(status);
	const labelColor = getLabelColor(status);
	const icon = getStatusIcon(status);

	const label = (
		<Label color={labelColor} icon={icon} className={cssClass}>
			{status}
		</Label>
	);

	if (compact) {
		return label;
	}

	return (
		<Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
			<FlexItem>{label}</FlexItem>
			{detail && (
				<FlexItem>
					<span className={cssClass}>{detail}</span>
				</FlexItem>
			)}
		</Flex>
	);
};

export default StatusDisplay;
