// Run only in the disposable harness documented in docs/staging-deploy-debian.md.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { giteaRequest, readEnvironmentValue } from '../actions/deployment-lib.mjs';

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
const api = 'http://127.0.0.1:8211/api/v1';
mkdirSync(root, { recursive: true });
writeFileSync(base, readFileSync('/workspace/deploy/gitea/compose.yml.example', 'utf8')
  .replace(/^      - \/etc\/(?:timezone|localtime):.*\r?\n/gm, ''));
writeFileSync(root + '/.env', 'COMPOSE_PROJECT_NAME=' + project + '\nPUBLIC_HOST=https://broken.trycloudflare.com\n'
  + 'GITEA_VERSION=1.27.3-rootless\nPOSTGRES_PASSWORD=' + randomBytes(24).toString('hex') + '\n');
execFileSync('chpasswd', { input: 'runner:integration-linux-password\n' });
writeFileSync('/etc/sudoers.d/spm-integration-runner', 'runner ALL=(root) ALL\n', { mode: 0o440 });
const wrapperCommand = (phase, deployment = 'staging', publicUrl = '') => {
  const outputFile = '/tmp/spm-output-' + deployment + '-' + randomUUID() + '.txt';
  writeFileSync(outputFile, '', { mode: 0o600 });
  execFileSync('chown', ['runner:runner', outputFile]);
  return {
    args: ['-u', 'runner', '--', process.execPath, '/workspace/deploy/actions/run-deployment-setup.mjs', phase],
    options: {
      encoding: 'utf8', timeout: 300_000, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, RUNNER_TEMP: '/tmp', GITEA_ADMIN_PASSWORD: 'integration-only-password',
        RUNNER_SUDO_PASSWORD: 'integration-linux-password', SPM_DEPLOY_ENVIRONMENT: deployment,
        SPM_DEPLOY_PUBLIC_URL: publicUrl, GITHUB_OUTPUT: outputFile },
    },
    outputFile,
  };
};
const wrapper = (phase, deployment, publicUrl) => {
  const { args, options, outputFile } = wrapperCommand(phase, deployment, publicUrl);
  try { process.stdout.write(execFileSync('runuser', args, options)); }
  catch (error) {
    process.stderr.write(error.stdout || '');
    process.stderr.write(error.stderr || '');
    throw new Error('Integration sudo wrapper failed: ' + phase + '/' + deployment);
  }
  return readFileSync(outputFile, 'utf8');
};
const parallelSetup = (deployment) => new Promise((resolve, reject) => {
  const { args, options } = wrapperCommand('setup', deployment);
  const child = spawn('runuser', args, options);
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('error', reject);
  child.on('close', (status) => status === 0 ? resolve() : reject(new Error(output)));
});
const compose = (...args) => docker('compose', '-p', project, '-f', base, ...args);
const inspect = (name) => JSON.parse(docker('inspect', name))[0];
const mounts = () => JSON.parse(docker('inspect', 'gitea', 'git-postgres')).flatMap((container) =>
  container.Mounts.filter((mount) => mount.Type === 'volume').map((mount) => mount.Name)).sort();
