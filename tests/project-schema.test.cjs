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

test('Hohlrahmen-Metadaten müssen innerhalb der unterstützten CAD-Eingabebereiche liegen', () => {
  const valid = validProject();
  valid.objects.push({ contourFrame: { wallThicknessMM: 0.2, wallHeightMM: 0.2 } });
  valid.objects.push({ caseWallFrame: { wallThicknessMM: 100, wallHeightMM: 2000 } });
  assert.equal(schema.validateProjectEnvelope(valid), valid);

  for (const frame of [
    0,
    '',
    { wallThicknessMM: 0, wallHeightMM: 12 },
    { wallThicknessMM: 100.1, wallHeightMM: 12 },
    { wallThicknessMM: 1.4, wallHeightMM: 0 },
    { wallThicknessMM: 1.4, wallHeightMM: 2000.1 },
    { wallThicknessMM: NaN, wallHeightMM: 12 },
    { wallThicknessMM: 1.4, wallHeightMM: Infinity }
  ]) {
    const project = validProject();
    project.objects.push({ contourFrame: frame });
    assert.throws(() => schema.validateProjectEnvelope(project), /Ungültige Hohlrahmen-Metadaten/);
  }
});

test('Loft-Metadaten mit Innenkonturen werden validiert und sind projektfähig', () => {
  const project = validProject();
  project.objects.push({
    loft: {
      sourceA: 'outer-profile-a', sourceB: 'outer-profile-b', sections: 2,
      innerContourCount: 2,
      sourceHoles: [
        { a: 'hole-a1', b: 'hole-b1' },
        { a: 'hole-a2', b: 'hole-b2' }
      ]
    }
  });
  assert.equal(schema.validateProjectEnvelope(project), project);

  const invalidCount = structuredClone(project);
  invalidCount.objects[0].loft.innerContourCount = 9;
  assert.throws(() => schema.validateProjectEnvelope(invalidCount), /Loft-Metadaten/);

  const missingPair = structuredClone(project);
  missingPair.objects[0].loft.sourceHoles.pop();
  assert.throws(() => schema.validateProjectEnvelope(missingPair), /Loft-Metadaten/);

  const invalidReference = structuredClone(project);
  invalidReference.objects[0].loft.sourceHoles[0].a = '../outside';
  assert.throws(() => schema.validateProjectEnvelope(invalidReference), /Loft-Metadaten/);
});

test('Freiform-Skizzen validieren einfache, begrenzte und innenliegende Lochkonturen', () => {
  const project=validProject();
  project.objects.push({
    sketchOutline:[[-10,-10],[10,-10],[10,10],[-10,10]],
    sketch:{type:'freeform2d',holes:[
      [[-8,-2],[-8,2],[-4,2],[-4,-2]],
      [[2,-2],[2,2],[6,2],[6,-2]]
    ]}
  });
  assert.equal(schema.validateProjectEnvelope(project),project);
  const tooMany=structuredClone(project);
  tooMany.objects[0].sketch.holes=Array(101).fill([[-8,-2],[-8,2],[-4,2],[-4,-2]]);
  assert.throws(()=>schema.validateProjectEnvelope(tooMany),/Innenkonturen/);
  const invalidPoint=structuredClone(project);
  invalidPoint.objects[0].sketch.holes[0][0][0]=Infinity;
  assert.throws(()=>schema.validateProjectEnvelope(invalidPoint),/Innenkonturen/);
  const tooManyPoints=structuredClone(project);
  tooManyPoints.objects[0].sketch.holes[0]=Array(1001).fill([0,0]);
  assert.throws(()=>schema.validateProjectEnvelope(tooManyPoints),/Innenkonturen/);
  const missingOuter=structuredClone(project);
  delete missingOuter.objects[0].sketchOutline;
  assert.throws(()=>schema.validateProjectEnvelope(missingOuter),/Innenkonturen/);
});

