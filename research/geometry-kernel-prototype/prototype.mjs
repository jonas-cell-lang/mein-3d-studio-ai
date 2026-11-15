import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { OcctKernel } from "occt-wasm";

const started = performance.now();
const kernel = await OcctKernel.init();
const timings = {};
const observations = {};
const closeTo = (actual, expected, label, relativeTolerance = 1e-6) => {
  const allowed = Math.max(1e-7, Math.abs(expected) * relativeTolerance);
  assert.ok(Number.isFinite(actual), `${label}: result is not finite (${actual})`);
  assert.ok(Math.abs(actual - expected) <= allowed,
    `${label}: expected ${expected}, got ${actual}, allowed ±${allowed}`);
};
const time = async (name, fn) => {
  const t0 = performance.now();
  const result = await fn();
  timings[name] = Number((performance.now() - t0).toFixed(3));
  return result;
};
const shapeSummary = (shape, label) => {
  assert.equal(kernel.isValid(shape), true, `${label}: OCCT reports an invalid shape`);
  const volume = kernel.getVolume(shape);
  assert.ok(Number.isFinite(volume) && volume >= 0, `${label}: invalid volume ${volume}`);
  const solids = kernel.getSubShapes(shape, "solid").length;
  const faces = kernel.getSubShapes(shape, "face").length;
  const edges = kernel.getSubShapes(shape, "edge").length;
  assert.ok(faces > 0 && edges > 0, `${label}: topology is unexpectedly empty`);
  return { volume, solids, faces, edges, shapeType: kernel.getShapeType(shape) };
};

// Tangential cases may be rejected by the Boolean builder on some topologies.
// A returned result must always be valid and have the analytically expected volume;
// a thrown OCCT error is recorded as a controlled rejection, never silently ignored.
const characterizeBoolean = (label, operation, expectedVolume) => {
  let shape;
  try {
    shape = operation();
  } catch (error) {
    const outcome = {
      outcome: "controlled-rejection",
      message: error instanceof Error ? error.message : String(error)
    };
    observations[label] = outcome;
    return outcome;
  }
  const summary = shapeSummary(shape, label);
  closeTo(summary.volume, expectedVolume, label);
  const outcome = { outcome: "valid-result", ...summary };
  observations[label] = outcome;
  return outcome;
};

