import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { dockerArguments, runSandbox } from '../sandbox.mjs';

const run = (sourceCode, options = {}) => runSandbox({ runtime: 'PYTHON', sourceCode, input: '',
  cpuTimeLimitMs: 1000, wallTimeLimitMs: 2250, memoryLimitMb: 128, ...options });

test('sandbox launch never mounts host paths or opens external network', () => {
  const args = dockerArguments('fixture', 'image', 128);
  for (const flag of ['--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=32', '--memory=128m', '--memory-swap=128m']) assert.ok(args.includes(flag));
  assert.equal(args.some((arg) => ['--privileged', '--volume', '--mount', '-v'].includes(arg)), false);
});

test('real Docker Python verdicts, CPU/wall/memory/output ceilings and isolation', async (t) => {
  const cases = [
    ['stdin', 'print(input())', 'SUCCESS', { input: 'Hello' }, (r) => assert.equal(r.stdout, 'Hello\n')],
    ['syntax', 'def broken(:', 'COMPILE_ERROR'],
    ['runtime', 'raise ValueError("student error")', 'RUNTIME_ERROR'],
    ['recursion', 'def f(): return f()\nf()', 'RUNTIME_ERROR'],
    ['CPU', 'while True: pass', 'TIME_LIMIT_EXCEEDED', { cpuTimeLimitMs: 200, wallTimeLimitMs: 650 }],
    ['wall time', 'import time; time.sleep(10)', 'TIME_LIMIT_EXCEEDED', { cpuTimeLimitMs: 200, wallTimeLimitMs: 650 }],
    ['memory', 'data = bytearray(512 * 1024 * 1024)', 'MEMORY_LIMIT_EXCEEDED'],
    ['output', 'print("x" * 100000)', 'OUTPUT_LIMIT_EXCEEDED', {}, (r) => { assert.ok(Buffer.byteLength(r.stdout) <= 32000); assert.equal(r.outputTruncated, true); }],
    ['network', 'import socket; socket.create_connection(("1.1.1.1", 80), 1)', 'RUNTIME_ERROR', {}, (r) => assert.match(r.stderr, /Network is unreachable|Permission denied/)],
    ['parent filesystem', 'print(open("/proc/1/root/etc/shadow").read())', 'RUNTIME_ERROR', {}, (r) => assert.match(r.stderr, /PermissionError/)],
    ['read-only filesystem', 'open("/etc/student-write", "w")', 'RUNTIME_ERROR', {}, (r) => assert.match(r.stderr, /Read-only file system|PermissionError/)],
    ['supervisor protection', 'import os,signal; os.kill(1, signal.SIGKILL)', 'RUNTIME_ERROR'],
  ];
  for (const [name, source, status, options, check] of cases) await t.test(name, async () => {
    const result = await run(source, options);
    assert.equal(result.status, status, JSON.stringify(result));
    check?.(result);
  });
});

test('real Docker C++ compilation and execution', async () => {
  const result = await run('#include <iostream>\nint main(){std::cout << "ok";}', { runtime: 'CPP', cpuTimeLimitMs: 1000 });
  assert.equal(result.status, 'SUCCESS', JSON.stringify(result));
  assert.equal(result.stdout, 'ok');
  assert.equal((await run('int main( {', { runtime: 'CPP' })).status, 'COMPILE_ERROR');
});

test('missing worker image reports infrastructure failure', async () => {
  assert.equal((await run('print("ok")', { sandboxImage: 'codepulse-missing-image:invalid' })).status, 'INTERNAL_ERROR');
});

test('an infrastructure-killed container is Internal Error rather than a student failure', async () => {
  const docker = promisify(execFile);
  const executionId = `execution-${randomUUID()}`;
  const name = `codepulse-${executionId}`;
  const completion = run('import time; time.sleep(10)', { executionId, cpuTimeLimitMs: 5000, wallTimeLimitMs: 11000 });
  let running = false;
  for (let poll = 0; poll < 100; poll++) {
    try {
      running = (await docker('docker', ['inspect', '--format', '{{.State.Running}}', name])).stdout.trim() === 'true';
      if (running) break;
    } catch { /* Container creation is asynchronous. */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(running, true);
  await docker('docker', ['kill', name]);
  assert.equal((await completion).status, 'INTERNAL_ERROR');
  await assert.rejects(docker('docker', ['inspect', name]));
});
