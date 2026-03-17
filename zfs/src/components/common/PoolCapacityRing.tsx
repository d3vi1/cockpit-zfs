/**
 * PoolCapacityRing — SVG ring capacity visualization.
 *
 * Preserves the custom SVG ring from the Vue PoolCapacity.vue component
 * (which cannot be replaced by a PF Progress bar due to its circular shape),
 * while using PF layout components (Flex) for positioning.
 *
 * Color classes (zfs-capacity-ok / warning / danger / unknown) come from
 * zfs.css and are required for correct theming.
 */

import React, { useMemo } from 'react';
import { Flex, FlexItem, Content, ContentVariants } from '@patternfly/react-core';
import { getCapacityColor } from '../../utils/statusColors';

export interface PoolCapacityRingProps {
	/** Unique identifier for SVG element IDs. */
	id: string;
	/** Capacity percentage (0–100). */
	percentage: number;
	/** Pool or dataset name. */
	name?: string;
	/** Formatted total size string, e.g. "1.50 TiB". */
	totalSize?: string;
	/** SVG circle radius. Defaults to 40. */
	radius?: number;
	/** SVG circle center X. Defaults to 50. */
	cx?: number;
	/** SVG circle center Y. Defaults to 50. */
	cy?: number;
	/** SVG circle stroke width. Defaults to 8. */
	strokeWidth?: number;
	/** Size variant controlling label font size. */
	size?: 'sm' | 'md' | 'lg' | 'xl';
	/** Optional refreservation percentage for adjusted color calculation. */
	refreservationPercent?: number;
}

/** Map size prop to a CSS class for the percentage label. */
function getLabelSizeClass(size: string): string {
	switch (size) {
		case 'xl':
			return 'zfs-capacity-ring__label--xl';
		case 'lg':
			return 'zfs-capacity-ring__label--lg';
		case 'md':
			return 'zfs-capacity-ring__label--md';
		case 'sm':
		default:
			return 'zfs-capacity-ring__label--sm';
	}
}

export const PoolCapacityRing: React.FC<PoolCapacityRingProps> = ({
	id,
	percentage,
	name,
	totalSize,
	radius = 40,
	cx = 50,
	cy = 50,
	strokeWidth = 8,
	size = 'md',
	refreservationPercent,
}) => {
	const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
	const offset = useMemo(
		() => circumference - (circumference * percentage) / 100,
		[circumference, percentage]
	);

	const fillColorClass = getCapacityColor('text', percentage, refreservationPercent);
	const labelSizeClass = getLabelSizeClass(size);

	// SVG viewBox dimensions based on center + radius + stroke
	const viewBoxSize = Math.max(cx, cy) * 2 + strokeWidth;

	return (
		<Flex
			alignItems={{ default: 'alignItemsCenter' }}
			justifyContent={{ default: 'justifyContentSpaceBetween' }}
			flexWrap={{ default: 'nowrap' }}
		>
			{/* Name and total size */}
			{(name || totalSize) && (
				<FlexItem flex={{ default: 'flex_2' }}>
					<Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsNone' }}>
						{name && (
							<FlexItem>
								<Content component={ContentVariants.p}>
									<strong title={name} className="zfs-truncate">
										{name}
									</strong>
								</Content>
							</FlexItem>
						)}
						{totalSize && (
							<FlexItem>
								<Content component={ContentVariants.p}>
									<span className={fillColorClass}>{totalSize}</span>
								</Content>
							</FlexItem>
						)}
					</Flex>
				</FlexItem>
			)}

			{/* SVG ring */}
			<FlexItem flex={{ default: 'flex_1' }}>
				<div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
					<svg
						width="8rem"
						height="8rem"
						viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
						aria-hidden="true"
						style={{ transform: 'translate(0.25rem, 0.25rem)' }}
					>
						{/* Track circle */}
						<circle
							id={`${id}-track`}
							className="zfs-capacity-ring__track"
							strokeWidth={strokeWidth}
							stroke="currentColor"
							fill="transparent"
							r={radius}
							cx={cx}
							cy={cy}
						/>
						{/* Filled circle */}
						<circle
							id={`${id}-fill`}
							className={fillColorClass}
							strokeWidth={strokeWidth}
							strokeDasharray={circumference}
							strokeDashoffset={offset}
							strokeLinecap="round"
							stroke="currentColor"
							fill="transparent"
							r={radius}
							cx={cx}
							cy={cy}
						/>
					</svg>
					{/* Percentage label */}
					<span
						className={`zfs-capacity-ring__label ${labelSizeClass} ${fillColorClass}`}
						style={{ position: 'absolute' }}
					>
						{percentage}%
					</span>
				</div>
			</FlexItem>
		</Flex>
	);
};

export default PoolCapacityRing;
