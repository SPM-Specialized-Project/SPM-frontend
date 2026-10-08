// Run only in the disposable harness documented in docs/staging-deploy-debian.md.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { giteaRequest, readEnvironmentValue } from '../actions/staging-lib.mjs';

assert.equal(process.platform, 'linux');
assert.equal(process.getuid(), 0);
assert.equal(process.env.SPM_DISPOSABLE_INTEGRATION, '1', 'Run only inside the disposable integration container.');
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 300_000 });
for (const name of ['gitea', 'git-postgres', 'git-redis']) {
  assert.equal(docker('container', 'ls', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.ID}}').trim(), '',
    'Refusing to touch an existing container: ' + name);
}
const project = 'spm-gitea-integration-' + Date.now();
const root = '/srv/git-platform';
const base = root + '/compose.yml';
const override = root + '/actions.override.json';
mkdirSync(root, { recursive: true });
writeFileSync(base, readFileSync('/workspace/deploy/gitea/compose.yml.example', 'utf8')
  .replace(/^      - \/etc\/(?:timezone|localtime):.*\r?\n/gm, ''));
writeFileSync(root + '/.env', 'COMPOSE_PROJECT_NAME=' + project + '\nPUBLIC_HOST=https://broken.trycloudflare.com\n'
  + 'GITEA_VERSION=1.27.3-rootless\nPOSTGRES_PASSWORD=' + randomBytes(24).toString('hex') + '\n');
const config = { adminUser: 'spm-admin', adminEmail: 'spm-admin@example.com', adminPassword: 'integration-only-password',
  owner: 'codepulse-bot', postgresPassword: '', apiToken: '', runnerUser: 'runner' };
const configFile = '/tmp/spm-integration.json';
writeFileSync(configFile, JSON.stringify(config), { mode: 0o600 });
execFileSync('chpasswd', { input: 'runner:integration-linux-password\n' });
writeFileSync('/etc/sudoers.d/spm-integration-runner', 'runner ALL=(root) ALL\n', { mode: 0o440 });
const wrapper = (phase) => {
  try {
    process.stdout.write(execFileSync('runuser', ['-u', 'runner', '--', process.execPath,
      '/workspace/deploy/actions/run-staging-setup.mjs', phase], {
      encoding: 'utf8', timeout: 300_000, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, RUNNER_TEMP: '/tmp', GITEA_ADMIN_PASSWORD: config.adminPassword,
        RUNNER_SUDO_PASSWORD: 'integration-linux-password' },
    }));
  } catch (error) {
    process.stderr.write(error.stdout || '');
    process.stderr.write(error.stderr || '');
    throw new Error('Integration sudo wrapper failed: ' + phase);
  }
};
const setup = (phase) => {
  try {
    process.stdout.write(execFileSync(process.execPath, ['/workspace/deploy/actions/setup-staging.mjs', phase, configFile],
      { encoding: 'utf8', timeout: 300_000, stdio: ['pipe', 'pipe', 'pipe'] }));
  } catch (error) {
    process.stderr.write(error.stdout || '');
    process.stderr.write(error.stderr || '');
    throw new Error('Integration setup failed: ' + phase);
  }
};
const compose = (...args) => docker('compose', '-p', project, '-f', base, ...args);
const mounts = () => JSON.parse(docker('inspect', 'gitea', 'git-postgres')).flatMap((container) =>
  container.Mounts.filter((mount) => mount.Type === 'volume').map((mount) => mount.Name)).sort();
try {
  compose('up', '-d');
  const originalMounts = mounts();
  wrapper('check');
  wrapper('setup');
  const env = readFileSync('/etc/spm-frontend/staging.env', 'utf8');
  const token = readEnvironmentValue(env, 'GITEA_API_TOKEN');
  assert.match(token, /^[a-f0-9]{40}$/i);
  assert.equal(readEnvironmentValue(env, 'GITEA_API_URL'), 'http://127.0.0.1:8211/api/v1');
  assert.match(docker('exec', 'gitea', 'cat', '/etc/gitea/app.ini'), /INSTALL_LOCK\s*=\s*true/);
  assert.deepEqual(mounts(), originalMounts);
  wrapper('setup');
  assert.equal(readEnvironmentValue(readFileSync('/etc/spm-frontend/staging.env', 'utf8'), 'GITEA_API_TOKEN'), token);
  assert.deepEqual(mounts(), originalMounts);
  await giteaRequest('http://127.0.0.1:8211/api/v1', token, '/user/repos', {
    method: 'POST', body: JSON.stringify({ name: 'preserved-after-public-url', private: true, auto_init: true }),
  });
  writeFileSync(configFile, JSON.stringify({ ...config, publicUrl: 'https://integration-check.trycloudflare.com' }), { mode: 0o600 });
  setup('public');
  assert.match(docker('exec', 'gitea', 'cat', '/etc/gitea/app.ini'),
    /ROOT_URL\s*=\s*https:\/\/integration-check\.trycloudflare\.com\/git\//);
  assert.equal((await giteaRequest('http://127.0.0.1:8211/api/v1', token,
    '/repos/codepulse-bot/preserved-after-public-url')).private, true);
  assert.deepEqual(mounts(), originalMounts);
  console.log('PASS: uninstalled Gitea recovery, real repository writes, repeat setup/token reuse and public URL update preserve data.');
} finally {
  // Delete volumes only for the unique, disposable project created above.
  docker('compose', '-p', project, '-f', base, ...(existsSync(override) ? ['-f', override] : []),
    'down', '--volumes', '--remove-orphans');
}
