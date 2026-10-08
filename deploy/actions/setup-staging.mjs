import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertVolumeContinuity, composeOverride, configurationFromEnvironment, giteaRequest,
  parseUsers, publicRootUrl, readEnvironmentValue, selectDatabasePassword,
  updateEnvironment, verifyRepositoryWrites,
} from './staging-lib.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stack = '/srv/git-platform';
const baseFile = stack + '/compose.yml';
const overrideFile = stack + '/actions.override.json';
const stateFile = stack + '/actions-state.json';
const backendEnvironment = '/etc/spm-frontend/staging.env';
const apiUrl = 'http://127.0.0.1:8211/api/v1';
const redactions = new Set();
const redact = (value) => {
  let output = String(value || '');
  for (const secret of redactions) if (secret) output = output.replaceAll(secret, '[REDACTED]');
  return output.replace(/\b[a-f0-9]{40}\b/gi, '[REDACTED]');
};
function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: repo, encoding: 'utf8', timeout: 300_000, maxBuffer: 5 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'], ...options,
    });
  } catch (error) {
    throw new Error(command + ' failed (' + (error.status ?? error.code) + '): ' + redact(error.stderr || error.stdout));
  }
}
function atomicWrite(file, content, mode = 0o600) {
  const temporary = file + '.tmp-' + randomUUID();
  writeFileSync(temporary, content, { mode });
  chmodSync(temporary, mode);
  renameSync(temporary, file);
}
function inspect(name) {
  const result = execFileSync('docker', ['container', 'ls', '-a', '--filter', 'name=^/' + name + '$', '--format', '{{.ID}}'], { encoding: 'utf8' }).trim();
  return result ? JSON.parse(run('docker', ['inspect', result]))[0] : null;
}
async function waitForVersion() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(apiUrl + '/version', { signal: AbortSignal.timeout(2000) });
      if (response.ok && (await response.json()).version) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Gitea API did not become ready. Inspect the Gitea container logs in Actions.');
}

