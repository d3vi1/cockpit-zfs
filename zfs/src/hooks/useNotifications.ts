/**
 * Notification hook — React hook wrapping the notification store logic.
 * Ported from store/notification.ts.
 */

import { useState, useCallback, useRef } from 'react';
import type { Notification } from '../types/index';

const cockpit: any = (globalThis as any).cockpit;

// ────────────────────────────────────────────────
// Sidebar notification helper
// ────────────────────────────────────────────────

async function sideBarNotification(count: number): Promise<void> {
	const dbus = cockpit.dbus("org._45drives.Houston");

	try {
		const [highestSeverity] = await dbus.call(
			"/org/_45drives/Houston",
			"org._45drives.Houston",
			"GetHighestMissedSeverity"
		);

		const severityType = count > 0 ? highestSeverity : null;

		(cockpit.transport as any).control("notify", {
			page_status: {
				type: severityType,
				title: cockpit.gettext(`${count} Notifications available`),
			},
		});
	} catch (error) {
		console.error("Failed to fetch highest severity:", error);
	}
}

// ────────────────────────────────────────────────
// React hook
// ────────────────────────────────────────────────

export interface NotificationState {
	notifications: Notification[];
	notificationsCount: number;
	addNotification: (message: string) => void;
	removeNotification: (id: number) => void;
	removeAllNotifications: () => void;
	fetchMissedNotifications: (limit?: number, offset?: number) => Promise<number | undefined>;
	markNotificationAsRead: (id: number) => Promise<void>;
	clearAllNotifications: () => Promise<void>;
	countMissedNotifications: () => Promise<number>;
}

export function useNotifications(): NotificationState {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [notificationsCount, setNotificationsCount] = useState(0);

	// Use refs for stable callback references that always see latest state
	const notificationsRef = useRef(notifications);
	notificationsRef.current = notifications;
	const countRef = useRef(notificationsCount);
	countRef.current = notificationsCount;

	const addNotification = useCallback((message: string) => {
		try {
			const parsedMessage = JSON.parse(message) as {
				id: number;
				timestamp: string;
				event: string;
				pool?: string;
				vdev?: string;
				state?: string;
				health?: string;
				errors?: string;
				severity?: string;
				fileSystem?: string;
				snapShot?: string;
				replicationDestination?: string;
			};

			setNotifications(prev => {
				const existingIndex = prev.findIndex(n => n.id === parsedMessage.id);

				if (existingIndex !== -1) {
					// Update existing notification's state
					const updated = [...prev];
					updated[existingIndex] = { ...updated[existingIndex], state: parsedMessage.state };
					return updated;
				} else {
					// Add new notification at the beginning
					const newNotif: Notification = {
						id: parsedMessage.id,
						timestamp: parsedMessage.timestamp,
						event: parsedMessage.event,
						pool: parsedMessage.pool,
						text: `Event: ${parsedMessage.event}, Pool: ${parsedMessage.pool ?? "N/A"}`,
						state: parsedMessage.state,
						vdev: parsedMessage.vdev,
						health: parsedMessage.health,
						errors: parsedMessage.errors,
						severity: parsedMessage.severity,
						fileSystem: parsedMessage.fileSystem,
						snapShot: parsedMessage.snapShot,
						replicationDestination: parsedMessage.replicationDestination,
					};
					setNotificationsCount(c => {
						const next = c + 1;
						sideBarNotification(next);
						return next;
					});
					return [newNotif, ...prev];
				}
			});
		} catch (error) {
			console.error("Invalid JSON format received:", message);
		}
	}, []);

	const removeNotification = useCallback((id: number) => {
		setNotifications(prev => prev.filter(n => n.id !== id));
		sideBarNotification(countRef.current);
	}, []);

	const removeAllNotifications = useCallback(() => {
		setNotifications([]);
		setNotificationsCount(0);
		sideBarNotification(0);
	}, []);

	const fetchMissedNotifications = useCallback(async (limit = 50, offset = 0): Promise<number | undefined> => {
		try {
			const dbus = cockpit.dbus("org._45drives.Houston");
			const response = await dbus.call(
				"/org/_45drives/Houston",
				"org._45drives.Houston",
				"GetMissedNotifications",
				[limit, offset]
			);
			if (!response) throw new Error("No response received from Houston D-Bus.");

			const missedNotifications = JSON.parse(response);

			setNotifications(prev => {
				const newNotifs = missedNotifications.filter(
					(notification: any) => !prev.some(n => n.id === notification.id)
				);
				if (newNotifs.length === 0) return prev;
				return [...prev, ...newNotifs];
			});

			sideBarNotification(countRef.current);
			return missedNotifications.length;
		} catch (error) {
			console.error("Error fetching missed notifications via D-Bus:", error);
			return undefined;
		}
	}, []);

	const markNotificationAsRead = useCallback(async (notificationId: number): Promise<void> => {
		try {
			const dbus = cockpit.dbus("org._45drives.Houston");
			await dbus.call(
				"/org/_45drives/Houston",
				"org._45drives.Houston",
				"MarkNotificationAsRead",
				[notificationId]
			);

			setNotifications(prev => prev.filter(n => n.id !== notificationId));
			setNotificationsCount(c => {
				const next = Math.max(0, c - 1);
				sideBarNotification(next);
				return next;
			});
		} catch (error) {
			console.error("Error marking notification as read via D-Bus:", error);
		}
	}, []);

	const clearAllNotifications = useCallback(async (): Promise<void> => {
		try {
			const dbus = cockpit.dbus("org._45drives.Houston");
			await dbus.call(
				"/org/_45drives/Houston",
				"org._45drives.Houston",
				"MarkAllNotificationsAsRead"
			);

			setNotifications([]);
			sideBarNotification(0);
		} catch (error) {
			console.error("Error clearing notifications via D-Bus:", error);
		}
	}, []);

	const countMissedNotifications = useCallback(async (): Promise<number> => {
		try {
			const dbus = cockpit.dbus("org._45drives.Houston");
			const result = await dbus.call(
				"/org/_45drives/Houston",
				"org._45drives.Houston",
				"GetNotificationCount"
			);
			const count = result[0];
			setNotificationsCount(count);
			return parseInt(result);
		} catch (error) {
			console.error("Error counting notifications:", error);
			return 0;
		}
	}, []);

	return {
		notifications,
		notificationsCount,
		addNotification,
		removeNotification,
		removeAllNotifications,
		fetchMissedNotifications,
		markNotificationAsRead,
		clearAllNotifications,
		countMissedNotifications,
	};
}
