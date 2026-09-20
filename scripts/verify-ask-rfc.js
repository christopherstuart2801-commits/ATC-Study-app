#!/usr/bin/env node
/** ESM package wrapper — real checks live in verify-ask-rfc.cjs */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const cjs = path.join(path.dirname(fileURLToPath(import.meta.url)), 'verify-ask-rfc.cjs');
const r = spawnSync(process.execPath, [cjs], { stdio: 'inherit' });
process.exit(r.status ?? 1);
