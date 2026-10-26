import { readFileSync } from 'node:fs';
import { PROTOCOL } from '../core/types.ts';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
export const VERSION = pkg.version;
export const versionInfo = { name: 'handoff', version: VERSION, protocol: PROTOCOL } as const;
