/**
 * Disk operations — plain async functions (no React hooks).
 * Ported from composables/disks.ts.
 */

import { legacy } from '@45drives/houston-common-lib';
import { exec, errorString } from '../data/exec';

// @ts-ignore
import script_py from "../scripts/get-disks.py?raw";

export async function getDisks(): Promise<string> {
	try {
		const { stdout, stderr } = await exec(["/usr/bin/env", "python3", "-u", "-c", script_py]);
		if (stderr) console.warn("getDisks warnings:", stderr);
		return stdout ?? "[]";
	} catch (err: any) {
		console.error("getDisks failed:", err);
		return JSON.stringify([]);
	}
}

export async function clearPartitions(disk: { name: string }) {
	try {
		const { stdout } = await exec(["wipefs", "-a", `/dev/${disk.name}`]);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function labelClear(disk: any) {
	try {
		const { stdout } = await exec(["zpool", "labelclear", disk.name]);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function attachDisk(diskVDevPoolData: {
	forceAttach?: boolean;
	poolName: string;
	existingDiskName: string;
	newDiskName: string;
}) {
	try {
		const cmd = ["zpool", "attach"];
		if (diskVDevPoolData.forceAttach) cmd.push("-f");
		cmd.push(
			diskVDevPoolData.poolName,
			diskVDevPoolData.existingDiskName,
			diskVDevPoolData.newDiskName
		);
		const { stdout } = await exec(cmd);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function detachDisk(poolName: string, diskName: string) {
	try {
		const { stdout } = await exec(["zpool", "detach", poolName, diskName]);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function offlineDisk(
	poolName: string,
	diskName: string,
	forceFault?: boolean,
	temporary?: boolean
) {
	try {
		const cmd = ["zpool", "offline"];
		if (forceFault) cmd.push("-f");
		if (temporary) cmd.push("-t");
		cmd.push(poolName, diskName);
		const { stdout } = await exec(cmd);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function onlineDisk(poolName: string, diskName: string, expand?: boolean) {
	try {
		const cmd = ["zpool", "online"];
		if (expand) cmd.push("-e");
		cmd.push(poolName, diskName);
		const { stdout } = await exec(cmd);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function replaceDisk(
	poolName: string,
	diskName: string,
	newDiskName: string,
	forceReplace?: boolean
) {
	try {
		const cmd = ["zpool", "replace"];
		if (forceReplace) cmd.push("-f");
		cmd.push(poolName, diskName, newDiskName);
		const { stdout } = await exec(cmd);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}

export async function trimDisk(
	poolName: string,
	diskName: string,
	isSecure?: boolean,
	action?: "pause" | "stop"
) {
	try {
		const cmd = ["zpool", "trim"];
		if (isSecure) cmd.push("-d");
		if (action === "pause") cmd.push("-s");
		if (action === "stop") cmd.push("-c");
		cmd.push(poolName, diskName);
		const { stdout } = await exec(cmd);
		return stdout;
	} catch (err: any) {
		const errorMessage = errorString(err);
		console.error(errorMessage);
		return { error: errorMessage };
	}
}
