import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicRootUrl } from './deployment-lib.mjs';

const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const phase = process.argv[2];
const deployment = process.env.SPM_DEPLOY_ENVIRONMENT || 'staging';
const isStaging = deployment === 'staging';
const baseUrl = isStaging ? 'http://127.0.0.1:8080' : 'http://127.0.0.1';
const tunnelUnit = isStaging ? 'spm-staging-quick-tunnel.service' : 'spm-quick-tunnel.service';
const deployCommand = isStaging ? '/usr/local/sbin/spm-staging-deploy' : '/usr/local/sbin/spm-deploy';

function run(command, args, { cwd = workspace, env = process.env, timeout = 300_000, quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd, env, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const printOutput = !quiet || result.error || result.status !== 0;
  if (result.stdout && printOutput) process.stdout.write(result.stdout);
  if (result.stderr && printOutput) process.stderr.write(result.stderr);
  if (result.error) throw new Error(`${command} could not run: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}.`);
  return result.stdout || '';
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
  run('docker', ['info'], { quiet: true });
  run('docker', ['compose', 'version'], { quiet: true });
  run('cloudflared', ['--version'], { quiet: true });
}

function runSetup(step) {
  run(process.execPath, [path.join(repository, 'deploy/actions/run-deployment-setup.mjs'), step], {
    timeout: step === 'setup' ? 1_500_000 : 300_000,
  });
}

async function requestOk(url, attempts = 1) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} at ${url}`);
      if (new URL(response.url).protocol !== 'https:' && url.startsWith('https://')) {
        throw new Error(`Unexpected non-HTTPS redirect for ${url}`);
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError;
}

function appendOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error('GitHub Actions did not provide GITHUB_OUTPUT.');
  appendFileSync(output, `${name}=${value}\n`, 'utf8');
}

async function verifyLocal() {
  for (const route of ['/api/health', '/', '/git/', '/observation/grafana/api/health']) {
    await requestOk(baseUrl + route, route === '/observation/grafana/api/health' ? 30 : 10);
  }
  console.log(`Local ${deployment} services passed health checks at ${baseUrl}.`);
}

async function startTunnel() {
  const startedAt = new Date().toISOString();
  run('sudo', ['-n', 'systemctl', 'restart', tunnelUnit]);
  let publicUrl = '';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const log = run('sudo', ['-n', 'journalctl', '-u', tunnelUnit, '--since', startedAt,
      '--no-pager', '-n', '100'], { quiet: true });
    publicUrl = (log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g) || [])
      .filter((url) => url !== 'https://api.trycloudflare.com').at(-1) || '';
    if (publicUrl) break;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!publicUrl) {
    const log = run('sudo', ['-n', 'journalctl', '-u', tunnelUnit, '--no-pager', '-n', '100'], { quiet: true });
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
    await requestOk(origin + route, 30);
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
    run('docker', ['build', '-t', 'codepulse-sandbox:1', 'deploy/sandbox']);
  } else if (phase === 'tests') {
    assertWslHost();
    run('docker', ['build', '-t', 'codepulse-sandbox:1', 'deploy/sandbox']);
    run('npm', ['run', 'backend:test'], { timeout: 1_800_000 });
  } else if (phase === 'setup') {
    assertWslHost();
    runSetup('setup');
  } else if (phase === 'deploy') {
    assertWslHost();
    const releaseId = process.env.SPM_WSL_RELEASE_ID || '';
    if (!/^[A-Za-z0-9._-]+$/.test(releaseId)) throw new Error('Invalid release ID.');
    run('sudo', ['-n', deployCommand, workspace, releaseId], { timeout: 1_500_000 });
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
