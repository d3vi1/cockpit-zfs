/**
 * ErrorSummary — display error counts and details for a pool / vdev / disk.
 *
 * Uses PatternFly Alert and ExpandableSection to show read/write/checksum
 * errors in a collapsible block. Renders nothing when there are no errors.
 */

import React, { useState } from 'react';
import {
	Alert,
	AlertVariant,
	ExpandableSection,
	Flex,
	FlexItem,
	Content,
	ContentVariants,
} from '@patternfly/react-core';

export interface ErrorCounts {
	read: number;
	write: number;
	checksum: number;
}

export interface ErrorSummaryProps {
	/** Error counts to display. */
	errors: ErrorCounts;
	/** Optional label for the entity (e.g. pool name, disk name). */
	label?: string;
	/** Optional pool-level status detail string. */
	statusDetail?: string;
	/** If true, always show the section even when all counts are zero. */
	showAlways?: boolean;
	/** If true, render a compact inline version without the expandable wrapper. */
	compact?: boolean;
}

function totalErrors(errors: ErrorCounts): number {
	return errors.read + errors.write + errors.checksum;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
	errors,
	label,
	statusDetail,
	showAlways = false,
	compact = false,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const total = totalErrors(errors);

	// Nothing to show
	if (total === 0 && !statusDetail && !showAlways) {
		return null;
	}

	const alertVariant = total > 0 ? AlertVariant.danger : AlertVariant.info;
	const alertTitle = label
		? `${label} — ${total} error${total !== 1 ? 's' : ''}`
		: `${total} error${total !== 1 ? 's' : ''}`;

	const errorDetails = (
		<Flex spaceItems={{ default: 'spaceItemsLg' }}>
			<FlexItem>
				<Content component={ContentVariants.small}>
					Read errors: <strong>{errors.read}</strong>
				</Content>
			</FlexItem>
			<FlexItem>
				<Content component={ContentVariants.small}>
					Write errors: <strong>{errors.write}</strong>
				</Content>
			</FlexItem>
			<FlexItem>
				<Content component={ContentVariants.small}>
					Checksum errors: <strong>{errors.checksum}</strong>
				</Content>
			</FlexItem>
		</Flex>
	);

	// Compact mode: just the numbers inline
	if (compact) {
		return (
			<Flex spaceItems={{ default: 'spaceItemsMd' }} alignItems={{ default: 'alignItemsCenter' }}>
				<FlexItem>
					<Content component={ContentVariants.small}>
						R: <strong>{errors.read}</strong>
					</Content>
				</FlexItem>
				<FlexItem>
					<Content component={ContentVariants.small}>
						W: <strong>{errors.write}</strong>
					</Content>
				</FlexItem>
				<FlexItem>
					<Content component={ContentVariants.small}>
						C: <strong>{errors.checksum}</strong>
					</Content>
				</FlexItem>
			</Flex>
		);
	}

	return (
		<Alert variant={alertVariant} isInline title={alertTitle}>
			{statusDetail && (
				<Content component={ContentVariants.p}>{statusDetail}</Content>
			)}
			{total > 0 && (
				<ExpandableSection
					toggleText={isExpanded ? 'Hide error details' : 'Show error details'}
					onToggle={(_event, expanded) => setIsExpanded(expanded)}
					isExpanded={isExpanded}
				>
					{errorDetails}
				</ExpandableSection>
			)}
			{total === 0 && showAlways && (
				<Content component={ContentVariants.small}>No errors detected.</Content>
			)}
		</Alert>
	);
};

export default ErrorSummary;
