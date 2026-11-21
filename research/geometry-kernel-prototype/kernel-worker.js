import { OcctKernel } from "occt-wasm";

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run") return;
  let kernel;
  try {
    kernel = await OcctKernel.init({ wasm: "/occt-wasm.wasm" });
    const box = kernel.makeBox(10, 20, 30);
    const volume = kernel.getVolume(box);
    const mesh = kernel.tessellate(box);
    const plate = kernel.makeBox(40, 30, 5);
    let drilledPlate = plate;
    for (const [x, y] of [
      [6, 7], [14, 7], [22, 7], [30, 7],
      [6, 15], [14, 15], [22, 15], [30, 15],
      [6, 23], [14, 23], [22, 23], [30, 23]
    ]) {
      const cutter = kernel.translate(kernel.makeCylinder(1, 5.2), x, y, -0.1);
      drilledPlate = kernel.cut(drilledPlate, cutter);
    }
    const drilledVolume = kernel.getVolume(drilledPlate);
    const expectedDrilledVolume = 6000 - 60 * Math.PI;
    if (Math.abs(drilledVolume - expectedDrilledVolume) > 1e-6) {
      throw new Error(`Worker boolean volume mismatch: expected ${expectedDrilledVolume}, got ${drilledVolume}`);
    }
    const drilledSolidCount = kernel.getShapeType(drilledPlate) === "solid"
      ? 1
      : kernel.subShapeCount(drilledPlate, "solid");
    if (drilledSolidCount !== 1) {
      throw new Error(`Worker expected one solid after 12 holes, got ${drilledSolidCount}`);
    }
    const drilledMesh = kernel.tessellate(drilledPlate);
    if (!drilledMesh.triangleCount || !drilledMesh.positions.length || !drilledMesh.indices.length) {
      throw new Error("Worker failed to tessellate the 12-hole plate");
    }

    // Larger browser-worker stress case: forty through-holes in one plate.
    const patternedPlate = kernel.makeBox(80, 50, 4);
    const patternedHoleCount = 40;
    let patternedResult = patternedPlate;
    for (let row = 0; row < 5; row++) {
      for (let column = 0; column < 8; column++) {
        const x = 8 + column * 9;
        const y = 7 + row * 9;
        const cutter = kernel.translate(kernel.makeCylinder(1.5, 4.2), x, y, -0.1);
        patternedResult = kernel.cut(patternedResult, cutter);
      }
    }
    const patternedVolume = kernel.getVolume(patternedResult);
    const expectedPatternedVolume = 80 * 50 * 4 - patternedHoleCount * Math.PI * 1.5 ** 2 * 4;
    if (Math.abs(patternedVolume - expectedPatternedVolume) > 1e-6) {
      throw new Error(`Worker 40-hole volume mismatch: expected ${expectedPatternedVolume}, got ${patternedVolume}`);
    }
    const patternedSolidCount = kernel.getShapeType(patternedResult) === "solid"
      ? 1
      : kernel.subShapeCount(patternedResult, "solid");
    if (patternedSolidCount !== 1) {
      throw new Error(`Worker expected one solid after 40 holes, got ${patternedSolidCount}`);
    }
    const patternedMesh = kernel.tessellate(patternedResult);
    if (!patternedMesh.triangleCount || !patternedMesh.positions.length || !patternedMesh.indices.length) {
      throw new Error("Worker failed to tessellate the 40-hole plate");
    }

    // Thin-wall boolean: a 0.5 mm radius hole through a 1.2 mm plate.
    const thinPlate = kernel.makeBox(40, 30, 1.2);
    const thinCutter = kernel.translate(kernel.makeCylinder(0.5, 1.4), 20, 15, -0.1);
    const thinResult = kernel.cut(thinPlate, thinCutter);
    const thinVolume = kernel.getVolume(thinResult);
    const expectedThinVolume = 40 * 30 * 1.2 - Math.PI * 0.5 ** 2 * 1.2;
    if (Math.abs(thinVolume - expectedThinVolume) > 1e-6) {
      throw new Error(`Worker thin-wall volume mismatch: expected ${expectedThinVolume}, got ${thinVolume}`);
    }
    const thinSolidCount = kernel.getShapeType(thinResult) === "solid"
      ? 1
      : kernel.subShapeCount(thinResult, "solid");
    if (thinSolidCount !== 1) {
      throw new Error(`Worker expected one thin-plate solid, got ${thinSolidCount}`);
    }
    const thinMesh = kernel.tessellate(thinResult);
    if (!thinMesh.triangleCount || !thinMesh.positions.length || !thinMesh.indices.length) {
      throw new Error("Worker failed to tessellate the thin plate");
    }

    // Explicitly release all tracked shapes and prove the kernel remains reusable.
    kernel.releaseAll();
    const reuseBox = kernel.makeBox(2, 2, 2);
    const reuseVolume = kernel.getVolume(reuseBox);
    if (Math.abs(reuseVolume - 8) > 1e-7) {
      throw new Error(`Worker kernel reuse failed after releaseAll: expected 8, got ${reuseVolume}`);
    }
    kernel.releaseAll();
    self.postMessage({
      status: "passed",
      volume,
      triangleCount: mesh.triangleCount,
      positionValues: mesh.positions.length,
      indexValues: mesh.indices.length,
      booleanStress: {
        holes: 12,
        volume: drilledVolume,
        expectedVolume: expectedDrilledVolume,
        solidCount: drilledSolidCount,
        triangleCount: drilledMesh.triangleCount,
        positionValues: drilledMesh.positions.length,
        indexValues: drilledMesh.indices.length
      },
      patternedStress: {
        holes: patternedHoleCount,
        volume: patternedVolume,
        expectedVolume: expectedPatternedVolume,
        solidCount: patternedSolidCount,
        triangleCount: patternedMesh.triangleCount,
        positionValues: patternedMesh.positions.length,
        indexValues: patternedMesh.indices.length
      },
      thinWallStress: {
        thicknessMM: 1.2,
        radiusMM: 0.5,
        volume: thinVolume,
        expectedVolume: expectedThinVolume,
        solidCount: thinSolidCount,
        triangleCount: thinMesh.triangleCount
      },
      releaseAndReuse: { status: "passed", boxVolume: reuseVolume }
    });
  } catch (error) {
    self.postMessage({
      status: "failed",
      message: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (kernel) kernel[Symbol.dispose]();
  }
});
