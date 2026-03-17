/**
 * Permission check hook — React hook wrapping auth/capabilities.ts.
 * Also exports getUserCaps() as a standalone function.
 */

import { useState, useEffect } from 'react';

const cockpit: any = (globalThis as any).cockpit;

const ADMIN_GROUPS = ["wheel", "sudo", "admin"];

// Helper: wait for the permission object to resolve its initial state
function waitForPermission(perm: any): Promise<void> {
	return new Promise(resolve => {
		if (typeof perm.allowed !== "undefined") {
			resolve();
			return;
		}
		const onChanged = () => {
			perm.removeEventListener?.("changed", onChanged);
			resolve();
		};
		perm.addEventListener?.("changed", onChanged);
		setTimeout(resolve, 0);
	});
}

/**
 * Get user capabilities from Cockpit — standalone async function.
 */
export async function getUserCaps() {
	const user = await cockpit.user();
	const perm = cockpit.permission({ admin: true });
	await waitForPermission(perm);

	const groups: string[] = Array.isArray(user.groups) ? user.groups : [];
	const isRoot = user.name === "root" || user.id === 0;

	const isAdminByPermission = !!perm.allowed;
	const isAdminByGroup = groups.some((g: string) => ADMIN_GROUPS.includes(g));

	return {
		username: user.name as string,
		uid: user.id as number,
		groups,
		isRoot,
		isAdminGroup: isAdminByPermission || isAdminByGroup,
	};
}

/**
 * React hook for checking user permissions.
 * Returns { canDestructive, loading }.
 */
export function usePermissions() {
	const [canDestructive, setCanDestructive] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		getUserCaps()
			.then(caps => {
				if (!cancelled) {
					setCanDestructive(caps.isRoot || caps.isAdminGroup);
					setLoading(false);
				}
			})
			.catch(err => {
				console.error("Failed to get user capabilities:", err);
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	return { canDestructive, loading };
}
