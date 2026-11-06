import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(frontendRoot, 'dist');
const env = { ...loadEnv('production', frontendRoot, 'VITE_'), ...process.env };

const providers = [
  {
    name: 'datadog',
    target: env.VITE_DATADOG_DASHBOARD_URL,
  },
  {
    name: 'sentry',
    target: env.VITE_SENTRY_DASHBOARD_URL,
  },
];

function safeTarget(value) {
  if (!value?.trim()) return '';

  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);

    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

function nginxString(value) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('$', '\\$')}"`;
}

const lines = [
  '# Generated during frontend build. Grafana is proxied locally; only configured account URLs are mapped.',
  'map $http_upgrade $spm_connection_upgrade {',
  '    default upgrade;',
  '    "" close;',
  '}',
];

for (const provider of providers) {
  const target = safeTarget(provider.target);
  lines.push(
    `map $uri $spm_observability_${provider.name}_url {`,
    '    default "";',
  );
  if (target) {
    lines.push(
      `    ~^/(observation|obsesrvation)/${provider.name}/?$ ${nginxString(target)};`,
    );
  }
  lines.push('}');
}

lines.push('');

await mkdir(distDirectory, { recursive: true });
await writeFile(
  path.join(distDirectory, 'observability-redirects.conf'),
  lines.join('\n'),
  'utf8',
);
