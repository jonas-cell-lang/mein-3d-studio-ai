const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const schema = require('../src/project-schema.js');

function validProject() {
  return { app: 'SILMO 3D Studio AI', version: 3, objects: [] };
}

function readFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
}

function visitGeometry(object, visit) {
  if (!object || typeof object !== 'object') return;
  if (object.geometry) visit(object.geometry, object.label || '(ohne Namen)');
  if (Array.isArray(object.unionParts)) {
    for (const part of object.unionParts) visitGeometry(part, visit);
  }
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

test('minimales und erweitertes v3-Fixture sind gültige Projektdateien', () => {
  for (const name of ['project-v3-minimal.json', 'project-v3-advanced.json']) {
    const fixture = readFixture(name);
    assert.equal(schema.validateProjectEnvelope(fixture), fixture, name);
  }
});

test('erweitertes v3-Fixture deckt Gruppen, verbundene Formen und Bildstudio ab', () => {
  const fixture = readFixture('project-v3-advanced.json');
  assert.ok(fixture.imageStudio && fixture.imageStudio.version === 1);
  assert.ok(typeof fixture.imageStudio.dataUrl === 'string' && fixture.imageStudio.dataUrl.startsWith('data:image/'));
  assert.ok(fixture.objects.some(object => object.groupId === 'fixture-gruppe-01'));
  assert.ok(fixture.objects.some(object => Array.isArray(object.unionParts) && object.unionParts.length === 2));
  assert.ok(fixture.objects.some(object => Array.isArray(object.sketchOutline) && object.sketchOutline.length >= 3));
  assert.ok(fixture.objects.some(object => object.contourFrame && Number.isFinite(object.contourFrame.wallThicknessMM)));
});

test('Geometrie in beiden v3-Fixtures hat endliche Positionswerte und gültige Indizes', () => {
  for (const name of ['project-v3-minimal.json', 'project-v3-advanced.json']) {
    const fixture = readFixture(name);
    let geometryCount = 0;
    for (const object of fixture.objects) {
      visitGeometry(object, (geometry, label) => {
        geometryCount += 1;
        const position = geometry.attributes && geometry.attributes.position;
        assert.ok(position, name + ': Positionsattribut fehlt bei ' + label);
        assert.equal(position.itemSize, 3, name + ': Position itemSize ist nicht 3 bei ' + label);
        assert.ok(Array.isArray(position.array) && position.array.length > 0, name + ': Positionsarray fehlt bei ' + label);
        assert.equal(position.array.length % 3, 0, name + ': Positionsarray ist nicht durch 3 teilbar bei ' + label);
        assert.ok(position.array.every(Number.isFinite), name + ': Positionsarray enthält ungültige Zahlen bei ' + label);
        if (geometry.index) {
          const indices = geometry.index.array;
          assert.ok(Array.isArray(indices) && indices.length > 0, name + ': Indexarray fehlt bei ' + label);
          const vertexCount = position.array.length / 3;
          assert.ok(indices.every(index => Number.isInteger(index) && index >= 0 && index < vertexCount),
            name + ': Index verweist ausserhalb des Positionsarrays bei ' + label);
        }
      });
    }
    assert.ok(geometryCount > 0, name + ': keine Geometrie geprüft');
  }
});
