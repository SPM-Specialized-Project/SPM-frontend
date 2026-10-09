import { spawn, spawnSync } from 'node:child_process';
import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configurationFromEnvironment, publicRootUrl } from './deployment-lib.mjs';

const phase = process.argv[2] || 'setup';
let temporary;
try {
  if (!['check', 'setup', 'public'].includes(phase)) throw new Error('Unknown deployment setup phase.');
  const config = configurationFromEnvironment({
    ...process.env,
    SPM_RUNNER_USER: os.userInfo().username,
  });
  if (phase === 'public') config.publicUrl = publicRootUrl(process.env.SPM_DEPLOY_PUBLIC_URL).replace(/git\/$/, '');
  const canSudo = spawnSync('sudo', ['-n', 'true'], { stdio: 'ignore' }).status === 0;
  const password = process.env.RUNNER_SUDO_PASSWORD;
  if (!canSudo && !password) {
    throw new Error('Set RUNNER_SUDO_PASSWORD in GitHub Actions secrets: this runner requires sudo authentication for deployment setup.');
  }
  if (password && /[\r\n\0]/.test(password)) throw new Error('RUNNER_SUDO_PASSWORD must contain a single line.');
  temporary = await mkdtemp(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'spm-deployment-setup-'));
  const configFile = path.join(temporary, 'configuration.json');
  await writeFile(configFile, JSON.stringify(config), { mode: 0o600 });
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'setup-deployment.mjs');
  const args = [...(canSudo ? ['-n'] : ['-S', '-p', '']), '--',
    ...(phase === 'check' ? ['true'] : ['flock', '--exclusive', '--timeout', '600',
      '/run/lock/spm-git-platform-deploy.lock', process.execPath, script, phase, configFile])];
  let output = '';
  const status = await new Promise((resolve, reject) => {
    const child = spawn('sudo', args, {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) =>
        !['RUNNER_SUDO_PASSWORD', 'GITEA_ADMIN_PASSWORD', 'POSTGRES_PASSWORD', 'GITEA_API_TOKEN'].includes(key))),
    });
    child.on('error', reject);
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); output += chunk.toString(); });
    child.on('close', resolve);
    child.stdin.on('error', () => {});
    child.stdin.end(canSudo ? '' : password + '\n');
  });
  if (status !== 0) throw new Error(config.deployment + ' ' + phase + ' failed. Check the preceding Actions error; sudo password must belong to the runner OS account.');
  if (phase === 'check') console.log(config.deployment + ' secrets and runner sudo authentication are valid.');
  if (phase === 'public' && process.env.GITHUB_OUTPUT) {
    const match = output.match(/^GITEA_PUBLIC_URL=(https:\/\/[a-z0-9-]+\.trycloudflare\.com\/git\/)$/m);
    if (!match) throw new Error('Gitea setup did not return its canonical public URL.');
    await appendFile(process.env.GITHUB_OUTPUT, 'gitea_url=' + match[1] + '\n');
  }
} catch (error) {
  console.error('::error::' + error.message);
  process.exitCode = 1;
} finally {
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
