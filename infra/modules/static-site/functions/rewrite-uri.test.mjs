import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// The deployed artifact is a bare script with a global `handler` — CloudFront
// rejects module syntax — so it cannot be imported. Evaluating the exact file
// in a sandbox keeps the tested code byte-identical to the deployed code.
const source = readFileSync(new URL('./rewrite-uri.js', import.meta.url), 'utf8');
const sandbox = vm.createContext({});
vm.runInContext(source, sandbox);
const handler = sandbox.handler;

const requestFor = (uri) => ({ request: { uri, method: 'GET', headers: {} } });

test('rewrites the bare root to /index.html', () => {
  assert.equal(handler(requestFor('/')).uri, '/index.html');
});

test('rewrites an extension-less path to /index.html', () => {
  assert.equal(handler(requestFor('/about')).uri, '/index.html');
});

test('rewrites a trailing-slash path to /index.html', () => {
  assert.equal(handler(requestFor('/vietnam/hanoi/')).uri, '/index.html');
});

test('leaves hashed JS assets untouched', () => {
  assert.equal(handler(requestFor('/assets/index-GC2_sEKN.js')).uri, '/assets/index-GC2_sEKN.js');
});

test('leaves nested GeoJSON data untouched', () => {
  const uri = '/data/wards/vietnam-ward-01.geojson';
  assert.equal(handler(requestFor(uri)).uri, uri);
});

test('leaves textures untouched', () => {
  assert.equal(handler(requestFor('/textures/earth-day-8k.jpg')).uri, '/textures/earth-day-8k.jpg');
});

test('is not fooled by a dot in a parent directory', () => {
  assert.equal(handler(requestFor('/v1.2/settings')).uri, '/index.html');
});

test('returns the same request object it was given', () => {
  const event = requestFor('/index.html');
  assert.equal(handler(event), event.request);
});