test('Projektimport weist selbstüberschneidende oder entartete Skizzenringe ab', () => {
  const base={sketchOutline:[[-10,-10],[10,-10],[10,10],[-10,10]],sketch:{type:'freeform2d',holes:[]}};
  const cases=[
    {label:'Selbstüberschneidung',hole:[[-5,-5],[5,5],[-5,5],[5,-5]]},
    {label:'Nullfläche',hole:[[0,0],[1,1],[2,2]]},
    {label:'Doppelte Nachbarpunkte',hole:[[0,0],[0,0],[1,1],[1,0]]},
    {label:'Ausserhalb',hole:[[11,0],[12,0],[12,1],[11,1]]},
    {label:'Aussenrand berührt',hole:[[-10,-2],[-8,-2],[-8,2],[-10,2]]},
    {label:'Aussenkontur kreuzt',hole:[[-11,-1],[0,-1],[0,1],[-11,1]]}
  ];
  for(const item of cases){
    const project=validProject();
    project.objects.push({...structuredClone(base),sketch:{...base.sketch,holes:[item.hole]}});
    assert.throws(()=>schema.validateProjectEnvelope(project),/Innenkontur|Innenkonturen/,item.label);
  }
});

test('Projektimport weist überlappende, berührende und ineinander liegende Löcher ab', () => {
  const base={sketchOutline:[[-10,-10],[10,-10],[10,10],[-10,10]],sketch:{type:'freeform2d',holes:[]}};
  const cases=[
    [[[-5,-2],[-5,2],[-1,2],[-1,-2]],[[-3,-2],[-3,2],[1,2],[1,-2]]],
    [[[-5,-2],[-5,2],[-1,2],[-1,-2]],[[-1,-2],[-1,2],[3,2],[3,-2]]],
    [[[-6,-3],[-6,3],[2,3],[2,-3]],[[-4,-1],[-4,1],[0,1],[0,-1]]]
  ];
  for(const holes of cases){
    const project=validProject();
    project.objects.push({...structuredClone(base),sketch:{...base.sketch,holes}});
    assert.throws(()=>schema.validateProjectEnvelope(project),/Innenkonturen/);
  }
});