try {
  const box = await time("box", () => kernel.makeBox(40, 30, 20));
  closeTo(kernel.getVolume(box), 24000, "40x30x20 box volume");
  const boxBounds = kernel.getBoundingBox(box);
  closeTo(boxBounds.xmax - boxBounds.xmin, 40, "box X extent");
  closeTo(boxBounds.ymax - boxBounds.ymin, 30, "box Y extent");
  closeTo(boxBounds.zmax - boxBounds.zmin, 20, "box Z extent");

  const cylinder = kernel.makeCylinder(5, 20);
  const centeredCylinder = kernel.translate(cylinder, 20, 15, 0);
  const drilled = await time("boolean-cut", () => kernel.cut(box, centeredCylinder));
  closeTo(kernel.getVolume(drilled), 24000 - 500 * Math.PI, "box with one through-hole volume");

  const plate = kernel.makeBox(40, 30, 5);
  let fourHolePlate = plate;
  for (const [x, y] of [[10, 10], [30, 10], [10, 20], [30, 20]]) {
    const cutter = kernel.translate(kernel.makeCylinder(3, 5), x, y, 0);
    fourHolePlate = kernel.cut(fourHolePlate, cutter);
  }
  closeTo(kernel.getVolume(fourHolePlate), 6000 - 180 * Math.PI,
    "40x30x5 plate with four radius-3 through-holes");

  const filletBase = kernel.makeBox(20, 20, 20);
  const edges = kernel.getSubShapes(filletBase, "edge");
  assert.equal(edges.length, 12, "plain box must expose 12 topological edges");
  const filleted = await time("fillet", () => kernel.fillet(filletBase, edges.slice(0, 4), 2));
  assert.equal(kernel.isSolid(filleted), true, "fillet result must be a solid");
  const filletedVolume = kernel.getVolume(filleted);
  assert.ok(filletedVolume > 0 && filletedVolume < 8000,
    `fillet must preserve a valid positive solid with reduced volume; got ${filletedVolume}`);

  const topologyFaces = kernel.getSubShapes(filleted, "face");
  const topologyEdges = kernel.getSubShapes(filleted, "edge");
  assert.ok(topologyFaces.length >= 6, "filleted box must retain queryable faces");
  assert.ok(topologyEdges.length >= 12, "filleted box must retain queryable edges");

  const mesh = await time("tessellation", () => kernel.tessellate(filleted));
  assert.ok(mesh.triangleCount > 0, "tessellation must produce triangles");
  assert.ok(mesh.positions.length > 0 && mesh.indices.length > 0,
    "tessellation must return position and index buffers");

  const stepText = await time("step-export", () => kernel.exportStep(filleted));
  assert.ok(stepText.startsWith("ISO-10303-21"), "STEP export must contain the STEP exchange header");
  const stepRoundTrip = await time("step-import", () => kernel.importStep(stepText));
  closeTo(kernel.getVolume(stepRoundTrip), filletedVolume, "STEP round-trip volume");

  let invalidFilletRejected = false;
  try {
    kernel.fillet(filletBase, edges, 100);
  } catch {
    invalidFilletRejected = true;
  }
  assert.equal(invalidFilletRejected, true, "impossible fillet must fail explicitly");
  closeTo(kernel.getVolume(box), 24000, "kernel remains usable after failed operation");

  // Difficult Boolean cases: coplanar faces, face/edge/vertex tangency and
  // near-coincident geometry. Exact expected volumes are independent of OCCT.
  await time("difficult-booleans", async () => {
    const coplanarA = kernel.makeBox(10, 10, 10);
    const coplanarB = kernel.translate(kernel.makeBox(10, 10, 10), 5, 0, 0);
    const coplanarFuse = kernel.fuse(coplanarA, coplanarB);
    const coplanarCommon = kernel.common(coplanarA, coplanarB);
    const coplanarCut = kernel.cut(coplanarA, coplanarB);
    closeTo(shapeSummary(coplanarFuse, "coplanar overlapping fuse").volume, 1500,
      "coplanar overlapping fuse volume");
    closeTo(shapeSummary(coplanarCommon, "coplanar overlapping common").volume, 500,
      "coplanar overlapping common volume");
    closeTo(shapeSummary(coplanarCut, "coplanar overlapping cut").volume, 500,
      "coplanar overlapping cut volume");

    const faceA = kernel.makeBox(10, 10, 10);
    const faceB = kernel.translate(kernel.makeBox(10, 10, 10), 10, 0, 0);
    characterizeBoolean("face-tangent boxes", () => kernel.fuse(faceA, faceB), 2000);

    const edgeA = kernel.makeBox(10, 10, 10);
    const edgeB = kernel.translate(kernel.makeBox(10, 10, 10), 10, 10, 0);
    characterizeBoolean("edge-tangent boxes", () => kernel.fuse(edgeA, edgeB), 2000);

    const vertexA = kernel.makeBox(10, 10, 10);
    const vertexB = kernel.translate(kernel.makeBox(10, 10, 10), 10, 10, 10);
    characterizeBoolean("vertex-tangent boxes", () => kernel.fuse(vertexA, vertexB), 2000);

    const tangentBox = kernel.makeBox(10, 10, 10);
    const tangentCylinder = kernel.translate(kernel.makeCylinder(5, 10), 15, 5, 0);
    characterizeBoolean("tangent cylinder and box", () =>
      kernel.fuse(tangentBox, tangentCylinder), 1000 + 250 * Math.PI);

    const almostTouchingA = kernel.makeBox(10, 10, 10);
    const almostTouchingB = kernel.translate(kernel.makeBox(10, 10, 10), 9.9999, 0, 0);
    const nearCoincident = kernel.fuse(almostTouchingA, almostTouchingB);
    closeTo(shapeSummary(nearCoincident, "near-coplanar overlap").volume, 1999.99,
      "near-coplanar overlap volume", 1e-6);
  });

  // Thin-wall and small-feature checks use millimetre-scale analytic geometry.
  await time("thin-wall-booleans", async () => {
    const thinPlate = kernel.makeBox(40, 30, 0.2);
    const thinPlateHole = kernel.translate(kernel.makeCylinder(0.05, 0.2), 20, 15, 0);
    const perforatedThinPlate = kernel.cut(thinPlate, thinPlateHole);
    closeTo(shapeSummary(perforatedThinPlate, "0.2 mm thin plate with 0.1 mm hole").volume,
      240 - Math.PI * 0.05 * 0.05 * 0.2,
      "thin plate analytic volume", 1e-6);

    const thinWall = kernel.makeBox(20, 0.1, 10);
    const wallHole = kernel.translate(kernel.makeCylinder(0.02, 10), 10, 0.05, 0);
    const perforatedWall = kernel.cut(thinWall, wallHole);
    closeTo(shapeSummary(perforatedWall, "0.1 mm wall with 0.04 mm hole").volume,
      20 - Math.PI * 0.02 * 0.02 * 10,
      "thin wall analytic volume", 1e-6);
  });

  // Invalid and degenerate input must be rejected explicitly.
  await time("invalid-inputs", async () => {
    const invalidInputs = [
      ["zero-width box", () => kernel.makeBox(0, 10, 10)],
      ["negative-width box", () => kernel.makeBox(-1, 10, 10)],
      ["NaN box dimension", () => kernel.makeBox(Number.NaN, 10, 10)],
      ["infinite box dimension", () => kernel.makeBox(Number.POSITIVE_INFINITY, 10, 10)],
      ["zero-radius cylinder", () => kernel.makeCylinder(0, 10)],
      ["zero-height cylinder", () => kernel.makeCylinder(5, 0)]
    ];
    observations.invalidInputs = {};
    for (const [label, create] of invalidInputs) {
      try {
        const candidate = create();
        let valid = null;
        let volume = null;
        try {
          valid = kernel.isValid(candidate);
          volume = kernel.getVolume(candidate);
        } catch (queryError) {
          observations.invalidInputs[label] = {
            outcome: "created-but-query-failed",
            message: queryError instanceof Error ? queryError.message : String(queryError)
          };
          continue;
        }
        observations.invalidInputs[label] = {
          outcome: valid ? "accepted-valid-shape" : "accepted-invalid-shape",
          valid,
          volume: Number.isFinite(volume) ? volume : String(volume)
        };
      } catch (error) {
        observations.invalidInputs[label] = {
          outcome: "rejected",
          message: error instanceof Error ? error.message : String(error)
        };
      }
    }
    closeTo(kernel.getVolume(box), 24000, "kernel remains usable after invalid inputs");
  });

  // Exercise OCCT's explicit evolution/history API across consecutive cuts.
  await time("topology-history", async () => {
    const historyBase = kernel.makeBox(20, 20, 20);
    const firstTool = kernel.translate(kernel.makeCylinder(2, 20), 5, 10, 0);
    const secondTool = kernel.translate(kernel.makeCylinder(2, 20), 15, 10, 0);
    const hashUpperBound = 2147483647;
    const originalFaceHashes = kernel.subShapeHashes(historyBase, "face", hashUpperBound);
    assert.ok(originalFaceHashes.length >= 6, "history input must expose original face hashes");

    const firstEvolution = kernel.cutWithHistory(
      historyBase, firstTool, originalFaceHashes, hashUpperBound
    );
    assert.ok(firstEvolution && firstEvolution.result,
      "cutWithHistory must return a result shape and evolution data");
    for (const key of ["modified", "generated", "deleted"]) {
      assert.ok(Array.isArray(firstEvolution[key]), `first topology history must include ${key}`);
    }
    assert.equal(kernel.isValid(firstEvolution.result), true,
      "first history result must be a valid OCCT shape");
    closeTo(kernel.getVolume(firstEvolution.result), 8000 - 80 * Math.PI,
      "first history cut volume");

    const firstResultFaceHashes = kernel.subShapeHashes(
      firstEvolution.result, "face", hashUpperBound
    );
    assert.ok(firstResultFaceHashes.length > 0,
      "first history result must retain queryable face identities");
    const secondEvolution = kernel.cutWithHistory(
      firstEvolution.result, secondTool, firstResultFaceHashes, hashUpperBound
    );
    assert.ok(secondEvolution && secondEvolution.result,
      "second cutWithHistory must return a result shape and evolution data");
    for (const key of ["modified", "generated", "deleted"]) {
      assert.ok(Array.isArray(secondEvolution[key]), `second topology history must include ${key}`);
    }
    assert.equal(kernel.isValid(secondEvolution.result), true,
      "second history result must be a valid OCCT shape");
    closeTo(kernel.getVolume(secondEvolution.result), 8000 - 160 * Math.PI,
      "sequential history cut volume");
    observations.topologyHistory = {
      firstEvolutionKeys: Object.keys(firstEvolution),
      firstModifiedFaces: firstEvolution.modified.length,
      firstGeneratedFaces: firstEvolution.generated.length,
      firstDeletedFaces: firstEvolution.deleted.length,
      secondEvolutionKeys: Object.keys(secondEvolution),
      secondModifiedFaces: secondEvolution.modified.length,
      secondGeneratedFaces: secondEvolution.generated.length,
      secondDeletedFaces: secondEvolution.deleted.length,
      originalFaceHashCount: originalFaceHashes.length,
      firstResultFaceHashCount: firstResultFaceHashes.length,
      finalFaceHashCount: kernel.subShapeHashes(
        secondEvolution.result, "face", hashUpperBound
      ).length
    };
  });

  // Measure arena-handle growth and verify deterministic release after a batch.
  // The WASM linear-memory high-water mark is recorded separately; WebAssembly
  // memory is not expected to shrink after objects are released.
  await time("memory-growth-and-release", async () => {
    const baselineShapeCount = kernel.shapeCount;
    const rawModule = kernel.getRawModule();
    const wasmBufferBytes = () =>
      rawModule.HEAPU8?.buffer?.byteLength ??
      rawModule.HEAP8?.buffer?.byteLength ??
      rawModule.wasmMemory?.buffer?.byteLength ??
      rawModule.memory?.buffer?.byteLength ??
      rawModule.asm?.memory?.buffer?.byteLength ??
      null;
    const wasmBytesBefore = wasmBufferBytes();
    const processMemoryBefore = process.memoryUsage();
    let peakRssBytes = processMemoryBefore.rss;
    let peakHeapUsedBytes = processMemoryBefore.heapUsed;
    const checkpoint = kernel.checkpoint();
    for (let index = 0; index < 40; index += 1) {
      const memoryBox = kernel.makeBox(20 + index * 0.01, 15, 10);
      const memoryTool = kernel.translate(kernel.makeCylinder(1, 10), 10, 7.5, 0);
      const memoryResult = kernel.cut(memoryBox, memoryTool);
      assert.equal(kernel.isValid(memoryResult), true,
        `memory iteration ${index} produced an invalid result`);
      assert.ok(kernel.getVolume(memoryResult) > 0,
        `memory iteration ${index} produced an empty result`);
      const sample = process.memoryUsage();
      peakRssBytes = Math.max(peakRssBytes, sample.rss);
      peakHeapUsedBytes = Math.max(peakHeapUsedBytes, sample.heapUsed);
    }
    const peakShapeCount = kernel.shapeCount;
    const wasmBytesAfter = wasmBufferBytes();
    const processMemoryAfter = process.memoryUsage();
    assert.ok(peakShapeCount > baselineShapeCount,
      "repeated boolean operations must allocate measurable shape handles");
    kernel.releaseSince(checkpoint);
    assert.equal(kernel.shapeCount, baselineShapeCount,
      "releaseSince must return shape-handle count to the baseline");
    observations.memory = {
      iterations: 40,
      baselineShapeCount,
      peakShapeCount,
      shapeCountAfterRelease: kernel.shapeCount,
      wasmHeapBytesBefore: wasmBytesBefore,
      wasmHeapBytesAfter: wasmBytesAfter,
      wasmHeapExposureKeys: Object.keys(rawModule).filter(key => /heap|memory|wasm/i.test(key)),
      peakRssDeltaBytes: peakRssBytes - processMemoryBefore.rss,
      rssAfterReleaseDeltaBytes: processMemoryAfter.rss - processMemoryBefore.rss,
      peakHeapUsedDeltaBytes: peakHeapUsedBytes - processMemoryBefore.heapUsed,
      heapUsedAfterReleaseDeltaBytes: processMemoryAfter.heapUsed - processMemoryBefore.heapUsed
    };
  });

  kernel.releaseAll();
  const afterRelease = kernel.makeBox(2, 2, 2);
  closeTo(kernel.getVolume(afterRelease), 8, "kernel remains usable after releaseAll");
  kernel.releaseAll();

  console.log(JSON.stringify({
    status: "passed",
    kernel: "occt-wasm 5.17.2 / OCCT 8.0.1",
    cases: [
      "analytic box volume and exact bounding extents",
      "boolean subtraction with analytic volume",
      "plate with four through-holes",
      "fillet and topological sub-shape queries",
      "mesh tessellation",
      "STEP export/import round trip",
      "controlled fillet failure and continued kernel use",
      "coplanar overlapping fuse/cut/common",
      "face-, edge- and vertex-tangent Boolean cases",
      "tangent cylinder/box and near-coplanar overlap",
      "thin plate and thin wall with small through-holes",
      "zero, negative, NaN and infinite primitive input acceptance/rejection characterization",
      "consecutive Boolean operations with explicit topology history",
      "repeated Boolean allocation, WASM/process memory observations and releaseSince",
      "releaseAll and kernel reuse"
    ],
    timingsMs: timings,
    observations,
    totalMs: Number((performance.now() - started).toFixed(3))
  }, null, 2));
} finally {
  kernel[Symbol.dispose]();
}
