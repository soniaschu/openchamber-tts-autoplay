import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
const contribution = manifest.openchamber.contributes;

assert.equal(contribution.panel.id, 'tts-autoplay');
assert.equal(contribution.panel.entry, 'panel/index.html');
assert.equal(contribution.background.entry, 'background/index.html');
assert.deepEqual(contribution.capabilities, ['tts']);
assert.equal(contribution.actions.length, 1);
assert.equal(contribution.actions[0].where, 'message');
assert.equal(contribution.actions[0].mode, 'background');
assert.equal(contribution.actions[0].automatic, true);
assert.deepEqual(contribution.actions[0].roles, ['assistant']);

for (const file of ['panel/index.html', 'panel/style.css', 'panel/main.js', 'background/index.html', 'background/main.js', 'assets/panel.svg', 'assets/speak.svg']) {
  assert.equal(fs.existsSync(new URL(file, root)), true, 'missing ' + file);
}

for (const file of ['assets/panel.svg', 'assets/speak.svg']) {
  const svg = fs.readFileSync(new URL(file, root), 'utf8');
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /fill="currentColor"/);
  assert.ok(svg.length > 100, file + ' must be a real SVG, not a placeholder/corrupt asset');
}

const background = fs.readFileSync(new URL('background/main.js', root), 'utf8');
assert.match(background, /speak\(/);
assert.doesNotMatch(background, /api[_-]?key/i);
assert.doesNotMatch(background, /tts\.eysho\.info/i);

const panel = fs.readFileSync(new URL('panel/main.js', root), 'utf8');
assert.match(panel, /TTS AUTOPLAY/);
assert.match(panel, /speak\(/);

console.log('TTS AutoPlay extension manifest, bundles, SVG icons, and secret-isolation checks passed.');
