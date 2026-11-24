import { ANDROID_PROJECT_FILES } from '../data/androidComposeProject';
import { AndroidFileId } from '../types/music';

function resolveRepoPath(fileId: AndroidFileId): string {
  switch (fileId) {
    case '.github/workflows/android-build.yml':
    case 'settings.gradle.kts':
    case 'build.gradle.kts':
    case 'gradle/libs.versions.toml':
    case 'gradle.properties':
    case 'app/build.gradle.kts':
      return fileId;
    case 'AndroidManifest.xml':
      return 'app/src/main/AndroidManifest.xml';
    case 'res/values/themes.xml':
      return 'app/src/main/res/values/themes.xml';
    default:
      return `app/src/main/java/com/yourapp/musicplayer/${fileId}`;
  }
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildAndroidProjectZipBlob(): Blob {
  const encoder = new TextEncoder();
  const entries = (Object.keys(ANDROID_PROJECT_FILES) as AndroidFileId[]).map(
    (fileId) => {
      const path = resolveRepoPath(fileId);
      const nameBytes = encoder.encode(path);
      const dataBytes = encoder.encode(ANDROID_PROJECT_FILES[fileId]);
      return {
        nameBytes,
        dataBytes,
        crc: crc32(dataBytes),
      };
    },
  );

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const localHeader = new Uint8Array(30 + entry.nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, entry.crc, true);
    lv.setUint32(18, entry.dataBytes.length, true);
    lv.setUint32(22, entry.dataBytes.length, true);
    lv.setUint16(26, entry.nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(entry.nameBytes, 30);

    localParts.push(localHeader, entry.dataBytes);

    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, entry.crc, true);
    cv.setUint32(20, entry.dataBytes.length, true);
    cv.setUint32(24, entry.dataBytes.length, true);
    cv.setUint16(28, entry.nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(entry.nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + entry.dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobParts: BlobPart[] = [
    ...localParts.map((part) => new Uint8Array(part)),
    ...centralParts.map((part) => new Uint8Array(part)),
    new Uint8Array(eocd),
  ];

  return new Blob(blobParts, { type: 'application/zip' });
}
