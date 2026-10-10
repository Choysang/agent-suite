// The agents handoff knows. One row per agent drives both transcript reading (wire.ts) and installation (install.ts).
// Adding an agent = one row here + one TranscriptSource adapter + one fixture.

import { homedir } from 'node:os';
import { join } from 'node:path';

export type Transcripts = 'claude' | 'codex' | 'codebuddy';

export interface Agent {
  readonly name: string;
  /** Config home: env override, else the default under the user's home. */
  readonly home: string;
  readonly transcripts: Transcripts;
  /** Transcript root relative to home. */
  readonly sessions: string;
  /** Hook registration file relative to home, and its format. */
  readonly settings: { readonly file: string; readonly format: 'json' | 'toml' };
}

export function agents(env: NodeJS.ProcessEnv = process.env, home = homedir()): Agent[] {
  const at = (key: string, dir: string) => env[key]?.trim() || join(home, dir);
  return [
    { name: 'claude-code', home: at('CLAUDE_CONFIG_DIR', '.claude'), transcripts: 'claude', sessions: 'projects', settings: { file: 'settings.json', format: 'json' } },
    { name: 'codex', home: at('CODEX_HOME', '.codex'), transcripts: 'codex', sessions: 'sessions', settings: { file: 'config.toml', format: 'toml' } },
    { name: 'workbuddy', home: at('WORKBUDDY_CONFIG_DIR', '.workbuddy-ai'), transcripts: 'codebuddy', sessions: 'projects', settings: { file: 'settings.json', format: 'json' } },
    { name: 'codebuddy', home: at('CODEBUDDY_CONFIG_DIR', '.codebuddy'), transcripts: 'codebuddy', sessions: 'projects', settings: { file: 'settings.json', format: 'json' } },
  ];
}

/** Which agent is running us, from the variables each harness exports. Innermost harness first. */
export function caller(env: NodeJS.ProcessEnv = process.env): string | null {
  const keys = Object.keys(env);
  if (keys.some(k => k.startsWith('WORKBUDDY_'))) return 'workbuddy';
  if (keys.some(k => k.startsWith('CODEBUDDY_'))) return 'codebuddy';
  if (keys.some(k => k.startsWith('CODEX_'))) return 'codex';
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return 'claude-code';
  return null;
}
