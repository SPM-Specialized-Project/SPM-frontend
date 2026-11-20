import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = fileURLToPath(new URL('../bin/disable-default-nginx-site', import.meta.url));

test('main installer disables only the distribution default Nginx site symlink', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'spm-nginx-default-'));
  try {
    const available = join(root, 'sites-available');
    const enabled = join(root, 'sites-enabled');
    mkdirSync(available);
    mkdirSync(enabled);

    const defaultSite = join(available, 'default');
    const customSite = join(available, 'custom');
    const defaultLink = join(enabled, 'default');
    const customLink = join(enabled, 'custom');
    const regularFile = join(enabled, 'regular-default');
    writeFileSync(defaultSite, 'distribution default');
    writeFileSync(customSite, 'custom configuration');
    symlinkSync(defaultSite, defaultLink);
    symlinkSync(customSite, customLink);
    writeFileSync(regularFile, 'custom file');

    execFileSync('bash', [helper, defaultLink, defaultSite]);

    assert.equal(existsSync(defaultLink), false);
    assert.equal(readFileSync(defaultSite, 'utf8'), 'distribution default');
    assert.equal(readFileSync(customLink, 'utf8'), 'custom configuration');
    assert.equal(readFileSync(regularFile, 'utf8'), 'custom file');

    const installer = readFileSync(new URL('../install-local.sh', import.meta.url), 'utf8');
    assert.match(installer, /disable-default-nginx-site[\s\S]*sites-enabled\/default[\s\S]*sites-available\/default/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});