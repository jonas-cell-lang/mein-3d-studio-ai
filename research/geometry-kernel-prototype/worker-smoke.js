const result = document.querySelector("#result");
const worker = new Worker(new URL("./kernel-worker.js", import.meta.url), { type: "module" });
worker.addEventListener("message", (event) => {
  result.dataset.status = event.data.status;
  result.textContent = JSON.stringify(event.data);
  worker.terminate();
});
worker.addEventListener("error", (event) => {
  result.dataset.status = "failed";
  result.textContent = event.message || "Worker failed";
  worker.terminate();
});
worker.postMessage({ type: "run" });
