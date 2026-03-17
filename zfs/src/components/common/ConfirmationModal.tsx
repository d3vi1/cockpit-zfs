/**
 * ConfirmationModal — generic confirmation dialog using PatternFly React.
 *
 * Replaces the Vue UniversalConfirmation.vue component with a simpler,
 * composable React modal that individual pages can extend with extra content.
 */

import React from 'react';
import {
	Modal,
	ModalVariant,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Button,
	ButtonVariant,
	Spinner,
} from '@patternfly/react-core';

export type ConfirmationVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmationModalProps {
	/** Whether the modal is open. */
	isOpen: boolean;
	/** Called when the modal should close (cancel or backdrop click). */
	onClose: () => void;
	/** Called when the user confirms the action. */
	onConfirm: () => void;
	/** Modal title. */
	title: string;
	/** Body message — can be a plain string or React nodes for richer content. */
	message: React.ReactNode;
	/** Label for the confirm button (defaults to "Confirm"). */
	confirmText?: string;
	/** Label for the cancel button (defaults to "Cancel"). */
	cancelText?: string;
	/** Visual variant for the confirm button. Defaults to "danger". */
	variant?: ConfirmationVariant;
	/** When true, the confirm button shows a spinner and is disabled. */
	isLoading?: boolean;
	/** Optional loading text shown next to spinner (e.g. "Destroying..."). */
	loadingText?: string;
	/** Whether the confirm button should be disabled (independent of isLoading). */
	isConfirmDisabled?: boolean;
	/** Optional extra content rendered between the message and the footer. */
	children?: React.ReactNode;
}

/** Map our variant names to PF ButtonVariant values. */
function mapButtonVariant(variant: ConfirmationVariant): ButtonVariant {
	switch (variant) {
		case 'danger':
			return ButtonVariant.danger;
		case 'warning':
			return ButtonVariant.warning;
		case 'primary':
		default:
			return ButtonVariant.primary;
	}
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	variant = 'danger',
	isLoading = false,
	loadingText,
	isConfirmDisabled = false,
	children,
}) => {
	return (
		<Modal
			variant={ModalVariant.small}
			isOpen={isOpen}
			onClose={onClose}
			aria-labelledby="confirmation-modal-title"
		>
			<ModalHeader title={title} titleIconVariant={variant === 'danger' ? 'danger' : 'warning'} />

			<ModalBody>
				{typeof message === 'string' ? <p>{message}</p> : message}
				{children}
			</ModalBody>

			<ModalFooter>
				<Button
					variant={mapButtonVariant(variant)}
					onClick={onConfirm}
					isDisabled={isConfirmDisabled || isLoading}
					isLoading={isLoading}
					spinnerAriaValueText={isLoading ? 'Loading' : undefined}
				>
					{isLoading && loadingText ? loadingText : confirmText}
				</Button>
				<Button variant={ButtonVariant.link} onClick={onClose} isDisabled={isLoading}>
					{cancelText}
				</Button>
			</ModalFooter>
		</Modal>
	);
};

export default ConfirmationModal;
