const rawBase = process.env.SILMO_PAGES_URL;
if (!rawBase) throw new Error('SILMO_PAGES_URL fehlt. Die Pages-URL muss aus dem Deployment-Schritt kommen.');

const baseUrl = new URL(rawBase.endsWith('/') ? rawBase : rawBase + '/');
const timeoutMs = 20_000;
const retryCount = 10;
const retryDelayMs = 5_000;

async function requestWithRetry(relativePath, includeText = false) {
  const url = new URL(relativePath.replace(/^\.\//, ''), baseUrl);
  let lastError;
  for (let attempt = 1; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'cache-control': 'no-cache' }
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      }
      const body = await response.arrayBuffer();
      if (body.byteLength === 0) throw new Error('Antwort ist leer.');
      const contentType = response.headers.get('content-type') || 'nicht angegeben';
      if (relativePath !== 'index.html' && contentType.toLowerCase().includes('text/html')) {
        throw new Error('Statt der Datei wurde HTML ausgeliefert (Content-Type: ' + contentType + ').');
      }
      return { url: url.href, bytes: body.byteLength, contentType, ...(includeText ? { text: new TextDecoder().decode(body) } : {}) };
    } catch (error) {
      lastError = error;
      console.log('[Versuch ' + attempt + '/' + retryCount + '] ' + relativePath + ': ' + error.message);
      if (attempt < retryCount) await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
  throw new Error('Pages-Datei nach ' + retryCount + ' Versuchen nicht erreichbar: ' + relativePath + '\n' + lastError?.message);
}

const index = await requestWithRetry('index.html', true);
const html = index.text;
const scriptPaths = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1])
  .filter(path => !/^https?:\/\//i.test(path));
const requiredRuntime = [
  'vendor/three/three.min.js',
  'vendor/three/STLLoader.js',
  'vendor/three/STLExporter.js',
  'vendor/occt/silmo-occt-worker.js',
  'vendor/occt/occt-wasm.wasm'
];
const paths = [...new Set([...scriptPaths, ...requiredRuntime])];
for (const path of requiredRuntime.slice(0, 3)) {
  if (!scriptPaths.some(scriptPath => (scriptPath.startsWith('./') ? scriptPath.slice(2) : scriptPath) === path)) {
    throw new Error('Three.js-Datei wird nicht direkt in index.html eingebunden: ' + path);
  }
}
console.log('OK index.html: ' + index.bytes + ' Bytes');
const results = await Promise.all(paths.map(requestWithRetry));
for (const result of results) {
  console.log('OK ' + new URL(result.url).pathname + ': ' + result.bytes + ' Bytes (' + result.contentType + ')');
}
console.log('SILMO LIVE PAGES SMOKE TEST BESTANDEN: ' + results.length + ' Skript-/Runtime-Dateien wurden über die veröffentlichte Pages-URL geladen.');
