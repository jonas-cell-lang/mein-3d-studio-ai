const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('three');

globalThis.THREE = THREE;
const tolerances = require('../src/tolerances.js');
globalThis.SILMOTolerances = tolerances;
const sketchGeometry = require('../src/sketch-geometry.js');

function meshVolume(geometry) {
  const positions = geometry.attributes.position;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let volume = 0;
  for (let i = 0; i < positions.count; i += 3) {
    a.fromBufferAttribute(positions, i);
    b.fromBufferAttribute(positions, i + 1);
    c.fromBufferAttribute(positions, i + 2);
    volume += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return Math.abs(volume);
}

test('Skizzenextrusion erstellt einen korrekt begrenzten Quader', () => {
  const shape = new THREE.Shape();
  shape.moveTo(-2, -1.5); shape.lineTo(2, -1.5);
  shape.lineTo(2, 1.5); shape.lineTo(-2, 1.5); shape.closePath();
  const geometry = sketchGeometry.createExtrusionGeometry(shape, { depth: 2, bevelEnabled: false });
  try {
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.deepEqual(size.toArray(), [4, 3, 2]);
    assert.ok(Math.abs(meshVolume(geometry) - 24) < 1e-6);
    assert.ok(geometry.boundingSphere && geometry.attributes.normal);
    for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
  } finally {
    geometry.dispose();
  }
});

test('Skizzenextrusion erhält echte Innenlöcher mit korrektem Volumen', () => {
  const shape = new THREE.Shape();
  shape.moveTo(-2, -1.5); shape.lineTo(2, -1.5);
  shape.lineTo(2, 1.5); shape.lineTo(-2, 1.5); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-0.5, -0.5); hole.lineTo(-0.5, 0.5);
  hole.lineTo(0.5, 0.5); hole.lineTo(0.5, -0.5); hole.closePath();
  shape.holes.push(hole);
  const geometry = sketchGeometry.createExtrusionGeometry(shape, { depth: 2, bevelEnabled: false });
  try {
    assert.equal(shape.holes.length, 1);
    assert.ok(Math.abs(meshVolume(geometry) - 22) < 1e-5);
    assert.deepEqual(geometry.boundingBox.getSize(new THREE.Vector3()).toArray(), [4, 3, 2]);
  } finally {
    geometry.dispose();
  }
});

test('Skizzenextrusion unterstützt Kreisprofile und getrennte Geometrieinstanzen', () => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  const options = { depth: 3, bevelEnabled: false, curveSegments: 48 };
  const first = sketchGeometry.createExtrusionGeometry(shape, options);
  const second = sketchGeometry.createExtrusionGeometry(shape, options);
  try {
    assert.notEqual(first, second);
    assert.deepEqual(first.boundingBox.getSize(new THREE.Vector3()).toArray(), [2, 2, 3]);
    assert.ok(Math.abs(meshVolume(first) - Math.PI * 3) < 0.03);
  } finally {
    first.dispose();
    second.dispose();
  }
});

test('Skizzenextrusion lehnt ein fehlendes Profil kontrolliert ab', () => {
  assert.throws(() => sketchGeometry.createExtrusionGeometry(null, { depth: 1 }), /gültiges 2D-Profil/);
  assert.equal(Object.isFrozen(sketchGeometry), true);
});

test('parametrische Skizzenprofile behalten ihre definierten Aussenabmessungen', () => {
  const cases = [
    ['rectangle', { width: 4, depth: 3 }, 0, [4, 3]],
    ['circle', { width: 4, depth: 4 }, 0, [4, 4]],
    ['ellipse', { width: 4, depth: 2 }, 0, [4, 2]],
    ['triangle', { width: 4, depth: 3 }, 0, [4, 3]],
    ['roundedRectangle', { width: 4, depth: 3 }, 0.5, [4, 3]]
  ];
  for (const [type, dimensions, radius, expected] of cases) {
    const shape = sketchGeometry.createParametricProfile(type, dimensions, radius);
    const geometry = sketchGeometry.createExtrusionGeometry(shape, { depth: 1, bevelEnabled: false });
    try {
      const size = geometry.boundingBox.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.x - expected[0]) < 1e-6, type + ' Breite');
      assert.ok(Math.abs(size.y - expected[1]) < 1e-6, type + ' Tiefe');
      assert.ok(Math.abs(size.z - 1) < 1e-6, type + ' Höhe');
      assert.ok(meshVolume(geometry) > 0, type + ' muss ein Volumen erzeugen');
    } finally {
      geometry.dispose();
    }
  }
});

