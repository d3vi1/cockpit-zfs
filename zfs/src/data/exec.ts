/**
 * Cockpit command execution wrapper — framework-agnostic (no React, no Vue).
 *
 * Provides exec() for running arbitrary commands via houston-common-lib
 * and runPythonScript() for the common `/usr/bin/env python3 -c <script>` pattern.
 */

import { Command, legacy, server, unwrap } from '@45drives/houston-common-lib';

const { errorString, useSpawn } = legacy;

export type ExecOut = { stdout: string; stderr: string };

/**
 * Execute a command through houston-common-lib's `server.execute`.
 * Returns trimmed stdout and stderr.
 */
export async function exec(cmd: string[]): Promise<ExecOut> {
	const res = await unwrap(server.execute(new Command(cmd, { superuser: 'try' })));
	return {
		stdout: res.getStdout().trim(),
		stderr: res.getStderr().trim(),
	};
}

/**
 * Run a Python script passed as a raw string (imported via `?raw` suffix).
 * Returns trimmed stdout.
 *
 * @param script - Python source code (imported as raw string)
 * @param args   - Extra CLI arguments passed after the script
 * @param opts   - Optional spawn options (e.g. `{ superuser: 'try' }`)
 */
export async function runPythonScript(
	script: string,
	args: string[] = [],
	opts?: { superuser?: 'try' | 'require' }
): Promise<string> {
	const spawnOpts = opts?.superuser ? { superuser: opts.superuser } : { superuser: 'try' as const };
	const state = useSpawn(['/usr/bin/env', 'python3', '-c', script, ...args], spawnOpts);
	const output = await state.promise();
	return (output.stdout ?? '').trim();
}

export { errorString };
