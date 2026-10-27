import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = process.cwd();
const source = path.join(root, 'chrome-extension');
const output = path.join(root, 'public', 'downloads', 'isaiahai-chrome-extension.zip');
const files = ['manifest.json','popup.html','popup.js','service_worker.js','content.js','options.html','options.js','README_INSTALL.txt'];
function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function dosTimeDate() { return { time: 0, date: (46 << 9) | (1 << 5) | 1 }; }
function localHeader(name, crc, compressedSize, size, time, date) {
  const n = Buffer.from(name, 'utf8'); const b = Buffer.alloc(30 + n.length);
  b.writeUInt32LE(0x04034b50,0); b.writeUInt16LE(20,4); b.writeUInt16LE(0x0800,6); b.writeUInt16LE(8,8);
  b.writeUInt16LE(time,10); b.writeUInt16LE(date,12); b.writeUInt32LE(crc,14); b.writeUInt32LE(compressedSize,18);
  b.writeUInt32LE(size,22); b.writeUInt16LE(n.length,26); b.writeUInt16LE(0,28); n.copy(b,30); return b;
}
function centralHeader(name, crc, compressedSize, size, time, date, offset) {
  const n = Buffer.from(name,'utf8'); const b = Buffer.alloc(46 + n.length);
  b.writeUInt32LE(0x02014b50,0); b.writeUInt16LE(20,4); b.writeUInt16LE(20,6); b.writeUInt16LE(0x0800,8); b.writeUInt16LE(8,10);
  b.writeUInt16LE(time,12); b.writeUInt16LE(date,14); b.writeUInt32LE(crc,16); b.writeUInt32LE(compressedSize,20);
  b.writeUInt32LE(size,24); b.writeUInt16LE(n.length,28); b.writeUInt16LE(0,30); b.writeUInt16LE(0,32);
  b.writeUInt16LE(0,34); b.writeUInt16LE(0,36); b.writeUInt32LE(0,38); b.writeUInt32LE(offset,42); n.copy(b,46); return b;
}
const localParts=[]; const centralParts=[]; let offset=0;
for (const name of files) {
  const data=await readFile(path.join(source,name)); const compressed=deflateRawSync(data,{level:9}); const crc=crc32(data);
  const td=dosTimeDate(); const local=localHeader(name,crc,compressed.length,data.length,td.time,td.date);
  centralParts.push(centralHeader(name,crc,compressed.length,data.length,td.time,td.date,offset));
  localParts.push(local,compressed); offset += local.length + compressed.length;
}
const centralOffset=offset; const central=Buffer.concat(centralParts); const end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(0,4); end.writeUInt16LE(0,6); end.writeUInt16LE(files.length,8);
end.writeUInt16LE(files.length,10); end.writeUInt32LE(central.length,12); end.writeUInt32LE(centralOffset,16); end.writeUInt16LE(0,20);
const zip=Buffer.concat([...localParts,central,end]); await mkdir(path.dirname(output),{recursive:true}); await writeFile(output,zip);
console.log('Built Chrome extension ZIP: ' + output + ' (' + zip.length + ' bytes, ' + files.length + ' files).');
console.log('ZIP SHA-256: ' + createHash('sha256').update(zip).digest('hex'));
