import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForHealth(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await wait(50);
  }

  throw new Error('Node backend did not become healthy in time.');
}

test('serves health, authentication, and course catalog endpoints', async (t) => {
  const port = 4100 + Math.floor(Math.random() * 500);
  const baseUrl = `http://127.0.0.1:${port}`;
  const backend = spawn(process.execPath, ['server.mjs'], {
    cwd: backendDirectory,
    env: { ...process.env, BACKEND_PORT: String(port) },
    stdio: 'ignore',
  });

  t.after(() => backend.kill());
  await waitForHealth(baseUrl);

  const health = await (await fetch(`${baseUrl}/api/health`)).json();
  assert.equal(health.ok, true);
  assert.equal(health.service, 'spm-backend');

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@gmail.com', password: 'student123' }),
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(login.role, 'student');
  assert.ok(login.accessToken);

  const coursesResponse = await fetch(`${baseUrl}/api/courses?viewerRole=coordinator`);
  const courses = await coursesResponse.json();
  assert.equal(coursesResponse.status, 200);
  assert.equal(courses.items.length, 12);
});