test('Projektobjekt-IDs bleiben eindeutig und sicher', () => {
  const project = validProject();
  project.objects.push({ objectId: 'profile-a' }, { objectId: 'profile-b' });
  assert.equal(schema.validateProjectEnvelope(project), project);
  const duplicate = validProject();
  duplicate.objects.push({ objectId: 'same-id' }, { objectId: 'same-id' });
  assert.throws(() => schema.validateProjectEnvelope(duplicate), /doppelte Objektkennung/);
  const malformed = validProject();
  malformed.objects.push({ objectId: '../outside' });
  assert.throws(() => schema.validateProjectEnvelope(malformed), /Objektkennung/);
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

test('Serialisierte Mesh-Geometrie wird vor dem Wiederaufbau strukturell geprüft', () => {
  const valid = {
    attributes: {
      position: { arrayType: 'Float32Array', array: [0,0,0, 1,0,0, 0,1,0], itemSize: 3, normalized: false },
      normal: { arrayType: 'Float32Array', array: [0,0,1, 0,0,1, 0,0,1], itemSize: 3, normalized: false }
    },
    index: { arrayType: 'Uint16Array', array: [0,1,2] }
  };
  assert.equal(schema.validateSerializedGeometry(valid), valid);

  const wrongPositionSize = structuredClone(valid);
  wrongPositionSize.attributes.position.itemSize = 2;
  assert.throws(() => schema.validateSerializedGeometry(wrongPositionSize), /Positionsdaten/);

  const incompleteTriangles = structuredClone(valid);
  incompleteTriangles.index.array = [0,1,2,0];
  assert.throws(() => schema.validateSerializedGeometry(incompleteTriangles), /Ungültige Modell-Indizes/);

  const outOfRange = structuredClone(valid);
  outOfRange.index.array = [0,1,3];
  assert.throws(() => schema.validateSerializedGeometry(outOfRange), /Ungültige Modell-Indizes/);

  const tooLargeForIndexType = structuredClone(valid);
  tooLargeForIndexType.attributes.position.array = Array.from({ length: 257 }, (_, i) => [i, 0, 0]).flat();
  tooLargeForIndexType.attributes.normal.array = Array.from({ length: 257 }, () => [0, 0, 1]).flat();
  tooLargeForIndexType.index = { arrayType: 'Uint8Array', array: [0, 1, 256] };
  assert.throws(() => schema.validateSerializedGeometry(tooLargeForIndexType), /Ungültige Modell-Indizes/);

  const exceedsAttributeTypeRange = structuredClone(valid);
  exceedsAttributeTypeRange.attributes.normal.arrayType = 'Int8Array';
  exceedsAttributeTypeRange.attributes.normal.array[2] = 128;
  assert.throws(() => schema.validateSerializedGeometry(exceedsAttributeTypeRange), /Ungültige oder zu grosse Geometriedaten/);

  const mismatchedAttributes = structuredClone(valid);
  mismatchedAttributes.attributes.normal.array.splice(-3);
  assert.throws(() => schema.validateSerializedGeometry(mismatchedAttributes), /unterschiedliche Punktanzahlen/);

  const nonFinite = structuredClone(valid);
  nonFinite.attributes.position.array[0] = Infinity;
  assert.throws(() => schema.validateSerializedGeometry(nonFinite), /Ungültige oder zu grosse Geometriedaten/);
});

test('Projektimport begrenzt die gesamte Geometrie über alle Objekte und Union-Teile', () => {
  const largeGeometry = {
    attributes: {
      position: { arrayType: 'Float32Array', array: Array(749997).fill(0), itemSize: 3, normalized: false },
      normal: { arrayType: 'Float32Array', array: Array(749997).fill(0), itemSize: 3, normalized: false }
    },
    index: { arrayType: 'Uint8Array', array: [0, 1, 2, 3, 4, 5] }
  };
  const project = validProject();
  project.objects = Array.from({ length: 10 }, () => ({ geometry: largeGeometry }));
  assert.equal(schema.validateProjectEnvelope(project), project);

  project.objects.push({ unionParts: [{ geometry: largeGeometry }] });
  assert.throws(() => schema.validateProjectEnvelope(project), /insgesamt zu viele Geometriedaten/);
});

test('nicht-indizierte Meshes müssen aus vollständigen Dreiecken bestehen', () => {
  const valid = {
    attributes: {
      position: { arrayType: 'Float32Array', array: [0,0,0, 1,0,0, 0,1,0], itemSize: 3, normalized: false },
      normal: { arrayType: 'Float32Array', array: [0,0,1, 0,0,1, 0,0,1], itemSize: 3, normalized: false }
    }
  };
  assert.equal(schema.validateSerializedGeometry(valid), valid);

  const incomplete = structuredClone(valid);
  incomplete.attributes.position.array.push(1, 1, 0);
  incomplete.attributes.normal.array.push(0, 0, 1);
  assert.throws(() => schema.validateSerializedGeometry(incomplete), /keine vollständigen Dreiecke/);
});

test('Geometrie in beiden v3-Fixtures hat endliche Positionswerte und gültige Indizes', () => {
  for (const name of ['project-v3-minimal.json', 'project-v3-advanced.json']) {
    const fixture = readFixture(name);
    let geometryCount = 0;
    for (const object of fixture.objects) {
      visitGeometry(object, (geometry, label) => {
        geometryCount += 1;
        assert.equal(schema.validateSerializedGeometry(geometry), geometry, name + ': Geometrie-Validator lehnt gültige Fixture-Geometrie ab: ' + label);
        const position = geometry.attributes && geometry.attributes.position;
        assert.ok(position, name + ': Positionsattribut fehlt bei ' + label);
        assert.equal(position.itemSize, 3, name + ': Position itemSize ist nicht 3 bei ' + label);
        assert.ok(Array.isArray(position.array) && position.array.length > 0, name + ': Positionsarray fehlt bei ' + label);
        assert.equal(position.array.length % 3, 0, name + ': Positionsarray ist nicht durch 3 teilbar bei ' + label);
        assert.ok(position.array.every(Number.isFinite), name + ': Positionsarray enthält ungültige Zahlen bei ' + label);
        if (geometry.index) {
          const indices = geometry.index.array;
          assert.ok(Array.isArray(indices) && indices.length > 0, name + ': Indexarray fehlt bei ' + label);
          assert.equal(indices.length % 3, 0, name + ': Indexarray enthält keine vollständigen Dreiecke bei ' + label);
          const vertexCount = position.array.length / 3;
          assert.ok(indices.every(index => Number.isInteger(index) && index >= 0 && index < vertexCount),
            name + ': Index verweist ausserhalb des Positionsarrays bei ' + label);
        }
      });
    }
    assert.ok(geometryCount > 0, name + ': keine Geometrie geprüft');
  }
});
