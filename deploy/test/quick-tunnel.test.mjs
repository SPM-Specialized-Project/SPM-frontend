import assert from 'node:assert/strict';
import test from 'node:test';
import { startQuickTunnel } from '../actions/quick-tunnel.mjs';

test('waits for the tunnel restart and parses journalctl output before publishing the URL', async () => {
  const calls = [];
  const outputs = [];
  const tunnelUnit = 'spm-staging-quick-tunnel.service';
  const publicUrl = 'https://staging-example.trycloudflare.com';

  const result = await startQuickTunnel({
    tunnelUnit,
    now: () => '2026-11-16T00:00:00.000Z',
    runWithRetry: async (command, args) => {
      calls.push({ command, args });
      if (args[1] === 'restart') return '';
      return `INF Quick Tunnel connection established at ${publicUrl}\n`;
    },
    appendOutput: (...values) => outputs.push(values),
    wait: async () => assert.fail('the Quick Tunnel URL should be available on the first journal read'),
  });

  assert.equal(result, publicUrl);
  assert.deepEqual(calls, [
    { command: 'sudo', args: ['-n', 'systemctl', 'restart', tunnelUnit] },
    { command: 'sudo', args: ['-n', 'journalctl', '-u', tunnelUnit, '--since', '2026-11-16T00:00:00.000Z',
      '--no-pager', '-n', '100'] },
  ]);
  assert.deepEqual(outputs, [['public_url', publicUrl]]);
});

test('rejects non-string journal output with a direct diagnostic', async () => {
  await assert.rejects(() => startQuickTunnel({
    tunnelUnit: 'spm-staging-quick-tunnel.service',
    runWithRetry: async (_command, args) => (args[1] === 'restart' ? '' : { stdout: '' }),
    appendOutput: () => assert.fail('no URL should be published'),
    wait: async () => {},
  }), /journalctl output must be a string/);
});
