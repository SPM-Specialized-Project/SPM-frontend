import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configurationFromEnvironment, publicRootUrl } from './staging-lib.mjs';

const phase = process.argv[2] || 'setup';
let temporary;
try {
  if (!['check', 'setup', 'public'].includes(phase)) throw new Error('Unknown staging setup phase.');
  const config = configurationFromEnvironment({
    ...process.env,
    SPM_RUNNER_USER: os.userInfo().username,
  });
  if (phase === 'public') config.publicUrl = publicRootUrl(process.env.SPM_STAGING_PUBLIC_URL).replace(/git\/$/, '');
  const canSudo = spawnSync('sudo', ['-n', 'true'], { stdio: 'ignore' }).status === 0;
  const password = process.env.RUNNER_SUDO_PASSWORD;
  if (!canSudo && !password) {
    throw new Error('Set RUNNER_SUDO_PASSWORD in GitHub Actions secrets: this runner requires sudo authentication for staging setup.');
  }
  if (password && /[\r\n\0]/.test(password)) throw new Error('RUNNER_SUDO_PASSWORD must contain a single line.');
  temporary = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'spm-staging-setup-'));
  const configFile = path.join(temporary, 'configuration.json');
  await writeFile(configFile, JSON.stringify(config), { mode: 0o600 });
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'setup-staging.mjs');
  const args = [...(canSudo ? ['-n'] : ['-S', '-p', '']), '--',
    ...(phase === 'check' ? ['true'] : [process.execPath, script, phase, configFile])];
  const status = await new Promise((resolve, reject) => {
    const child = spawn('sudo', args, {
      stdio: ['pipe', 'inherit', 'inherit'],
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) =>
        !['RUNNER_SUDO_PASSWORD', 'GITEA_ADMIN_PASSWORD', 'POSTGRES_PASSWORD', 'GITEA_API_TOKEN'].includes(key))),
    });
    child.on('error', reject);
    child.on('close', resolve);
    child.stdin.on('error', () => {});
    child.stdin.end(canSudo ? '' : password + '\n');
  });
  if (status !== 0) throw new Error('Staging ' + phase + ' failed. Check the preceding Actions error; sudo password must belong to the runner OS account.');
  if (phase === 'check') console.log('Staging secrets and runner sudo authentication are valid.');
} catch (error) {
  console.error('::error::' + error.message);
  process.exitCode = 1;
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
