/**
 * LoadingSpinner — centered loading indicator using PatternFly Spinner.
 *
 * Replaces the custom SVG spinner from LoadingSpinner.vue with the
 * standard PatternFly <Spinner> wrapped in <Bullseye> for centering.
 */

import React from 'react';
import {
	Bullseye,
	Spinner,
	Content,
	ContentVariants,
	Flex,
	FlexItem,
} from '@patternfly/react-core';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingSpinnerProps {
	/** Size of the spinner. Defaults to "lg". */
	size?: SpinnerSize;
	/** Optional loading message displayed below the spinner. */
	message?: string;
	/** If true, skip the Bullseye centering wrapper (for inline use). */
	inline?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = 'lg',
	message,
	inline = false,
}) => {
	const spinner = (
		<Flex
			direction={{ default: 'column' }}
			alignItems={{ default: 'alignItemsCenter' }}
			spaceItems={{ default: 'spaceItemsSm' }}
		>
			<FlexItem>
				<Spinner size={size} aria-label="Loading" />
			</FlexItem>
			{message && (
				<FlexItem>
					<Content component={ContentVariants.small}>{message}</Content>
				</FlexItem>
			)}
		</Flex>
	);

	if (inline) {
		return spinner;
	}

	return <Bullseye>{spinner}</Bullseye>;
};

export default LoadingSpinner;
