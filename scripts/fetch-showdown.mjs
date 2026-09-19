import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const config = readFileSync(resolve(root, 'configs/system.yml'), 'utf8');
const commit = config.match(/^\s+commit:\s+"([0-9a-f]{40})"\s*$/m)?.[1];
if (!commit) throw new Error('simulator commit missing from configs/system.yml');

const destination = resolve(root, 'vendor/pokemon-showdown');
if (!existsSync(destination)) {
  execFileSync('git', [
    'clone', '--filter=blob:none', '--no-checkout', '--depth', '1',
    'https://github.com/smogon/pokemon-showdown.git', destination,
  ], { stdio: 'inherit' });
}

execFileSync('git', ['-C', destination, 'fetch', '--depth', '1', 'origin', commit], { stdio: 'inherit' });
execFileSync('git', ['-C', destination, 'checkout', '--force', commit], { stdio: 'inherit' });
console.log(`Showdown checked out at ${commit}`);