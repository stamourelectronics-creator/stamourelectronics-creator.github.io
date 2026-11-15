'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function writeManifest(root, filename, manifestName) {
  const binaryPath = path.join(root, 'release', filename);
  const data = await fs.readFile(binaryPath);
  const stats = await fs.stat(binaryPath);
  const sha512 = crypto.createHash('sha512').update(data).digest('base64');
  const safeName = filename.replace(/'/g, "''");
  const manifest = [
    'version: ' + pkg.version,
    'files:',
    '  - url: "' + safeName + '"',
    '    sha512: "' + sha512 + '"',
    '    size: ' + stats.size,
    'path: "' + safeName + '"',
    'sha512: "' + sha512 + '"',
    "releaseDate: '" + new Date().toISOString() + "'",
    ''
  ].join('\n');
  await fs.writeFile(path.join(root, 'release', manifestName), manifest, 'utf8');
  process.stdout.write('Created ' + manifestName + ' for ' + filename + ' (' + stats.size + ' bytes).\n');
}

let pkg;
async function main() {
  const root = path.resolve(__dirname, '..');
  pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const platform = String(process.argv[2] || 'win').toLowerCase();
  if (platform === 'linux') {
    await writeManifest(root, 'IsaiahSearch-' + pkg.version + '-x64.AppImage', 'latest-linux.yml');
    return;
  }
  if (platform === 'win' || platform === 'windows') {
    await writeManifest(root, 'IsaiahSearch-Setup-' + pkg.version + '-x64.exe', 'latest.yml');
    return;
  }
  throw new Error('Specify win or linux as the manifest platform.');
}

main().catch((error) => {
  process.stderr.write((error && error.stack) || String(error));
  process.exitCode = 1;
});
