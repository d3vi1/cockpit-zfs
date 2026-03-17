/**
 * Notification Context — React context wrapping useNotifications hook.
 * Provides notification state and methods to the entire component tree.
 */

import React, { createContext, useContext } from 'react';
import { useNotifications, type NotificationState } from '../hooks/useNotifications';

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
	const notificationState = useNotifications();

	return (
		<NotificationContext.Provider value={notificationState}>
			{children}
		</NotificationContext.Provider>
	);
}

export function useNotificationContext(): NotificationState {
	const ctx = useContext(NotificationContext);
	if (!ctx) {
		throw new Error('useNotificationContext must be used within a NotificationProvider');
	}
	return ctx;
}

export { NotificationContext };