const environmentFile = (deployment) => '/etc/spm-frontend/' + (deployment === 'main' ? 'backend' : 'staging') + '.env';
const tokenFor = (deployment) => readEnvironmentValue(readFileSync(environmentFile(deployment), 'utf8'), 'GITEA_API_TOKEN');
const rootUrl = () => JSON.parse(readFileSync(override, 'utf8')).services.gitea.environment.GITEA__server__ROOT_URL;
let activeRuntime;
try {
  compose('up', '-d');
  const originalMounts = mounts();
  const originalDatabase = inspect('git-postgres').Id;
  wrapper('check');
  wrapper('setup');
  const stagingToken = tokenFor('staging');
  assert.match(stagingToken, /^[a-f0-9]{40}$/i);
  assert.match(docker('exec', 'gitea', 'cat', '/etc/gitea/app.ini'), /INSTALL_LOCK\s*=\s*true/);
  assert.equal(wrapper('public', 'staging', 'https://stage-one.trycloudflare.com'),
    'gitea_url=https://stage-one.trycloudflare.com/git/\n');
  const stagingEnvironment = readFileSync(environmentFile('staging'), 'utf8');

  writeFileSync(environmentFile('main'), '# preserve-main\nBACKEND_CORS_ORIGIN=https://existing-main.example\n');
  mkdirSync('/opt/spm-frontend/shared/data', { recursive: true });
  writeFileSync('/opt/spm-frontend/shared/data/preserve-test.txt', 'existing main data');
  wrapper('check', 'main');
  wrapper('setup', 'main');
  const mainToken = tokenFor('main');
  assert.notEqual(mainToken, stagingToken);
  const mainEnvironment = readFileSync(environmentFile('main'), 'utf8');
  assert.ok(mainEnvironment.includes('# preserve-main\nBACKEND_CORS_ORIGIN=https://existing-main.example'));
  assert.equal(readFileSync(environmentFile('staging'), 'utf8'), stagingEnvironment);
  assert.equal(readFileSync('/opt/spm-frontend/shared/data/preserve-test.txt', 'utf8'), 'existing main data');
  for (const [deployment, owner] of [['staging', 'codepulse-bot'], ['main', 'codepulse-bot-main']]) {
    assert.equal(readEnvironmentValue(readFileSync(environmentFile(deployment), 'utf8'), 'GITEA_OWNER'), owner);
    assert.equal(readEnvironmentValue(readFileSync(environmentFile(deployment), 'utf8'), 'GITEA_API_URL'), api);
    assert.equal(statSync(environmentFile(deployment)).mode & 0o777, 0o640);
    const token = tokenFor(deployment);
    const repo = await giteaRequest(api, token, '/user/repos', {
      method: 'POST', body: JSON.stringify({ name: 'same-assignment-id', private: true, auto_init: true }),
    });
    await giteaRequest(api, token, '/repos/' + owner + '/same-assignment-id/contents/snapshot.txt', {
      method: 'PUT', body: JSON.stringify({ branch: repo.default_branch, message: 'Environment snapshot',
        content: Buffer.from(deployment).toString('base64') }),
    });
  }
  await assert.rejects(giteaRequest(api, stagingToken, '/repos/codepulse-bot-main/same-assignment-id'), /404/);
  assert.equal(wrapper('public', 'main', 'https://main-one.trycloudflare.com'),
    'gitea_url=https://main-one.trycloudflare.com/git/\n');
  const mainContainer = inspect('gitea').Id;
  assert.equal(wrapper('public', 'staging', 'https://stage-two.trycloudflare.com'),
    'gitea_url=https://main-one.trycloudflare.com/git/\n');
  assert.equal(rootUrl(), 'https://main-one.trycloudflare.com/git/');
  assert.equal(inspect('gitea').Id, mainContainer, 'Staging must not recreate Gitea when main owns the public URL.');

  // Replacement of the persistent Node binary must work while the old inode executes.
  activeRuntime = spawn('/opt/spm-frontend/runtime/node', ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  await new Promise((resolve, reject) => { activeRuntime.once('spawn', resolve); activeRuntime.once('error', reject); });
  await Promise.all([parallelSetup('main'), parallelSetup('staging')]);
  assert.equal(tokenFor('main'), mainToken);
  assert.equal(tokenFor('staging'), stagingToken);
  assert.equal(rootUrl(), 'https://main-one.trycloudflare.com/git/');
  assert.equal(wrapper('public', 'main', 'https://main-two.trycloudflare.com'),
    'gitea_url=https://main-two.trycloudflare.com/git/\n');
  for (const [deployment, owner] of [['staging', 'codepulse-bot'], ['main', 'codepulse-bot-main']]) {
    const file = await giteaRequest(api, tokenFor(deployment), '/repos/' + owner + '/same-assignment-id/contents/snapshot.txt');
    assert.equal(Buffer.from(file.content, 'base64').toString(), deployment);
  }
  assert.equal(inspect('git-postgres').Id, originalDatabase, 'Both environments must use the existing database container.');
  assert.deepEqual(mounts(), originalMounts);
  assert.ok(readFileSync('/etc/systemd/system/spm-backend.service', 'utf8').includes('/opt/spm-frontend/runtime:'));
  assert.ok(readFileSync('/etc/systemd/system/spm-staging-backend.service', 'utf8').includes('/opt/spm-frontend-staging/runtime:'));
  console.log('PASS: shared Gitea/database, isolated repositories, preserved app settings/data, serialized setup, reused tokens and main-owned public URL.');
} finally {
  activeRuntime?.kill();
  // Delete volumes only for the unique, disposable project created above.
  docker('compose', '-p', project, '-f', base, ...(existsSync(override) ? ['-f', override] : []),
    'down', '--volumes', '--remove-orphans');
}
