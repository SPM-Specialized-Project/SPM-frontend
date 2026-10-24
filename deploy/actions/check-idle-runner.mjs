import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEPLOY_RUNNER_LABELS = ['self-hosted', 'linux', 'x64', 'local-deploy'];

export async function requireIdleDeployRunner({ repository, token,
  apiUrl = 'https://api.github.com', request = fetch }) {
  if (!token?.trim()) throw new Error('Configure RUNNER_STATUS_TOKEN with repository Administration: read permission.');
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository ?? '')) throw new Error('GITHUB_REPOSITORY must identify the deployment repository.');
  const repositoryPath = repository.split('/').map(encodeURIComponent).join('/');
  const matching = [];
  let seen = 0;
  // Read paginated inventory once; never wait for a busy/offline runner.
  for (let page = 1; page <= 100; page += 1) {
    const response = await request(`${apiUrl.replace(/\/$/, '')}/repos/${repositoryPath}/actions/runners?per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}`,
        'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Runner status check failed (HTTP ${response.status}). Verify RUNNER_STATUS_TOKEN has Administration: read on ${repository}. Deployment stopped.`);
    const data = await response.json();
    if (!Array.isArray(data.runners) || !Number.isInteger(data.total_count) || data.total_count < 0) {
      throw new Error('GitHub returned an invalid runner inventory. Deployment stopped.');
    }
    for (const runner of data.runners) {
      const labels = new Set((runner.labels ?? []).map((label) => String(label.name).toLowerCase()));
      if (!DEPLOY_RUNNER_LABELS.every((label) => labels.has(label))) continue;
      matching.push({ name: runner.name, status: runner.status, busy: runner.busy });
      if (runner.status === 'online' && runner.busy === false) return runner;
    }
    seen += data.runners.length;
    if (seen >= data.total_count || data.runners.length < 100) break;
    if (page === 100) throw new Error('Runner inventory pagination limit reached. Deployment stopped.');
  }
  const detail = matching.length ? JSON.stringify(matching) : 'no runner matches self-hosted/linux/x64/local-deploy';
  throw new Error(`No idle local-deploy runner is online: ${detail}. Deployment stopped; retry when a runner is idle.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const runner = await requireIdleDeployRunner({ repository: process.env.GITHUB_REPOSITORY,
      token: process.env.RUNNER_STATUS_TOKEN, apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com' });
    console.log(`Deploy runner is online and idle: ${JSON.stringify(runner.name)}.`);
  } catch (error) {
    console.error(`::error::${String(error.message).replace(/[\r\n]/g, ' ')}`);
    process.exitCode = 1;
  }
}