test('abgerundetes Profil unterstützt die umgekehrte Konturrichtung für Innenkonturen', () => {
  const hole = new THREE.Path();
  sketchGeometry.addRoundedRectPath(hole, 2, 1, 0.2, 0, 0, true);
  hole.closePath();
  assert.ok(hole.getPoints(8).length >= 8);
});

test('abgerundetes Profil verwendet die benannte Mindest-Eckenradiusgrenze', () => {
  const shape = sketchGeometry.createParametricProfile('roundedRectangle', { width: 4, depth: 3 }, 0);
  const points = shape.getPoints(8);
  assert.ok(Math.abs(points[0].x - (-2 + tolerances.SKETCH_PROFILE_MIN_CORNER_RADIUS_WORLD_UNITS)) < 1e-9);
});

test('parametrische Profile lehnen ungültige Abmessungen kontrolliert ab', () => {
  assert.throws(() => sketchGeometry.createParametricProfile('rectangle', { width: 0, depth: 2 }), /positive Abmessungen/);
});

test('Loft-Kontur-Resampling behält die Mindest-Umfangsgrenze bei', () => {
  assert.throws(
    () => sketchGeometry.resampleClosedOutline([[0, 0], [1e-9, 0], [0, 1e-9]], 3),
    /Profilkontur ist ungültig/
  );
  const accepted = sketchGeometry.resampleClosedOutline(
    [[0, 0], [1e-9, 0], [0, 1e-9]], 3, 1e-10
  );
  assert.equal(accepted.length, 3);
});

test('Loft-Geometrie verbindet zwei geschlossene Ringe mit Sollabmessungen und Volumen', () => {
  const lower = [
    new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0)
  ];
  const upper = lower.map(point => point.clone().add(new THREE.Vector3(0, 0, 2)));
  const geometry = sketchGeometry.createLoftGeometry(lower, upper);
  try {
    assert.deepEqual(geometry.boundingBox.getSize(new THREE.Vector3()).toArray(), [2, 2, 2]);
    assert.ok(Math.abs(meshVolume(geometry) - 8) < 1e-5);
    assert.ok(geometry.attributes.normal);
  } finally {
    geometry.dispose();
  }
});


test('Loft unterstützt geneigte und unterschiedlich ausgerichtete planare Profile', () => {
  const lower = [
    new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0)
  ];
  const upper = [
    new THREE.Vector3(-0.8, -0.8, 2), new THREE.Vector3(0.8, -0.8, 2.4),
    new THREE.Vector3(0.8, 0.8, 2.8), new THREE.Vector3(-0.8, 0.8, 2.4)
  ];
  const geometry = sketchGeometry.createLoftGeometry(lower, upper);
  try {
    assert.ok(geometry.boundingBox.getSize(new THREE.Vector3()).z > 2);
    assert.ok(geometry.attributes.normal);
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    assert.ok(meshVolume(geometry) > 0);
  } finally {
    geometry.dispose();
  }
});

test('Loft richtet Startpunkt und Laufrichtung gegensätzlicher Profilkonturen aus', () => {
  const lower = [
    new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0),
    new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0)
  ];
  const upper = lower.slice().reverse().map(point => point.clone().add(new THREE.Vector3(0, 0, 2)));
  const geometry = sketchGeometry.createLoftGeometry(lower, upper);
  try {
    assert.ok(Math.abs(meshVolume(geometry) - 8) < 1e-5);
    assert.deepEqual(geometry.boundingBox.getSize(new THREE.Vector3()).toArray(), [2, 2, 2]);
  } finally {
    geometry.dispose();
  }
});

