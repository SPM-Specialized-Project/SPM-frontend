import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicRootUrl } from './deployment-lib.mjs';
import { retry } from './retry.mjs';

const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const phase = process.argv[2];
const deployment = process.env.SPM_DEPLOY_ENVIRONMENT || 'staging';
const isStaging = deployment === 'staging';
const baseUrl = isStaging ? 'http://127.0.0.1:18080' : 'http://127.0.0.1';
const tunnelUnit = isStaging ? 'spm-staging-quick-tunnel.service' : 'spm-quick-tunnel.service';
const deployCommand = isStaging ? '/usr/local/sbin/spm-staging-deploy' : '/usr/local/sbin/spm-deploy';
const buildxVersion = 'v0.39.0';
const buildxAssets = {
  x64: {
    name: 'linux-amd64',
    sha256: '5fb31a097304fbf6dd4038649a0decf32c2b9510e4047acd7d68b9d700c46194',
  },
  arm64: {
    name: 'linux-arm64',
    sha256: '722cdcdfdd6f3fb943fa1ba75102d057feb18ba72aab93b1b0a8cf2b2b48a25f',
  },
};

function run(command, args, { cwd = workspace, env = process.env, timeout = 300_000, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd, env, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const printOutput = !quiet || result.error || result.status !== 0;
  if (result.stdout && printOutput) process.stdout.write(result.stdout);
  if (result.stderr && printOutput) process.stderr.write(result.stderr);
  if (result.error) {
    const error = new Error(`${command} could not run: ${result.error.message}`);
    error.spawnCode = result.error.code;
    throw error;
  }
  if (result.status !== 0) {
    const error = new Error(`${command} failed with exit code ${result.status ?? 'unknown'}.`);
    error.exitCode = result.status;
    throw error;
  }
  return result.stdout || '';
}

function runWithRetry(command, args, options = {}) {
  const {
    retryAttempts = 3,
    retryDelayMs = 1_000,
    maxRetryDelayMs = 8_000,
    shouldRetry = (error) => error.spawnCode !== 'ETIMEDOUT',
    ...runOptions
  } = options;
  return retry(() => run(command, args, runOptions), {
    attempts: retryAttempts,
    initialDelayMs: retryDelayMs,
    maxDelayMs: maxRetryDelayMs,
    shouldRetry,
    onRetry: (error, attempt, delayMs) => {
      console.warn(`${command} failed (${error.message}); retrying in ${delayMs} ms (${attempt}/${retryAttempts}).`);
    },
  });
}

function ensureDockerBuildx() {
  const existing = spawnSync('docker', ['buildx', 'version'], {
    encoding: 'utf8', timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  if (existing.status === 0) return;
  if (existing.error && existing.error.code !== 'ENOENT') {
    throw new Error(`Docker Buildx check failed: ${existing.error.message}`);
  }
  if (existing.error?.code === 'ENOENT') {
    throw new Error('Docker CLI is unavailable while checking for Buildx.');
  }

  const asset = buildxAssets[process.arch];
  if (!asset) throw new Error(`Docker Buildx ${buildxVersion} is not configured for ${process.arch}.`);

  const downloadUrl = `https://github.com/docker/buildx/releases/download/${buildxVersion}/buildx-${buildxVersion}.${asset.name}`;
  const download = spawnSync('curl', ['--fail', '--silent', '--show-error', '--location',
    '--max-time', '90', downloadUrl], {
    encoding: null, timeout: 100_000, maxBuffer: 128 * 1024 * 1024,
  });
  if (download.error) throw new Error(`Docker Buildx download failed: ${download.error.message}`);
  if (download.status !== 0 || !download.stdout?.length) {
    throw new Error(`Docker Buildx download failed with curl exit code ${download.status ?? 'unknown'}.`);
  }

  const actualSha256 = createHash('sha256').update(download.stdout).digest('hex');
  if (actualSha256 !== asset.sha256) {
    throw new Error(`Docker Buildx checksum mismatch: expected ${asset.sha256}, got ${actualSha256}.`);
  }

  const pluginDirectory = path.join(os.homedir(), '.docker', 'cli-plugins');
  const pluginPath = path.join(pluginDirectory, 'docker-buildx');
  const temporaryPath = `${pluginPath}.${process.pid}.tmp`;
  mkdirSync(pluginDirectory, { recursive: true });
  try {
    writeFileSync(temporaryPath, download.stdout, { mode: 0o755 });
    chmodSync(temporaryPath, 0o755);
    renameSync(temporaryPath, pluginPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
  run('docker', ['buildx', 'version'], { timeout: 30_000 });
}

function assertWslHost() {
  if (process.platform !== 'linux' || !process.env.WSL_DISTRO_NAME) {
    throw new Error('This step must run inside the configured WSL2 distribution. Check SPM_WSL_DISTRO and the Windows runner account.');
  }
  if (!existsSync('/run/systemd/system') || readFileSync('/proc/1/comm', 'utf8').trim() !== 'systemd') {
    throw new Error('WSL2 systemd is not active. Enable systemd in /etc/wsl.conf, then restart the distribution.');
  }
  if (Number(process.versions.node.split('.')[0]) < 22) {
    throw new Error(`Node.js 22 or newer is required inside WSL2; found ${process.versions.node}.`);
  }
  runWithRetry('docker', ['info'], { quiet: true, timeout: 45_000 });
  runWithRetry('docker', ['compose', 'version'], { quiet: true, timeout: 45_000 });
  ensureDockerBuildx();
  runWithRetry('cloudflared', ['--version'], { quiet: true, timeout: 45_000 });
}

function runSetup(step) {
  run(process.execPath, [path.join(repository, 'deploy/actions/run-deployment-setup.mjs'), step], {
    timeout: step === 'setup' ? 1_500_000 : 300_000,
  });
}

async function requestOk(url, attempts = 8) {
  return retry(async () => {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} at ${url}`);
      error.retryable = [408, 429].includes(response.status) || response.status >= 500;
      throw error;
    }
    if (new URL(response.url).protocol !== 'https:' && url.startsWith('https://')) {
      const error = new Error(`Unexpected non-HTTPS redirect for ${url}`);
      error.retryable = false;
      throw error;
    }
  }, {
    attempts,
    initialDelayMs: 500,
    maxDelayMs: 4_000,
    shouldRetry: (error) => error.retryable !== false,
    onRetry: (error, attempt, delayMs) => {
      console.warn(`Health check failed (${error.message}); retrying in ${delayMs} ms (${attempt}/${attempts}).`);
    },
  });
}

function appendOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error('GitHub Actions did not provide GITHUB_OUTPUT.');
  appendFileSync(output, `${name}=${value}\n`, 'utf8');
}

async function verifyLocal() {
  for (const route of ['/api/health', '/', '/git/', '/observation/grafana/api/health']) {
    await requestOk(baseUrl + route, route === '/observation/grafana/api/health' ? 12 : 8);
  }
  console.log(`Local ${deployment} services passed health checks at ${baseUrl}.`);
}

async function startTunnel() {
  const startedAt = new Date().toISOString();
  runWithRetry('sudo', ['-n', 'systemctl', 'restart', tunnelUnit], {
    retryDelayMs: 2_000,
    maxRetryDelayMs: 8_000,
  });
  let publicUrl = '';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const log = runWithRetry('sudo', ['-n', 'journalctl', '-u', tunnelUnit, '--since', startedAt,
      '--no-pager', '-n', '100'], { quiet: true });
    publicUrl = (log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g) || [])
      .filter((url) => url !== 'https://api.trycloudflare.com').at(-1) || '';
    if (publicUrl) break;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!publicUrl) {
    const log = runWithRetry('sudo', ['-n', 'journalctl', '-u', tunnelUnit, '--no-pager', '-n', '100'], { quiet: true });
    process.stderr.write(log);
    throw new Error(`${tunnelUnit} did not return a Cloudflare Quick Tunnel URL.`);
  }
  publicRootUrl(publicUrl);
  appendOutput('public_url', publicUrl);
  console.log(`Public URL: ${publicUrl}`);
}

async function verifyPublic() {
  const origin = new URL(process.env.SPM_DEPLOY_PUBLIC_URL || '').origin;
  publicRootUrl(origin);
  for (const route of ['/', '/api/health', '/git', '/git/', '/git/api/v1/version',
    '/observation/grafana/api/health']) {
    await requestOk(origin + route, 10);
  }
  console.log(`Public ${deployment} application and Gitea passed HTTPS checks at ${origin}.`);
}

try {
  if (!['staging', 'main'].includes(deployment)) throw new Error('SPM_DEPLOY_ENVIRONMENT must be staging or main.');
  if (path.resolve(workspace) !== path.resolve(process.cwd())) {
    process.chdir(workspace);
  }
  if (phase === 'host-check') {
    assertWslHost();
    console.log(`WSL2 host is ready: ${process.env.WSL_DISTRO_NAME}.`);
  } else if (phase === 'check') {
    assertWslHost();
    runSetup('check');
  } else if (phase === 'build-sandbox') {
    assertWslHost();
    runWithRetry('docker', ['buildx', 'build', '--load', '-t', 'codepulse-sandbox:1', 'deploy/sandbox'], {
      timeout: 1_800_000,
      retryDelayMs: 2_000,
    });
  } else if (phase === 'tests') {
    assertWslHost();
    runWithRetry('docker', ['buildx', 'build', '--load', '-t', 'codepulse-sandbox:1', 'deploy/sandbox'], {
      timeout: 1_800_000,
      retryDelayMs: 2_000,
    });
    run('npm', ['run', 'backend:test'], { timeout: 1_800_000 });
  } else if (phase === 'setup') {
    assertWslHost();
    runSetup('setup');
  } else if (phase === 'deploy') {
    assertWslHost();
    const releaseId = process.env.SPM_WSL_RELEASE_ID || '';
    if (!/^[A-Za-z0-9._-]+$/.test(releaseId)) throw new Error('Invalid release ID.');
    await retry((attempt) => {
      const attemptReleaseId = attempt === 1 ? releaseId : `${releaseId}-retry-${attempt}`;
      return run('sudo', ['-n', deployCommand, workspace, attemptReleaseId], { timeout: 1_500_000 });
    }, {
      attempts: 3,
      initialDelayMs: 2_000,
      maxDelayMs: 8_000,
      shouldRetry: (error) => error.spawnCode !== 'ETIMEDOUT'
        && ![64, 66, 69, 78].includes(error.exitCode),
      onRetry: (error, attempt, delayMs) => {
        console.warn(`Deployment attempt ${attempt} failed (${error.message}); retrying with a fresh release ID in ${delayMs} ms.`);
      },
    });
  } else if (phase === 'verify-local') {
    assertWslHost();
    await verifyLocal();
  } else if (phase === 'tunnel') {
    assertWslHost();
    await startTunnel();
  } else if (phase === 'public') {
    assertWslHost();
    runSetup('public');
  } else if (phase === 'verify-public') {
    assertWslHost();
    await verifyPublic();
  } else {
    throw new Error('Unknown WSL deployment phase.');
  }
} catch (error) {
  console.error(`::error::${String(error.message).replace(/[\r\n]/g, ' ')}`);
  process.exitCode = 1;
}