async function setup(config) {
  run('docker', ['info']);
  run('docker', ['compose', 'version']);
  const containers = { postgres: inspect('git-postgres'), gitea: inspect('gitea') };
  if (containers.gitea && !containers.gitea.Config.Image.endsWith('-rootless')) {
    throw new Error('This setup expects the existing rootless Gitea stack; refusing to change image layout.');
  }
  const previousPassword = containers.postgres?.Config.Env?.find((entry) => entry.startsWith('POSTGRES_PASSWORD='))?.slice(18);
  const databasePassword = selectDatabasePassword(previousPassword, config.postgresPassword, () => randomBytes(32).toString('hex'));
  redactions.add(databasePassword);
  const project = containers.gitea?.Config.Labels?.['com.docker.compose.project']
    || containers.postgres?.Config.Labels?.['com.docker.compose.project'] || 'git-platform';
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) throw new Error('Invalid existing Docker Compose project name.');
  const installed = containers.gitea?.State.Running
    && /INSTALL_LOCK\s*=\s*true/i.test(run('docker', ['exec', 'gitea', 'sh', '-c',
      'grep -E "^[[:space:]]*INSTALL_LOCK[[:space:]]*=" /etc/gitea/app.ini || true']));

  mkdirSync(stack, { recursive: true, mode: 0o750 });
  if (!existsSync(baseFile)) copyFileSync(path.join(repo, 'deploy/gitea/compose.yml.example'), baseFile);
  if (!existsSync(stack + '/.env')) {
    atomicWrite(stack + '/.env', "PUBLIC_HOST=127.0.0.1\nGITEA_VERSION=1.27.3-rootless\nPOSTGRES_PASSWORD='"
      + databasePassword.replace(/'/g, "\\'") + "'\n");
  }
  const priorOverride = existsSync(overrideFile) ? JSON.parse(readFileSync(overrideFile, 'utf8')) : null;
  const rootUrl = priorOverride?.services?.gitea?.environment?.GITEA__server__ROOT_URL || 'http://127.0.0.1:8211/';
  atomicWrite(overrideFile, JSON.stringify(composeOverride(databasePassword, rootUrl), null, 2) + '\n');
  const composeArgs = ['compose', '-p', project, '-f', baseFile, '-f', overrideFile];
  const compose = (...args) => run('docker', [...composeArgs, ...args]);
  const model = JSON.parse(compose('config', '--format', 'json'));
  assertVolumeContinuity(containers, model);
  if (containers.gitea && model.services.gitea.image !== containers.gitea.Config.Image) {
    throw new Error('Keep GITEA_VERSION consistent with the existing Gitea image; this setup does not perform an image upgrade.');
  }

  // The installer is idempotent and preserves existing backend environment/data.
  const havePackages = ['nginx', 'rsync', 'curl'].every((command) => {
    try { run('sh', ['-c', 'command -v "$1"', 'sh', command]); return true; } catch { return false; }
  });
  run('bash', ['deploy/install-staging-local.sh'], {
    env: { ...process.env, RUNNER_USER: config.runnerUser, SPM_SKIP_PACKAGE_INSTALL: havePackages ? '1' : '0' },
  });
  const runtimeDirectory = '/opt/spm-frontend-staging/runtime';
  mkdirSync(runtimeDirectory, { recursive: true, mode: 0o755 });
  const runtimeTemporary = runtimeDirectory + '/node.tmp-' + randomUUID();
  copyFileSync(process.execPath, runtimeTemporary);
  chmodSync(runtimeTemporary, 0o755);
  renameSync(runtimeTemporary, runtimeDirectory + '/node');
  const backendUnit = '/etc/systemd/system/spm-staging-backend.service';
  atomicWrite(backendUnit, readFileSync(backendUnit, 'utf8')
    .replace('Environment=PATH=', 'Environment=PATH=' + runtimeDirectory + ':'), 0o644);
  const dockerPath = run('sh', ['-c', 'command -v docker']).trim();
  const composeCommand = dockerPath + ' compose -p ' + project + ' -f ' + baseFile + ' -f ' + overrideFile;
  const stackUnit = readFileSync(path.join(repo, 'deploy/systemd/gitea-stack.service.example'), 'utf8')
    .replaceAll('__GITEA_COMPOSE_ROOT__', stack).replaceAll('__DOCKER_PATH__', dockerPath)
    .replace(dockerPath + ' compose -f ' + baseFile, composeCommand)
    .replace(dockerPath + ' compose -f ' + baseFile, composeCommand);
  atomicWrite('/etc/systemd/system/gitea-stack.service', stackUnit, 0o644);
  run('systemctl', ['daemon-reload']);
  run('systemctl', ['enable', 'docker', 'gitea-stack.service']);
  compose('up', '-d', '--wait', 'postgres', 'redis');
  if (!installed) {
    compose('stop', 'gitea');
    compose('run', '--rm', '--no-deps', '-T', 'gitea', 'gitea', '--config', '/etc/gitea/app.ini', 'migrate');
  } else {
    compose('up', '-d', '--no-deps', 'gitea');
    await waitForVersion();
  }
  const cli = (args, options) => installed
    ? run('docker', ['exec', ...(options?.input ? ['-i'] : []), 'gitea', ...args], options)
    : run('docker', [...composeArgs, 'run', '--rm', '--no-deps', '-T', 'gitea', ...args], options);
  const users = parseUsers(cli(['gitea', '--config', '/etc/gitea/app.ini', 'admin', 'user', 'list']));
  const admin = users.find((user) => user.name.toLowerCase() === config.adminUser.toLowerCase());
  if (admin && (!admin.admin || !admin.active)) throw new Error('GITEA_ADMIN_USERNAME already exists without an active admin role.');
  if (!admin) {
    cli(['sh', '-c',
      'IFS= read -r account_password; exec gitea --config /etc/gitea/app.ini admin user create --username "$1" --email "$2" --password "$account_password" --admin --must-change-password=false',
      'sh', config.adminUser, config.adminEmail], { input: config.adminPassword + '\n' });
  }
  const owner = users.find((user) => user.name.toLowerCase() === config.owner.toLowerCase());
  if (owner && (owner.admin || !owner.active)) throw new Error('GITEA_OWNER must be an active non-admin service account.');
  if (!owner) {
    const servicePassword = randomBytes(32).toString('hex');
    redactions.add(servicePassword);
    cli(['sh', '-c',
      'IFS= read -r account_password; exec gitea --config /etc/gitea/app.ini admin user create --username "$1" --email "$2" --password "$account_password" --must-change-password=false',
      'sh', config.owner, config.owner + '@example.com'], { input: servicePassword + '\n' });
  }

  compose('up', '-d', '--no-deps', 'gitea');
  await waitForVersion();
  const existingEnvironment = readFileSync(backendEnvironment, 'utf8');
  let token = config.apiToken || (readEnvironmentValue(existingEnvironment, 'GITEA_OWNER') === config.owner
    ? readEnvironmentValue(existingEnvironment, 'GITEA_API_TOKEN') : '');
  if (token) redactions.add(token);
  if (!config.apiToken && token) {
    try {
      const identity = await giteaRequest(apiUrl, token, '/user');
      if (identity.login?.toLowerCase() !== config.owner.toLowerCase() || identity.is_admin) token = '';
    } catch { token = ''; }
  }
  if (!token) {
    const result = run('docker', ['exec', 'gitea', 'gitea', '--config', '/etc/gitea/app.ini', 'admin', 'user',
      'generate-access-token', '--username', config.owner, '--token-name', 'spm-staging-' + randomUUID(),
      '--scopes', 'write:repository,write:user', '--raw']);
    token = result.split(/\r?\n/).findLast((line) => /^[a-f0-9]{40}$/i.test(line.trim()))?.trim();
    if (!token) throw new Error('Gitea did not return an access token.');
    redactions.add(token);
  }
  await verifyRepositoryWrites(apiUrl, token, config.owner);
  atomicWrite(backendEnvironment, updateEnvironment(existingEnvironment, {
    GITEA_API_URL: apiUrl, GITEA_OWNER: config.owner, GITEA_API_TOKEN: token,
  }), 0o640);
  run('chown', ['root:spm', backendEnvironment]);
  atomicWrite(stateFile, JSON.stringify({ project }) + '\n');
  // Start the persistent oneshot unit after initialization to mark it active.
  run('systemctl', ['start', 'gitea-stack.service']);
  console.log('Gitea initialized; private repository, branch and file create/update checks passed.');
  console.log('Backend Gitea configuration saved with root:spm ownership and mode 0640.');
}

async function configurePublic(config) {
  const rootUrl = publicRootUrl(config.publicUrl);
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(state.project)) throw new Error('Invalid managed Compose project.');
  const override = JSON.parse(readFileSync(overrideFile, 'utf8'));
  Object.assign(override.services.gitea.environment, {
    GITEA__server__DOMAIN: new URL(rootUrl).hostname,
    GITEA__server__SSH_DOMAIN: new URL(rootUrl).hostname,
    GITEA__server__ROOT_URL: rootUrl,
  });
  atomicWrite(overrideFile, JSON.stringify(override, null, 2) + '\n');
  run('docker', ['compose', '-p', state.project, '-f', baseFile, '-f', overrideFile, 'up', '-d', '--no-deps', 'gitea']);
  await waitForVersion();
  console.log('Gitea public URL configured: ' + rootUrl);
}

try {
  if (process.platform !== 'linux' || process.getuid() !== 0) throw new Error('Staging setup must run as root on the Linux runner.');
  const [phase, file] = process.argv.slice(2);
  const input = JSON.parse(readFileSync(file, 'utf8'));
  const config = configurationFromEnvironment({
    GITEA_ADMIN_USERNAME: input.adminUser, GITEA_ADMIN_EMAIL: input.adminEmail,
    GITEA_ADMIN_PASSWORD: input.adminPassword, GITEA_OWNER: input.owner,
    POSTGRES_PASSWORD: input.postgresPassword, GITEA_API_TOKEN: input.apiToken,
    SPM_RUNNER_USER: input.runnerUser,
  });
  for (const secret of [config.adminPassword, config.postgresPassword, config.apiToken]) redactions.add(secret);
  if (phase === 'setup') await setup(config);
  else if (phase === 'public') await configurePublic({ ...config, publicUrl: input.publicUrl });
  else throw new Error('Unknown setup phase.');
} catch (error) {
  console.error('::error::' + redact(error.message));
  process.exitCode = 1;
}