test('Loft unterstützt durchgehende Innenkonturen und erhält analytisches Rohrvolumen', () => {
  const outerA = [
    new THREE.Vector3(-2, -2, 0), new THREE.Vector3(2, -2, 0),
    new THREE.Vector3(2, 2, 0), new THREE.Vector3(-2, 2, 0)
  ];
  const outerB = outerA.map(point => point.clone().add(new THREE.Vector3(0, 0, 3)));
  const holeA = [
    new THREE.Vector3(-1, -1, 0), new THREE.Vector3(-1, 1, 0),
    new THREE.Vector3(1, 1, 0), new THREE.Vector3(1, -1, 0)
  ];
  const holeB = holeA.map(point => point.clone().add(new THREE.Vector3(0, 0, 3)));
  const geometry = sketchGeometry.createLoftGeometry(outerA, outerB, { holesA: [holeA], holesB: [holeB] });
  try {
    assert.ok(Math.abs(meshVolume(geometry) - 36) < 1e-5);
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.deepEqual(size.toArray(), [4, 4, 3]);
  } finally {
    geometry.dispose();
  }
});

test('Loft weist nicht planare Profile und nicht passende Innenkonturen zurück', () => {
  const lower = [
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0),
    new THREE.Vector3(2, 2, 0), new THREE.Vector3(0, 2, 0)
  ];
  const upper = lower.map(point => point.clone().add(new THREE.Vector3(0, 0, 2)));
  const warped = upper.map(point => point.clone());
  warped[2].z += 0.2;
  assert.throws(() => sketchGeometry.createLoftGeometry(lower, warped), /planar/);
  const warpedHole = lower.map(point => point.clone().add(new THREE.Vector3(0.5, 0.5, 0)));
  warpedHole[2].z += 0.2;
  assert.throws(() => sketchGeometry.createLoftGeometry(lower, upper, {
    holesA: [lower.map(point => point.clone().multiplyScalar(0.25))],
    holesB: [warpedHole]
  }), /planar/);
  assert.throws(() => sketchGeometry.createLoftGeometry(lower, upper, { holesA: [lower], holesB: [] }), /paarweise gültige/);
});

test('Loft-Kontur wird gleichmässig abgetastet und ungültige Konturen abgewiesen', () => {
  const outline = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const sampled = sketchGeometry.resampleClosedOutline(outline, 32, 0.001);
  assert.equal(sampled.length, 32);
  assert.ok(sampled.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  const sampleDistances = sampled.map((point, index) =>
    point.distanceTo(sampled[(index + 1) % sampled.length]));
  assert.ok(sampleDistances.every(distance => Math.abs(distance - 0.25) < 1e-9),
    'Die Abstände entlang des geschlossenen Umfangs müssen gleichmässig sein');
  const reversedSamples = sketchGeometry.resampleClosedOutline(outline.slice().reverse(), 32, 0.001);
  const rotatedSamples = sketchGeometry.resampleClosedOutline([...outline.slice(1), outline[0]], 32, 0.001);
  const pointKey = point => point.toArray().map(value => value.toFixed(8)).join(',');
  assert.deepEqual(reversedSamples.map(pointKey).sort(), sampled.map(pointKey).sort(),
    'Die abgetastete Punktmenge darf nicht von der Umlaufrichtung abhängen');
  assert.deepEqual(rotatedSamples.map(pointKey).sort(), sampled.map(pointKey).sort(),
    'Die abgetastete Punktmenge darf nicht vom Startpunkt abhängen');
  const explicitlyClosed = sketchGeometry.resampleClosedOutline([...outline, [0, 0]], 32, 0.001);
  assert.deepEqual(explicitlyClosed.map(point => point.toArray()), sampled.map(point => point.toArray()));
  assert.throws(() => sketchGeometry.resampleClosedOutline([[0, 0], [0, 0], [0, 0]], 32, 0.001), /ungültig/);
  assert.throws(() => sketchGeometry.resampleClosedOutline([[0, 0], [1, 0], [1, 1]], 10001, 0.001), /begrenzte positive Abtastung/);
  assert.throws(() => sketchGeometry.resampleClosedOutline(outline, 32, 0), /begrenzte positive Abtastung/);
  assert.throws(() => sketchGeometry.resampleClosedOutline(outline, 32, Infinity), /begrenzte positive Abtastung/);
  assert.throws(() => sketchGeometry.resampleClosedOutline([[0, 0], [1, 0], [1, 0], [1, 1]], 32, 0.001), /Nullkanten/);
  assert.throws(() => sketchGeometry.createLoftGeometry([new THREE.Vector3()], []), /gleich viele gültige/);
});

test('Sweep erzeugt entlang eines 3D-Pfads einen endlichen Volumenkörper', () => {
  const outline = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const path = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 3)];
  const geometry = sketchGeometry.createSweepGeometry(outline, path);
  try {
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 2) < 1e-5);
    assert.ok(Math.abs(size.y - 2) < 1e-5);
    assert.ok(Math.abs(size.z - 3) < 1e-5);
    assert.ok(Math.abs(meshVolume(geometry) - 12) < 0.05);
    for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
  } finally {
    geometry.dispose();
  }
});

