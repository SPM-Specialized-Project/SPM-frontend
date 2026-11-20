import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultOllamaEndpoint, isWslRuntime, parseDefaultGateway } from '../ollama-endpoint.mjs';

const routeTable = [
  'Iface Destination Gateway Flags RefCnt Use Metric Mask MTU Window IRTT',
  'eth0 00000000 010011AC 0003 0 0 0 00000000 0 0 0',
  'eth0 000011AC 00000000 0001 0 0 0 00F0FFFF 0 0 0',
].join('\n');

test('resolves the WSL host from its active default route', () => {
  assert.equal(parseDefaultGateway(routeTable), '172.17.0.1');
});

test('ignores down routes and non-default routes', () => {
  const routes = [
    'Iface Destination Gateway Flags RefCnt Use Metric Mask MTU Window IRTT',
    'eth0 00000000 010011AC 0001 0 0 0 00000000 0 0 0',
    'eth0 000011AC 010011AC 0003 0 0 0 00F0FFFF 0 0 0',
  ].join('\n');
  assert.equal(parseDefaultGateway(routes), null);
});

test('uses the WSL host route for Ollama only under WSL', () => {
  assert.equal(
    defaultOllamaEndpoint({
      platform: 'linux',
      distroName: '',
      kernelRelease: '6.18.33.1-microsoft-standard-WSL2',
      routeTable,
    }),
    'http://172.17.0.1:11434/api/chat',
  );
  assert.equal(
    defaultOllamaEndpoint({ platform: 'linux', distroName: '', kernelRelease: '6.8.0-generic', routeTable }),
    'http://127.0.0.1:11434/api/chat',
  );
  assert.equal(isWslRuntime({ platform: 'win32', distroName: 'Ubuntu-24.04' }), false);
});
