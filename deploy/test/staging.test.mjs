import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import {
  assertVolumeContinuity, composeOverride, configurationFromEnvironment,
  parseUsers, publicRootUrl, readEnvironmentValue, selectDatabasePassword,
  updateEnvironment, verifyRepositoryWrites,
} from '../actions/staging-lib.mjs';

const environment = { GITEA_ADMIN_PASSWORD: 'integration-test-password', SPM_RUNNER_USER: 'runner' };

test('configuration fails before deployment for missing or unsafe inputs', () => {
  assert.equal(configurationFromEnvironment(environment).owner, 'codepulse-bot');
  assert.throws(() => configurationFromEnvironment({ SPM_RUNNER_USER: 'runner' }), /GITEA_ADMIN_PASSWORD/);
  assert.throws(() => configurationFromEnvironment({ ...environment, GITEA_OWNER: 'https://gitea/owner' }), /username/);
  assert.throws(() => configurationFromEnvironment({ ...environment, GITEA_OWNER: 'spm-admin' }), /separate/);
  assert.throws(() => configurationFromEnvironment({ ...environment, POSTGRES_PASSWORD: 'a\nb' }), /single line/);
});

test('existing database password takes precedence and cannot be replaced accidentally', () => {
  let generated = 0;
  const generate = () => { generated++; return 'new-password'; };
  assert.equal(selectDatabasePassword('existing', '', generate), 'existing');
  assert.equal(selectDatabasePassword('existing', 'existing', generate), 'existing');
  assert.throws(() => selectDatabasePassword('existing', 'replacement', generate), /differs/);
  assert.equal(generated, 0);
  assert.equal(selectDatabasePassword('', '', generate), 'new-password');
  assert.equal(generated, 1);
});

test('public URL is normalized once and Compose preserves literal dollars in passwords', () => {
  assert.equal(publicRootUrl('https://example-test.trycloudflare.com'), 'https://example-test.trycloudflare.com/git/');
  for (const value of ['https://https://example-test.trycloudflare.com', 'http://example-test.trycloudflare.com',
    'https://example-test.trycloudflare.com:8080', 'https://example-test.trycloudflare.com/git/', 'https://example.com']) {
    assert.throws(() => publicRootUrl(value));
  }
  const password = 'abc$VALUE${NOT_A_VARIABLE}';
  const override = composeOverride(password, 'http://127.0.0.1:8211/');
  assert.equal(override.services.postgres.environment.POSTGRES_PASSWORD, 'abc$$VALUE$$' + '{NOT_A_VARIABLE}');
  assert.equal(override.services.gitea.environment.GITEA__security__INSTALL_LOCK, 'true');
});

test('Compose cannot switch an existing database or Gitea volume', () => {
  const containers = {
    postgres: { Mounts: [{ Type: 'volume', Name: 'existing_pg', Destination: '/var/lib/postgresql/data' }] },
    gitea: { Mounts: [
      { Type: 'volume', Name: 'existing_git', Destination: '/var/lib/gitea' },
      { Type: 'bind', Source: '/srv/git-config', Destination: '/etc/gitea' },
    ] },
  };
  const model = { services: {
    postgres: { volumes: [{ type: 'volume', source: 'pg', target: '/var/lib/postgresql/data' }] },
    gitea: { volumes: [
      { type: 'volume', source: 'git', target: '/var/lib/gitea' },
      { type: 'bind', source: '/srv/git-config', target: '/etc/gitea' },
    ] },
  }, volumes: { pg: { name: 'existing_pg' }, git: { name: 'existing_git' } } };
  assert.doesNotThrow(() => assertVolumeContinuity(containers, model));
  model.volumes.pg.name = 'different_empty_pg';
  assert.throws(() => assertVolumeContinuity(containers, model), /storage/);
});

test('backend configuration preserves unrelated settings and removes duplicate replaced keys', () => {
  const output = updateEnvironment('# keep\nBACKEND_CORS_ORIGIN=existing\nGITEA_OWNER=old\nGITEA_OWNER=older\n', {
    GITEA_OWNER: 'codepulse-bot', GITEA_API_TOKEN: 'token',
  });
  assert.ok(output.includes('# keep\nBACKEND_CORS_ORIGIN=existing'));
  assert.equal(output.match(/GITEA_OWNER=/g).length, 1);
  assert.equal(readEnvironmentValue(output, 'GITEA_OWNER'), 'codepulse-bot');
  assert.deepEqual(parseUsers('ID Username Email IsActive IsAdmin 2FA\n1 spm-admin admin@example.com true true false\n2 codepulse-bot bot@example.com true false false\n'),
    [{ name: 'spm-admin', active: true, admin: true }, { name: 'codepulse-bot', active: true, admin: false }]);
});

async function mockGitea(t, failure = '') {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    requests.push({ method: request.method, path: request.url, body: body ? JSON.parse(body) : null });
    response.setHeader('Content-Type', 'application/json');
    if (failure === 'branch' && request.url.endsWith('/branches')) {
      response.writeHead(403); response.end('{"message":"forbidden"}'); return;
    }
    const payload = request.url === '/user' ? { login: failure === 'identity' ? 'other' : 'codepulse-bot', is_admin: false }
      : request.url === '/user/repos' ? { private: true, owner: { login: 'codepulse-bot' }, default_branch: 'main' }
        : request.method === 'GET' ? { sha: 'stored-file-sha' } : {};
    response.writeHead(request.method === 'DELETE' ? 204 : 200);
    response.end(request.method === 'DELETE' ? '' : JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { requests, url: 'http://127.0.0.1:' + server.address().port };
}

test('token check creates a private repository and verifies branch, file creation and SHA update before cleanup', async (t) => {
  const { requests, url } = await mockGitea(t);
  await verifyRepositoryWrites(url, 'test-token', 'codepulse-bot');
  assert.equal(requests.find((request) => request.path === '/user/repos').body.private, true);
  assert.ok(requests.some((request) => request.path.endsWith('/branches')));
  const writes = requests.filter((request) => request.method === 'PUT');
  assert.equal(writes.length, 2);
  assert.equal(writes[0].body.sha, undefined);
  assert.equal(writes[1].body.sha, 'stored-file-sha');
  assert.equal(requests.at(-1).method, 'DELETE');
});

test('failed writes still delete only the repository created by the check', async (t) => {
  const { requests, url } = await mockGitea(t, 'branch');
  await assert.rejects(verifyRepositoryWrites(url, 'test-token', 'codepulse-bot'), /403/);
  assert.equal(requests.at(-1).method, 'DELETE');
  assert.match(requests.at(-1).path, /^\/repos\/codepulse-bot\/spm-deploy-check-/);
});

test('wrong token identity cannot create or delete repositories', async (t) => {
  const { requests, url } = await mockGitea(t, 'identity');
  await assert.rejects(verifyRepositoryWrites(url, 'test-token', 'codepulse-bot'), /non-admin/);
  assert.equal(requests.length, 1);
});