test('Sweep lehnt offene oder ungültige Eingaben kontrolliert ab', () => {
  assert.throws(() => sketchGeometry.createSweepGeometry([[0, 0], [1, 0]], [new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), /gültiges geschlossenes Profil/);
  assert.throws(() => sketchGeometry.createSweepGeometry([[0, 0], [1, 0], [0, 1]], [new THREE.Vector3()]), /mindestens zwei/);
});

test('CAD-Pfadfactory erhält Linien- und Kurvensemantik', () => {
  const line = sketchGeometry.createPathCurve([[0, 0, 0], [1, 9, 0], [3, 0, 0]], 'line2d');
  assert.ok(Math.abs(line.getLength() - 3) < 1e-9);
  const curve = sketchGeometry.createPathCurve([[0, 0, 0], [1, 1, 0], [2, 0, 0]], 'curve2d');
  assert.ok(curve.getLength() > 2);
  assert.throws(() => sketchGeometry.createPathCurve([[0, 0, 0]], 'line2d'), /mindestens zwei/);
});

test('CAD-Pfadfactory erzeugt ein begrenztes Rohr mit korrektem Radius', () => {
  const result = sketchGeometry.createPathTubeGeometry([[0, 0, 0], [0, 0, 3]], 'line2d', 0.25, 24, 12);
  try {
    const size = result.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 0.5) < 1e-5);
    assert.ok(Math.abs(size.y - 0.5) < 1e-5);
    assert.ok(Math.abs(size.z - 3) < 1e-5);
    assert.ok(Math.abs(result.curve.getLength() - 3) < 1e-9);
    assert.ok(result.geometry.attributes.normal);
  } finally {
    result.geometry.dispose();
  }
});

test('CAD-Pfadfactory lehnt ungültige Rohrparameter ab', () => {
  assert.throws(() => sketchGeometry.createPathTubeGeometry([[0, 0, 0], [0, 0, 1]], 'line2d', 0, 24), /gültig und positiv/);
  assert.throws(() => sketchGeometry.createPathTubeGeometry([[0, 0, 0], [0, 0, 1]], 'line2d', 1, 24, 2), /gültig und positiv/);
});

test('Loft begrenzt Ringpunkte, Innenringe und die gesamte Profilpunktzahl', () => {
  const point = index => new THREE.Vector3(Math.cos(index * Math.PI * 2 / 513), Math.sin(index * Math.PI * 2 / 513), 0);
  const oversized = Array.from({ length: 513 }, (_, index) => point(index));
  const valid = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)];
  assert.throws(() => sketchGeometry.createLoftGeometry(oversized, oversized), /gültige/);
  assert.throws(() => sketchGeometry.createLoftGeometry(valid, valid, {
    holesA: Array.from({ length: 65 }, () => valid), holesB: Array.from({ length: 65 }, () => valid)
  }), /Punkt- und Ringgrenzen/);
  const manyPoints = Array.from({ length: 512 }, (_, index) => point(index));
  const manyHolesA = Array.from({ length: 4 }, (_, hole) =>
    Array.from({ length: 512 }, (_, index) => new THREE.Vector3(Math.cos(index * Math.PI * 2 / 512) * (0.1 + hole * 0.01), Math.sin(index * Math.PI * 2 / 512) * (0.1 + hole * 0.01), 0)));
  assert.throws(() => sketchGeometry.createLoftGeometry(manyPoints, manyPoints, {
    holesA: manyHolesA, holesB: manyHolesA
  }), /Punkt- und Ringgrenzen/);
});

test('Rohr- und Pfadfunktionen begrenzen Eingabepunkte und Segmentaufwand', () => {
  const tooManyPathPoints = Array.from({ length: 1001 }, (_, index) => [index, 0, 0]);
  assert.throws(() => sketchGeometry.createPathCurve(tooManyPathPoints, 'curve2d'), /mindestens zwei/);
  assert.throws(() => sketchGeometry.createPathTubeGeometry([[0, 0, 0], [0, 0, 1]], 'line2d', 1, 10001, 8), /gültig und positiv/);
  assert.throws(() => sketchGeometry.createPathTubeGeometry([[0, 0, 0], [0, 0, 1]], 'line2d', 1, 10000, 256), /gültig und positiv/);
});

