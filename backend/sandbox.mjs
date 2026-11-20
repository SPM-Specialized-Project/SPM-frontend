import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export const internalError = () => ({ status: 'INTERNAL_ERROR', stdout: '',
  stderr: 'Sandbox unavailable or worker failed. Please retry later.', exitCode: null,
  runtimeMs: 0, memoryUsageKb: null, outputTruncated: false });

export function dockerArguments(name, image, memoryLimitMb = 128) {
  return ['run', '--name', name, '--pull=never', '--interactive', '--network=none',
    '--read-only', '--cap-drop=ALL', '--cap-add=SETUID', '--cap-add=SETGID', '--cap-add=KILL',
    '--security-opt=no-new-privileges', '--pids-limit=32', '--cpus=1',
    `--memory=${memoryLimitMb}m`, `--memory-swap=${memoryLimitMb}m`, '--log-driver=none',
    '--tmpfs=/work:rw,exec,nosuid,nodev,size=64m', '--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16m',
    ...(process.env.CODEPULSE_SANDBOX_RUNTIME ? ['--runtime', process.env.CODEPULSE_SANDBOX_RUNTIME] : []), image];
}

function command(args, input = '', timeout = 30000) {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let failed = false;
    const timer = setTimeout(() => { failed = true; child.kill(); }, timeout);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 512000) { failed = true; child.kill(); }
    });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(0, 32000); });
    child.stdin.on('error', () => {});
    child.once('error', () => { clearTimeout(timer); resolve({ failed: true }); });
    child.once('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, failed }); });
    child.stdin.end(input);
  });
}

async function runContainer(job) {
  const name = `codepulse-${job.executionId ?? randomUUID()}`;
  const image = job.sandboxImage || process.env.CODEPULSE_SANDBOX_IMAGE || 'codepulse-sandbox:1';
  try {
    const result = await command(dockerArguments(name, image, job.memoryLimitMb), JSON.stringify(job), 25000 + job.wallTimeLimitMs);
    const state = await command(['inspect', '--format', '{{json .State}}', name], '', 5000);
    if (state.failed || state.code !== 0) return internalError();
    const inspected = JSON.parse(state.stdout);
    if (inspected.OOMKilled) return { ...internalError(), status: 'MEMORY_LIMIT_EXCEEDED', stderr: 'Memory limit exceeded.' };
    if (result.failed || result.code !== 0) return internalError();
    return JSON.parse(result.stdout);
  } catch {
    return internalError();
  } finally {
    await command(['rm', '--force', name], '', 5000);
  }
}

const validVerdict = (verdict) => ['SUCCESS', 'COMPILE_ERROR', 'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED',
  'INTERNAL_ERROR'].includes(verdict?.status)
  && typeof verdict.stdout === 'string'
  && typeof verdict.stderr === 'string';

export async function runSandbox(job) {
  const verdict = await runContainer(job);
  return validVerdict(verdict) ? verdict : internalError();
}

export async function runSandboxBatch(job) {
  const verdict = await runContainer(job);
  if (verdict?.status === 'COMPILE_ERROR' && validVerdict(verdict)) return verdict;
  if (verdict?.status !== 'SUCCESS' || !Array.isArray(verdict.results)
    || verdict.results.length !== job.tests?.length
    || verdict.results.some((result) => !validVerdict(result))) return internalError();
  return verdict;
}

export async function removeExecutionContainer(id) {
  if (!/^execution-[a-f0-9-]+$/.test(id)) return;
  await command(['rm', '--force', `codepulse-${id}`], '', 5000);
}

export async function sandboxImageId() {
  const image = process.env.CODEPULSE_SANDBOX_IMAGE || 'codepulse-sandbox:1';
  const result = await command(['image', 'inspect', '--format', '{{.Id}}', image], '', 5000);
  return result.code === 0 && /^sha256:[a-f0-9]{64}$/.test(result.stdout?.trim())
    ? result.stdout.trim() : null;
}
