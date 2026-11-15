import { OcctKernel } from "occt-wasm";

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run" && event.data?.type !== "stress") return;
  let kernel;
  try {
    kernel = await OcctKernel.init({ wasm: "/occt-wasm.wasm" });

    if (event.data.type === "stress") {
      const base = kernel.makeBox(20, 20, 20);
      const cutter = kernel.translate(kernel.makeCylinder(2, 20), 10, 10, 0);
      self.postMessage({ status: "started" });

      // Deliberately long synchronous work: the browser test terminates this
      // worker while OCCT Boolean operations are running.
      for (let index = 0; index < 100000; index += 1) {
        const result = kernel.cut(base, cutter);
        kernel.release(result);
      }
      self.postMessage({ status: "completed" });
      return;
    }

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
