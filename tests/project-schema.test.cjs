const test = require('node:test');
const assert = require('node:assert/strict');
const schema = require('../src/project-schema.js');

function validProject() {
  return { app: 'SILMO 3D Studio AI', version: 3, objects: [] };
}

test('Projektformat v3 wird akzeptiert und nicht verändert', () => {
  const project = validProject();
  assert.equal(schema.CURRENT_PROJECT_VERSION, 3);
  assert.deepEqual(schema.SUPPORTED_PROJECT_VERSIONS, [3]);
  assert.equal(schema.validateProjectEnvelope(project), project);
  assert.deepEqual(project, validProject());
});

test('fehlende und nicht ganzzahlige Versionsnummern werden abgelehnt', () => {
  const missing = validProject();
  delete missing.version;
  assert.throws(() => schema.validateProjectEnvelope(missing), /keine gültige Versionsnummer/);
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), version: '3' }), /keine gültige Versionsnummer/);
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), version: 3.1 }), /keine gültige Versionsnummer/);
});

test('unbekannte ältere und neuere Projektversionen werden abgelehnt', () => {
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), version: 2 }), /Nicht unterstützte Projektversion 2/);
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), version: 4 }), /Nicht unterstützte Projektversion 4/);
});

test('falsche App-Kennung und ungültige Objektlisten werden abgelehnt', () => {
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), app: 'Andere App' }), /keine gültige SILMO-Projektdatei/);
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), objects: null }), /ungültige Objektliste/);
  assert.throws(() => schema.validateProjectEnvelope({ ...validProject(), objects: Array(101).fill({}) }), /maximal 100 Objekte/);
  assert.throws(() => schema.validateProjectEnvelope([]), /kein gültiges JSON-Objekt/);
});