test('Sweep begrenzt Profil- und Pfadkomplexität', () => {
  const path = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)];
  const oversizedOutline = Array.from({ length: 257 }, (_, index) => [
    Math.cos(index * Math.PI * 2 / 257), Math.sin(index * Math.PI * 2 / 257)
  ]);
  const oversizedPath = Array.from({ length: 257 }, (_, index) => new THREE.Vector3(0, 0, index));
  assert.throws(() => sketchGeometry.createSweepGeometry(oversizedOutline, path), /gültiges geschlossenes Profil/);
  assert.throws(() => sketchGeometry.createSweepGeometry([[0, 0], [1, 0], [0, 1]], oversizedPath), /gültiges geschlossenes Profil/);
});

test('Hohlrahmen-Geometrie erhält Aussenmasse, Wandstärke und Sollvolumen', () => {
  const outline = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const thickness = 0.14, height = 1.2;
  const geometry = sketchGeometry.createContourFrameGeometry(outline, thickness, height, tolerances, 1e-9);
  try {
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x - 2) < 1e-6);
    assert.ok(Math.abs(size.y - 2) < 1e-6);
    assert.ok(Math.abs(size.z - height) < 1e-6);
    const expectedVolume = (4 - Math.pow(2 - 2 * thickness, 2)) * height;
    assert.ok(Math.abs(meshVolume(geometry) - expectedVolume) < 1e-5);
  } finally {
    geometry.dispose();
  }
});

test('Hohlrahmen-Geometrie verwendet die benannte Mindestabmessung als Standard', () => {
  const outline = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  assert.throws(
    () => sketchGeometry.createContourFrameGeometry(outline, 0.1, 1e-10, tolerances),
    /ungültige Abmessungen/
  );
  const geometry = sketchGeometry.createContourFrameGeometry(outline, 0.1, 1e-10, tolerances, 1e-12);
  try {
    assert.ok(geometry.boundingBox.getSize(new THREE.Vector3()).z > 0);
  } finally {
    geometry.dispose();
  }
});

test('Hohlrahmen-Geometrie unterstützt beide Konturrichtungen', () => {
  const ccw = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const cw = ccw.slice().reverse();
  const first = sketchGeometry.createContourFrameGeometry(ccw, 0.1, 0.5, tolerances);
  const second = sketchGeometry.createContourFrameGeometry(cw, 0.1, 0.5, tolerances);
  try {
    assert.ok(Math.abs(meshVolume(first) - meshVolume(second)) < 1e-6);
    assert.deepEqual(first.boundingBox.getSize(new THREE.Vector3()).toArray(), second.boundingBox.getSize(new THREE.Vector3()).toArray());
  } finally {
    first.dispose();
    second.dispose();
  }
});

test('Hohlrahmen-Geometrie weist ungültige und zu enge Konturen kontrolliert zurück', () => {
  assert.throws(() => sketchGeometry.createContourFrameGeometry([[0, 0], [1, 0]], 0.1, 1, tolerances), /gültige Kontur/);
  assert.throws(() => sketchGeometry.createContourFrameGeometry([[0, 0], [1, 0], [0, 1]], 0, 1, tolerances), /positive Wandstärke/);
  assert.throws(() => sketchGeometry.createContourFrameGeometry([[-1, -1], [1, -1], [1, 1], [-1, 1]], 1.2, 1, tolerances), /zu eng|überschneidet/);
});


