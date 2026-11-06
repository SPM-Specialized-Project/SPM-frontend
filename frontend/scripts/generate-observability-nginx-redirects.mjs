import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnv } from 'vite';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = path.join(frontendRoot, 'dist');
const env = { ...loadEnv('production', frontendRoot, 'VITE_'), ...process.env };

function datadogRumExplorerUrl(site) {
  const normalizedSite = (site || 'datadoghq.com')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^app\./i, '')
    .split('/')[0]
    .toLowerCase();
  const supportedSite = /^(?:[a-z0-9-]+\.)*(?:datadoghq\.com|datadoghq\.eu|ddog-gov\.com)$/;

  return supportedSite.test(normalizedSite)
    ? `https://app.${normalizedSite}/rum/explorer`
    : 'https://app.datadoghq.com/rum/explorer';
}

const providers = [
  {
    name: 'datadog',
    target: env.VITE_DATADOG_DASHBOARD_URL,
    fallback: datadogRumExplorerUrl(env.VITE_DATADOG_SITE),
  },
  {
    name: 'grafana',
    target: env.VITE_GRAFANA_DASHBOARD_URL,
    fallback: 'https://grafana.com/orgs/',
  },
  {
    name: 'sentry',
    target: env.VITE_SENTRY_DASHBOARD_URL,
    fallback: 'https://sentry.io/organizations/',
  },
];

function safeTarget(value, fallback) {
  if (!value?.trim()) return fallback;

  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);

    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
      return fallback;
    }

    return url.toString();
  } catch {
    return fallback;
  }
}

function nginxString(value) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('$', '\\$')}"`;
}

const lines = [
  '# Generated during frontend build. Nginx redirects observability paths to provider UIs.',
  'map $uri $spm_observability_redirect {',
  '    default "";',
];

for (const provider of providers) {
  const target = nginxString(safeTarget(provider.target, provider.fallback));
  lines.push(
    `    ~^/(observation|obsesrvation)/${provider.name}/?$ ${target};`,
  );
}

lines.push('}', '');

await mkdir(distDirectory, { recursive: true });
await writeFile(
  path.join(distDirectory, 'observability-redirects.conf'),
  lines.join('\n'),
  'utf8',
);
