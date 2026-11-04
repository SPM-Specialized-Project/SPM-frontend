import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sandboxImageId, runSandbox } from '../sandbox.mjs';

const docker = promisify(execFile);

try {
  const { stdout } = await docker('docker', ['info', '--format', '{{json .}}'], { timeout: 10000 });
  const info = JSON.parse(stdout);
  if (info.OSType !== 'linux') throw new Error('Docker must use Linux containers.');
  if (String(info.CgroupVersion) !== '2') throw new Error('Sandbox requires cgroup v2.');
  const missingControllers = ['MemoryLimit', 'SwapLimit', 'PidsLimit', 'CpuCfsQuota', 'CpuCfsPeriod']
    .filter((name) => info[name] !== true);
  if (info.CgroupDriver === 'none' || missingControllers.length) {
    throw new Error(`Docker resource controllers must be enabled: ${missingControllers.join(', ') || 'cgroup driver'}.`);
  }
  const image = await sandboxImageId();
  if (!image) throw new Error('Sandbox image is missing. Run: docker build -t codepulse-sandbox:1 deploy/sandbox');
  const result = await runSandbox({ sandboxImage: image, runtime: 'PYTHON', sourceCode: 'import os; print(os.getuid()); print(input())',
    input: 'sandbox-ready', cpuTimeLimitMs: 1000, wallTimeLimitMs: 2250, memoryLimitMb: 128 });
  if (result.status !== 'SUCCESS' || result.stdout !== '65534\nsandbox-ready\n') {
    throw new Error(`Sandbox smoke test failed: ${result.status}. Check Docker permissions, runtime and cgroup controllers.`);
  }
  console.log(`Sandbox ready: host=${process.platform}, node=${process.version}, uid=${process.getuid?.() ?? 'Windows'}, cgroup=2, image=${image}, studentUid=65534`);
} catch (error) {
  console.error(`Sandbox preflight failed: ${error.message}`);
  console.error('Run this command as the backend service account (Debian: sudo -u spm -H node backend/scripts/check-sandbox.mjs).');
  process.exitCode = 1;
}