test('Kantenbearbeitung erzeugt abgerundete und abgefaste Skizzengeometrie', () => {
  const outline = [[-2, -1.5], [2, -1.5], [2, 1.5], [-2, 1.5]];
  const fillet = sketchGeometry.createEdgeTreatmentGeometry(outline, 2, 0.1, 'fillet');
  const chamfer = sketchGeometry.createEdgeTreatmentGeometry(outline, 2, 0.1, 'chamfer');
  try {
    for (const geometry of [fillet, chamfer]) {
      assert.ok(geometry.attributes.position.count > 0);
      assert.ok(geometry.attributes.normal);
      assert.ok(geometry.boundingBox && geometry.boundingSphere);
      assert.ok(meshVolume(geometry) > 0);
      for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value));
      for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value));
    }
    const filletSize = fillet.boundingBox.getSize(new THREE.Vector3());
    const chamferSize = chamfer.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(filletSize.x - 4.2) < 1e-5);
    assert.ok(Math.abs(filletSize.y - 3.2) < 1e-5);
    assert.ok(Math.abs(filletSize.z - 2.2) < 1e-5);
    assert.deepEqual(chamferSize.toArray(), filletSize.toArray());
    assert.ok(fillet.attributes.position.count > chamfer.attributes.position.count,
      'Abrundung muss mehr Segmente als eine einfache Fase verwenden');
  } finally {
    fillet.dispose();
    chamfer.dispose();
  }
});

test('Kantenbearbeitung weist ungültige Konturen und Parameter kontrolliert ab', () => {
  const outline = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry([], 1, 0.1, 'fillet'), /gültige Kontur/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry([[0, 0], [1, 0]], 1, 0.1, 'fillet'), /gültige Kontur/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(outline, 0, 0.1, 'fillet'), /positive Tiefe/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(outline, 1, 0, 'fillet'), /positive Tiefe/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(outline, 1, 0.1, 'unknown'), /gültigen Modus/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(
    [[0, 0], [1, 0], [1, 0], [0, 1]], 1, 0.1, 'fillet'
  ), /Nullkanten/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(
    [[0, 0], [1, 0], [2, 0]], 1, 0.1, 'fillet'
  ), /Konturkanten/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(
    [[0, 0], [2, 2], [0, 2], [2, 0]], 1, 0.1, 'fillet'
  ), /selbstüberschneidende Kontur/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(
    [[0, 0], [3, 0], [3, 2], [1, 0], [0, 2]], 1, 0.1, 'fillet'
  ), /selbstüberschneidende Kontur/);
  assert.throws(() => sketchGeometry.createEdgeTreatmentGeometry(
    [[0, 0], [2, 0], [1, 0], [1, 1], [0, 1]], 1, 0.1, 'fillet'
  ), /überlappenden benachbarten Konturkanten/);
  const concave = sketchGeometry.createEdgeTreatmentGeometry(
    [[0, 0], [3, 0], [3, 3], [1.5, 1.5], [0, 3]], 1, 0.1, 'chamfer'
  );
  try {
    assert.ok(meshVolume(concave) > 0, 'Eine gültige konkave Kontur muss erhalten bleiben');
  } finally {
    concave.dispose();
  }
  const explicitlyClosed = sketchGeometry.createEdgeTreatmentGeometry(
    [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]], 1, 0.1, 'chamfer'
  );
  try {
    assert.ok(explicitlyClosed.attributes.position.count > 0,
      'Eine korrekt geschlossene Kontur darf keinen doppelten Endpunktfehler auslösen');
    assert.ok(meshVolume(explicitlyClosed) > 0);
  } finally {
    explicitlyClosed.dispose();
  }
});


test('Kantenbearbeitung ist unabhängig von der Umlaufrichtung der Kontur', () => {
  const counterClockwise = [[-2, -1], [2, -1], [2, 1], [-2, 1]];
  const clockwise = counterClockwise.slice().reverse();
  for (const mode of ['fillet', 'chamfer']) {
    const forward = sketchGeometry.createEdgeTreatmentGeometry(counterClockwise, 1.5, 0.1, mode);
    const reversed = sketchGeometry.createEdgeTreatmentGeometry(clockwise, 1.5, 0.1, mode);
    try {
      const forwardSize = forward.boundingBox.getSize(new THREE.Vector3()).toArray();
      const reversedSize = reversed.boundingBox.getSize(new THREE.Vector3()).toArray();
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(Math.abs(forwardSize[axis] - reversedSize[axis]) < 1e-6,
          mode + ' muss dieselben Aussenmasse bei umgekehrter Konturrichtung behalten');
      }
      assert.ok(Math.abs(meshVolume(forward) - meshVolume(reversed)) < 1e-5,
        mode + ' muss dasselbe Volumen bei umgekehrter Konturrichtung behalten');
    } finally {
      forward.dispose();
      reversed.dispose();
    }
  }
});
