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
  assert.deepEqual(errors, [], "browser reported worker, JavaScript, or console errors");
  console.log(JSON.stringify({ status, ...result }, null, 2));
} finally {
  await browser.close();
}
