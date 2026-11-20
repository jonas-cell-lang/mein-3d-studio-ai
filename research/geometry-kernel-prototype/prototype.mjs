import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { OcctKernel } from "occt-wasm";

const started = performance.now();
const kernel = await OcctKernel.init();
const timings = {};
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

  // Repeated boolean stress: twelve independently positioned through-holes.
  const repeatedCutBase = kernel.makeBox(40, 30, 5);
  let twelveHolePlate = repeatedCutBase;
  for (const [x, y] of [
    [6, 7], [14, 7], [22, 7], [30, 7],
    [6, 15], [14, 15], [22, 15], [30, 15],
    [6, 23], [14, 23], [22, 23], [30, 23]
  ]) {
    const cutter = kernel.translate(kernel.makeCylinder(1, 5.2), x, y, -0.1);
    twelveHolePlate = kernel.cut(twelveHolePlate, cutter);
  }
  closeTo(kernel.getVolume(twelveHolePlate), 6000 - 60 * Math.PI,
    "40x30x5 plate after twelve sequential radius-1 through-holes");
  console.log("Boolean solid diagnostics:", JSON.stringify({
    singleCut: kernel.isSolid(drilled),
    fourHolePlate: kernel.isSolid(fourHolePlate),
    twelveHolePlate: kernel.isSolid(twelveHolePlate)
  }));
  assert.equal(kernel.isSolid(twelveHolePlate), true,
    "repeated boolean cuts must preserve a solid");
  const repeatedCutMesh = kernel.tessellate(twelveHolePlate);
  assert.ok(repeatedCutMesh.triangleCount > 0,
    "repeated boolean result must remain tessellatable");

  // Thin-wall check: a small through-hole in a 1.2 mm plate.
  const thinPlate = kernel.makeBox(40, 30, 1.2);
  const thinPlateCutter = kernel.translate(kernel.makeCylinder(0.5, 1.4), 20, 15, -0.1);
  const thinPlateWithHole = await time("thin-wall-cut", () => kernel.cut(thinPlate, thinPlateCutter));
  closeTo(kernel.getVolume(thinPlateWithHole), 40 * 30 * 1.2 - Math.PI * 0.25 * 1.2,
    "1.2 mm thin plate with radius-0.5 through-hole");
  assert.equal(kernel.isSolid(thinPlateWithHole), true,
    "thin-plate boolean result must remain a solid");

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
      "twelve sequential through-hole booleans with analytic volume and tessellation",
      "thin-plate through-hole with analytic volume",
      "fillet and topological sub-shape queries",
      "mesh tessellation",
      "STEP export/import round trip",
      "controlled failure and continued kernel use",
      "releaseAll and kernel reuse"
    ],
    timingsMs: timings,
    totalMs: Number((performance.now() - started).toFixed(3))
  }, null, 2));
} finally {
  kernel[Symbol.dispose]();
}
