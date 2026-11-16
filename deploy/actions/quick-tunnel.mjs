import { publicRootUrl } from './deployment-lib.mjs';

const defaultWait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function startQuickTunnel({
  runWithRetry,
  tunnelUnit,
  appendOutput,
  wait = defaultWait,
  now = () => new Date().toISOString(),
  writeError = (value) => process.stderr.write(value),
}) {
  const startedAt = now();
  await runWithRetry('sudo', ['-n', 'systemctl', 'restart', tunnelUnit], {
    retryDelayMs: 2_000,
    maxRetryDelayMs: 8_000,
  });

  let publicUrl = '';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const log = await runWithRetry('sudo', ['-n', 'journalctl', '-u', tunnelUnit, '--since', startedAt,
      '--no-pager', '-n', '100'], { quiet: true });
    if (typeof log !== 'string') throw new TypeError('journalctl output must be a string.');
    publicUrl = (log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g) || [])
      .filter((url) => url !== 'https://api.trycloudflare.com').at(-1) || '';
    if (publicUrl) break;
    await wait(2_000);
  }

  if (!publicUrl) {
    const log = await runWithRetry('sudo', ['-n', 'journalctl', '-u', tunnelUnit, '--no-pager', '-n', '100'], { quiet: true });
    if (typeof log !== 'string') throw new TypeError('journalctl output must be a string.');
    writeError(log);
    throw new Error(`${tunnelUnit} did not return a Cloudflare Quick Tunnel URL.`);
  }

  publicRootUrl(publicUrl);
  appendOutput('public_url', publicUrl);
  return publicUrl;
}
