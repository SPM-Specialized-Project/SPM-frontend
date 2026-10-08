import { randomUUID } from 'node:crypto';

export function configurationFromEnvironment(env) {
  const config = {
    adminUser: env.GITEA_ADMIN_USERNAME?.trim() || 'spm-admin',
    adminEmail: env.GITEA_ADMIN_EMAIL?.trim() || 'spm-admin@example.com',
    adminPassword: env.GITEA_ADMIN_PASSWORD || '',
    owner: env.GITEA_OWNER?.trim() || 'codepulse-bot',
    postgresPassword: env.POSTGRES_PASSWORD || '',
    apiToken: env.GITEA_API_TOKEN?.trim() || '',
    runnerUser: env.SPM_RUNNER_USER || '',
  };
  for (const key of ['adminUser', 'owner']) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,38}$/.test(config[key])) {
      throw new Error(key + ' must be a Gitea username, without a URL or organization path.');
    }
  }
  if (config.adminUser.toLowerCase() === config.owner.toLowerCase()) {
    throw new Error('Use separate Gitea administrator and backend service accounts.');
  }
  if (!/^[^\s@]+@[^\s@]+$/.test(config.adminEmail)) throw new Error('GITEA_ADMIN_EMAIL is invalid.');
  if (config.adminPassword.length < 12) throw new Error('Set GITEA_ADMIN_PASSWORD to at least 12 characters.');
  for (const key of ['adminPassword', 'postgresPassword', 'apiToken']) {
    if (/[\r\n\0]/.test(config[key])) throw new Error(key + ' must contain a single line.');
  }
  if (!/^[a-z_][a-z0-9_-]*\$?$/i.test(config.runnerUser)) throw new Error('Invalid runner OS username.');
  return config;
}

export function selectDatabasePassword(existing, supplied, generate) {
  if (existing && supplied && existing !== supplied) {
    throw new Error('POSTGRES_PASSWORD differs from the existing database container. Keep the existing password.');
  }
  return existing || supplied || generate();
}

export function publicRootUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid staging public URL.'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname)
      || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Expected the HTTPS Quick Tunnel origin, without a port or /git path.');
  }
  return url.origin + '/git/';
}

export function composeOverride(password, rootUrl) {
  const domain = new URL(rootUrl).hostname;
  // Compose interprets dollars even in JSON strings; double them for literal values.
  const literal = (value) => value.replace(/\$/g, () => '$$');
  return {
    services: {
      postgres: { environment: { POSTGRES_PASSWORD: literal(password) } },
      gitea: {
        environment: {
          GITEA__database__PASSWD: literal(password),
          GITEA__server__DOMAIN: domain,
          GITEA__server__SSH_DOMAIN: domain,
          GITEA__server__ROOT_URL: rootUrl,
          GITEA__security__INSTALL_LOCK: 'true',
        },
      },
    },
  };
}

export function assertVolumeContinuity(containers, model) {
  for (const [service, container] of Object.entries(containers)) {
    if (!container) continue;
    const destinations = service === 'gitea' ? ['/var/lib/gitea', '/etc/gitea'] : ['/var/lib/postgresql/data'];
    for (const destination of destinations) {
      const before = container.Mounts.find((mount) => mount.Destination === destination);
      const after = model.services[service]?.volumes?.find((mount) => mount.target === destination);
      const source = after?.type === 'volume' ? model.volumes[after.source]?.name : after?.source;
      if (!before || !after || source !== (before.Type === 'volume' ? before.Name : before.Source)) {
        throw new Error('Refusing to change the existing ' + service + ' storage at ' + destination + '.');
      }
    }
  }
}

export function readEnvironmentValue(text, key) {
  const lines = text.split(/\r?\n/).filter((line) => line.startsWith(key + '='));
  const value = lines.at(-1)?.slice(key.length + 1).trim() || '';
  if (value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { throw new Error('Invalid quoted environment value: ' + key); }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

export function updateEnvironment(text, values) {
  const keys = Object.keys(values);
  const preserved = text.split(/\r?\n/).filter((line) => !keys.some((key) => line.startsWith(key + '=')));
  while (preserved.at(-1) === '') preserved.pop();
  return [...preserved, ...keys.map((key) => key + '=' + JSON.stringify(values[key]))].join('\n') + '\n';
}

export function parseUsers(output) {
  return output.split(/\r?\n/).map((line) => line.trim().split(/\s+/))
    .filter((columns) => /^\d+$/.test(columns[0]) && columns.length >= 5)
    .map((columns) => ({ name: columns[1], active: columns[3] === 'true', admin: columns[4] === 'true' }));
}

export async function giteaRequest(baseUrl, token, endpoint, options = {}) {
  const response = await fetch(baseUrl + endpoint, {
    ...options,
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: 'token ' + token,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!response.ok) throw new Error('Gitea API ' + response.status + ' at ' + endpoint.split('?')[0]);
  return response.status === 204 ? null : response.json();
}

export async function verifyRepositoryWrites(baseUrl, token, owner) {
  const identity = await giteaRequest(baseUrl, token, '/user');
  if (identity.login?.toLowerCase() !== owner.toLowerCase() || identity.is_admin) {
    throw new Error('The backend token must belong to the non-admin GITEA_OWNER account.');
  }
  const name = 'spm-deploy-check-' + randomUUID();
  const repoPath = '/repos/' + encodeURIComponent(owner) + '/' + name;
  let created = false;
  try {
    const repo = await giteaRequest(baseUrl, token, '/user/repos', {
      method: 'POST', body: JSON.stringify({ name, private: true, auto_init: true }),
    });
    created = true;
    if (!repo.private || repo.owner.login.toLowerCase() !== owner.toLowerCase()) {
      throw new Error('Gitea did not create the expected private deployment-check repository.');
    }
    const branch = 'deployment-check';
    await giteaRequest(baseUrl, token, repoPath + '/branches', {
      method: 'POST', body: JSON.stringify({ new_branch_name: branch, old_branch_name: repo.default_branch }),
    });
    const filePath = repoPath + '/contents/deployment-check.json';
    await giteaRequest(baseUrl, token, filePath, {
      method: 'PUT',
      body: JSON.stringify({ branch, message: 'Verify deployment', content: Buffer.from('{"ok":true}\n').toString('base64') }),
    });
    const file = await giteaRequest(baseUrl, token, filePath + '?ref=' + branch);
    if (!file.sha) throw new Error('Gitea did not persist the deployment-check file.');
    await giteaRequest(baseUrl, token, filePath, {
      method: 'PUT',
      body: JSON.stringify({ branch, sha: file.sha, message: 'Verify file updates', content: Buffer.from('{"updated":true}\n').toString('base64') }),
    });
  } finally {
    // Delete only the unique repository successfully created by this check.
    if (created) await giteaRequest(baseUrl, token, repoPath, { method: 'DELETE' });
  }
}
