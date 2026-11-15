import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";

const engineName = process.argv[2] || "chromium";
const browserEngines = { chromium, firefox, webkit };
const browserType = browserEngines[engineName];
assert.ok(browserType, `unsupported browser engine: ${engineName}`);

const launchOptions = { headless: true };
if (engineName === "chromium") launchOptions.args = ["--no-sandbox"];
const browser = await browserType.launch(launchOptions);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://127.0.0.1:4174/worker-smoke.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const status = document.querySelector("#result")?.dataset.status;
    return status === "passed" || status === "failed";
  }, null, { timeout: 45000 });
  const status = await page.locator("#result").getAttribute("data-status");
  const text = await page.locator("#result").textContent();
  assert.equal(status, "passed", text || `OCCT worker did not report success in ${engineName}`);
  const result = JSON.parse(text || "{}");
  assert.ok(Math.abs(result.volume - 6000) < 1e-7,
    `${engineName} worker returned incorrect 10x20x30 box volume`);
  assert.ok(result.triangleCount > 0 && result.positionValues > 0 && result.indexValues > 0,
    `${engineName} worker did not return a usable tessellated mesh`);

  // Terminate a worker while it is performing synchronous OCCT operations.
  // A main-thread timer must still run before termination, proving that the
  // geometry work does not block the page's event loop.
  const abortResult = await page.evaluate(() => new Promise((resolve, reject) => {
    const worker = new Worker("/kernel-worker.js", { type: "module" });
    let settled = false;
    let uiResponsive = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(new Error("stress worker did not start within 15 seconds"));
    }, 15000);
    worker.addEventListener("message", (event) => {
      if (event.data?.status === "started") {
        setTimeout(() => { uiResponsive = true; }, 5);
        setTimeout(() => {
          if (settled) return;
          worker.terminate();
          setTimeout(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve({ started: true, terminated: true, uiResponsive });
          }, 50);
        }, 50);
      } else if (event.data?.status === "completed") {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error("stress worker completed before termination"));
      } else if (event.data?.status === "failed") {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(event.data.message || "stress worker failed"));
      }
    });
    worker.addEventListener("error", (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message || "stress worker emitted an error"));
    });
    worker.postMessage({ type: "stress" });
  }));
  assert.deepEqual(abortResult, { started: true, terminated: true, uiResponsive: true },
    `${engineName} must remain responsive and terminate a busy OCCT worker`);
  assert.deepEqual(errors, [], `${engineName} reported worker, JavaScript, or console errors`);
  console.log(JSON.stringify({ status, browser: engineName, ...result, abort: abortResult }, null, 2));
} finally {
  await browser.close();
}
