import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const THREE = require('three');
const { createHistory } = require('../src/history.js');

const VERTICES_PER_OBJECT = 999;
const RECORDS_PER_SCENARIO = 5;

function makeObject(index) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(VERTICES_PER_OBJECT * 3);
  for (let i = 0; i < VERTICES_PER_OBJECT; i++) {
    const angle = (i / VERTICES_PER_OBJECT) * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * (1 + index * 0.001);
    positions[i * 3 + 1] = Math.sin(angle) * (1 + index * 0.001);
    positions[i * 3 + 2] = (i % 17) * 0.001;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return {
    geometry,
    material: new THREE.MeshStandardMaterial({ color: 0x4b91ed }),
    position: new THREE.Vector3(index * 0.01, 0, 0),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1),
    userData: { label: 'Benchmark-' + index, locked: false }
  };
}

function cloneState(objects) {
  return objects.map(object => ({
    geometry: object.geometry.clone(),
    material: object.material.clone(),
    position: object.position.clone(),
    rotation: object.rotation.clone(),
    scale: object.scale.clone(),
    userData: JSON.parse(JSON.stringify(object.userData))
  }));
}

function disposeState(state) {
  state.forEach(item => {
    item.geometry.dispose();
    item.material.dispose();
  });
}

function memorySnapshot() {
  const memory = process.memoryUsage();
  return {
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    arrayBuffersBytes: memory.arrayBuffers,
    rssBytes: memory.rss
  };
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
}

async function collectGarbage() {
  if (!global.gc) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    global.gc();
    await new Promise(resolve => setImmediate(resolve));
  }
}

async function runScenario(objectCount) {
  let objects = Array.from({ length: objectCount }, (_, index) => makeObject(index));
  const history = createHistory({
    limit: RECORDS_PER_SCENARIO,
    captureState: () => cloneState(objects),
    restoreState: state => {
      const restored = state.map(item => ({
        geometry: item.geometry.clone(),
        material: item.material.clone(),
        position: item.position.clone(),
        rotation: item.rotation.clone(),
        scale: item.scale.clone(),
        userData: JSON.parse(JSON.stringify(item.userData))
      }));
      disposeState(objects);
      objects = restored;
    },
    disposeState
  });

  await collectGarbage();
  const before = memorySnapshot();
  const recordTimesMs = [];

  for (let step = 0; step < RECORDS_PER_SCENARIO; step++) {
    const start = performance.now();
    history.record();
    recordTimesMs.push(performance.now() - start);
    objects.forEach(object => { object.position.x += 0.01; });
  }

  const afterRecords = memorySnapshot();
  const undoStart = performance.now();
  history.undo();
  const undoMs = performance.now() - undoStart;
  const redoStart = performance.now();
  history.redo();
  const redoMs = performance.now() - redoStart;

  history.dispose();
  const historyAfterDispose = history.getStats();
  disposeState(objects);
  objects = [];
  await collectGarbage();
  const afterDispose = memorySnapshot();

  return {
    historyAfterDispose,
    objectCount,
    verticesPerObject: VERTICES_PER_OBJECT,
    snapshotsRecorded: RECORDS_PER_SCENARIO,
    recordMedianMs: Number(median(recordTimesMs).toFixed(3)),
    undoMs: Number(undoMs.toFixed(3)),
    redoMs: Number(redoMs.toFixed(3)),
    memoryBefore: before,
    memoryAfterSnapshots: afterRecords,
    memoryAfterDisposeAndGC: afterDispose
  };
}

const results = [];
for (const objectCount of [1, 10, 50]) {
  results.push(await runScenario(objectCount));
}
console.log(JSON.stringify({
  benchmark: 'SILMO snapshot-based Undo/Redo baseline',
  node: process.version,
  three: THREE.REVISION,
  note: 'Informative baseline only; no machine-dependent pass/fail thresholds.',
  results
}, null, 2));
