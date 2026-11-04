import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { get } from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const nginxDirectory = fileURLToPath(new URL('../nginx', import.meta.url));
const docker = (...args) => execFileSync('docker', args, {
  encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'],
});

function getRedirect(originUrl, publicUrl) {
  return new Promise((resolve, reject) => {
    const request = get(originUrl, {
      timeout: 2000,
      headers: { Host: publicUrl.host, 'X-Forwarded-Proto': 'https', 'X-Forwarded-Port': '443' },
    }, (response) => {
      response.resume();
      response.on('end', () => resolve({ status: response.statusCode, location: response.headers.location }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error('Nginx response timed out')));
  });
}

test('Gitea redirects preserve the public HTTPS URL behind the tunnel', { timeout: 180_000 }, async (t) => {
  const name = 'spm-nginx-redirect-' + randomUUID();
  let started = false;
  try {
    docker('run', '--detach', '--rm', '--name', name,
      '--publish', '127.0.0.1::80', '--publish', '127.0.0.1::8080',
      '--mount', 'type=bind,source=' + nginxDirectory + ',target=/etc/nginx/conf.d,readonly',
      'nginx:stable-alpine');
    started = true;
    docker('exec', name, 'nginx', '-t');
    const ports = JSON.parse(docker('inspect', name))[0].NetworkSettings.Ports;

    for (const [environment, containerPort] of [['main', '80'], ['staging', '8080']]) {
      await t.test(environment + ' /git redirects without exposing the origin scheme or port', async () => {
        const publicUrl = new URL('https://example.trycloudflare.com/git');
        const originUrl = 'http://127.0.0.1:' + ports[containerPort + '/tcp'][0].HostPort + '/git';
        let response;
        for (let attempt = 0; attempt < 20; attempt++) {
          try {
            response = await getRedirect(originUrl, publicUrl);
            break;
          } catch (error) {
            if (attempt === 19) throw error;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        const { location } = response;
        assert.equal(response.status, 308);
        assert.ok(location, 'The redirect must include a Location header');
        const destination = new URL(location, publicUrl);
        assert.equal(destination.href, 'https://example.trycloudflare.com/git/',
          'The redirect must preserve the public HTTPS origin: ' + location);
      });
    }
  } finally {
    // Remove only this test's uniquely named container, including on failures.
    if (started) docker('rm', '--force', name);
  }
});
