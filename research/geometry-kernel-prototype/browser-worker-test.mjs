import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
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
  assert.equal(status, "passed", text || "OCCT worker did not report success");
  const result = JSON.parse(text || "{}");
  assert.ok(Math.abs(result.volume - 6000) < 1e-7, "worker returned incorrect 10x20x30 box volume");
  assert.ok(result.triangleCount > 0 && result.positionValues > 0 && result.indexValues > 0,
    "worker did not return a usable tessellated mesh");
  assert.equal(result.booleanStress?.holes, 12, "worker did not run the repeated boolean stress case");
  assert.equal(result.booleanStress?.solidCount, 1, "worker boolean result did not retain one solid");
  assert.ok(Math.abs(result.booleanStress.volume - result.booleanStress.expectedVolume) < 1e-6,
    "worker boolean result has incorrect analytic volume");
  assert.ok(result.booleanStress.triangleCount > 0
    && result.booleanStress.positionValues > 0
    && result.booleanStress.indexValues > 0,
  "worker boolean stress result did not produce a usable mesh");
  assert.equal(result.patternedStress?.holes, 40, "worker did not run the 40-hole pattern");
  assert.equal(result.patternedStress?.solidCount, 1, "40-hole result did not retain one solid");
  assert.ok(Math.abs(result.patternedStress.volume - result.patternedStress.expectedVolume) < 1e-6,
    "40-hole pattern has incorrect analytic volume");
  assert.ok(result.patternedStress.triangleCount > 0
    && result.patternedStress.positionValues > 0
    && result.patternedStress.indexValues > 0,
  "40-hole pattern did not produce a usable mesh");
  assert.equal(result.thinWallStress?.thicknessMM, 1.2, "worker did not test the thin plate");
  assert.equal(result.thinWallStress?.solidCount, 1, "thin-wall result did not retain one solid");
  assert.ok(Math.abs(result.thinWallStress.volume - result.thinWallStress.expectedVolume) < 1e-6,
    "thin-wall result has incorrect analytic volume");
  assert.ok(result.thinWallStress.triangleCount > 0, "thin-wall result did not tessellate");
  assert.equal(result.releaseAndReuse?.status, "passed", "kernel could not be reused after releaseAll");
  assert.ok(Math.abs(result.releaseAndReuse.boxVolume - 8) < 1e-7,
    "kernel reuse returned incorrect geometry");
  assert.deepEqual(errors, [], "browser reported worker, JavaScript, or console errors");
  console.log(JSON.stringify({ status, ...result }, null, 2));
} finally {
  await browser.close();
}
