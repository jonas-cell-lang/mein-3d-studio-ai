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
      }
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
