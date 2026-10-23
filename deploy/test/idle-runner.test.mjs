import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { requireIdleDeployRunner } from '../actions/check-idle-runner.mjs';

const repository = 'example/application';
const token = 'fixture-token-not-for-logging';
const runner = (patch = {}) => ({ id: 1, name: 'debian-deploy', status: 'online', busy: false,
  labels: ['self-hosted', 'Linux', 'X64', 'local-deploy'].map((name) => ({ name })), ...patch });

async function inventory(t, pages, status = 200) {
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push({ url, headers: request.headers });
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(pages[Number(url.searchParams.get('page')) - 1]));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { repository, token, apiUrl: `http://127.0.0.1:${server.address().port}`, requests };
}

test('deployment continues only for an online, explicitly idle runner with every deployment label', async (t) => {
  const options = await inventory(t, [{ total_count: 3, runners: [
    runner({ id: 1, busy: true }), runner({ id: 2, status: 'offline' }), runner({ id: 3 }),
  ] }]);
  assert.equal((await requireIdleDeployRunner(options)).id, 3);
  assert.equal(options.requests.length, 1);
  assert.equal(options.requests[0].url.pathname, '/repos/example/application/actions/runners');
  assert.equal(options.requests[0].headers.authorization, `Bearer ${token}`);
});

test('busy, offline, unlabelled and unknown-state runners stop deployment without polling', async (t) => {
  for (const candidate of [runner({ busy: true }), runner({ status: 'offline' }),
    runner({ busy: undefined }), runner({ labels: [{ name: 'self-hosted' }, { name: 'test-e2e-local' }] }),
    runner({ status: 'unknown' })]) {
    const options = await inventory(t, [{ total_count: 1, runners: [candidate] }]);
    await assert.rejects(requireIdleDeployRunner(options), /No idle local-deploy runner/);
    assert.equal(options.requests.length, 1);
  }
});

test('missing credentials stop before any API request', async () => {
  await assert.rejects(requireIdleDeployRunner({ repository,
    request: () => assert.fail('Should not request without RUNNER_STATUS_TOKEN') }), /RUNNER_STATUS_TOKEN/);
});

test('API permission failures stop deployment and never reveal the token', async (t) => {
  for (const status of [401, 403, 404, 500]) {
    const options = await inventory(t, [{ message: 'Not authorized' }], status);
    await assert.rejects(requireIdleDeployRunner(options), (error) => {
      assert.match(error.message, new RegExp(`HTTP ${status}`));
      assert.match(error.message, /Administration: read/);
      assert.equal(error.message.includes(token), false);
      return true;
    });
    assert.equal(options.requests.length, 1);
  }
});

test('an eligible idle runner on the second inventory page is considered', async (t) => {
  const options = await inventory(t, [
    { total_count: 101, runners: Array.from({ length: 100 }, (_, id) => runner({ id, busy: true })) },
    { total_count: 101, runners: [runner({ id: 101 })] },
  ]);
  assert.equal((await requireIdleDeployRunner(options)).id, 101);
  assert.deepEqual(options.requests.map(({ url }) => url.searchParams.get('page')), ['1', '2']);
});

test('empty or invalid inventories and network failures never permit deployment', async (t) => {
  const empty = await inventory(t, [{ total_count: 0, runners: [] }]);
  await assert.rejects(requireIdleDeployRunner(empty), /No idle local-deploy runner/);
  const malformed = await inventory(t, [{ runners: [runner()] }]);
  await assert.rejects(requireIdleDeployRunner(malformed), /invalid runner inventory/);
  let requests = 0;
  await assert.rejects(requireIdleDeployRunner({ repository, token, request: async () => {
    requests += 1;
    throw new Error('network unavailable');
  } }), /network unavailable/);
  assert.equal(requests, 1);
});
