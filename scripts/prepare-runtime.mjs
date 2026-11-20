import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const runtimeFiles = [
  ['node_modules/three/build/three.min.js', 'vendor/three/three.min.js'],
  ['node_modules/three/examples/js/loaders/STLLoader.js', 'vendor/three/STLLoader.js'],
  ['node_modules/three/examples/js/exporters/STLExporter.js', 'vendor/three/STLExporter.js'],
  ['node_modules/three/LICENSE', 'vendor/three/LICENSE']
];

for (const [sourceRelative, targetRelative] of runtimeFiles) {
  const source = join(root, sourceRelative);
  const target = join(root, targetRelative);
  try {
    const info = await stat(source);
    if (!info.isFile() || info.size === 0) throw new Error('Datei ist leer oder kein reguläres File.');
  } catch (error) {
    throw new Error(`Three.js-Runtime-Datei fehlt: ${sourceRelative}. Bitte zuerst npm ci ausführen. ${error.message}`);
  }
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log(`Bereitgestellt: ${targetRelative}`);
}

console.log('Three.js r128 und beide STL-Erweiterungen wurden lokal bereitgestellt.');
