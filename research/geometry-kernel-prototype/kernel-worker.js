import { OcctKernel } from "occt-wasm";

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run") return;
  let kernel;
  try {
    kernel = await OcctKernel.init({ wasm: "/occt-wasm.wasm" });
    const box = kernel.makeBox(10, 20, 30);
    const volume = kernel.getVolume(box);
    const mesh = kernel.tessellate(box);
    self.postMessage({
      status: "passed",
      volume,
      triangleCount: mesh.triangleCount,
      positionValues: mesh.positions.length,
      indexValues: mesh.indices.length
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
