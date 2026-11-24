import { AudioTrack } from '../types/music';

const MPEG1_L3_BITRATES = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
];
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000, 0];

function detectMp3AudioHeader(
  bytes: Uint8Array,
  startOffset: number,
): { bitrate: string; sampleRate: string } {
  const limit = Math.min(bytes.length - 4, startOffset + 65536);
  for (let i = Math.max(0, startOffset); i < limit; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
      const versionBits = (bytes[i + 1] >> 3) & 0x03;
      const layerBits = (bytes[i + 1] >> 1) & 0x03;
      const bitrateIdx = (bytes[i + 2] >> 4) & 0x0f;
      const sampleRateIdx = (bytes[i + 2] >> 2) & 0x03;
      if (versionBits === 3 && layerBits === 1) {
        const kbps = MPEG1_L3_BITRATES[bitrateIdx];
        const hz = MPEG1_SAMPLE_RATES[sampleRateIdx];
        if (kbps > 0 && hz > 0) {
          return {
            bitrate: `${kbps} kbps`,
            sampleRate: `${hz} Hz`,
          };
        }
      }
    }
  }
  return { bitrate: 'Unknown', sampleRate: 'Unknown' };
}

function decodeTextFrame(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const encoding = bytes[0];
  const payload = bytes.slice(1);
  try {
    if (encoding === 1 || encoding === 2) {
      const decoder = new TextDecoder(encoding === 1 ? 'utf-16' : 'utf-16be');
      return decoder.decode(payload).replace(/\0+$/g, '').trim();
    }
    if (encoding === 3) {
      return new TextDecoder('utf-8').decode(payload).replace(/\0+$/g, '').trim();
    }
    return new TextDecoder('latin1').decode(payload).replace(/\0+$/g, '').trim();
  } catch {
    return '';
  }
}

function decodeApicFrame(bytes: Uint8Array): string | undefined {
  if (bytes.length < 4) return undefined;
  const encoding = bytes[0];
  let cursor = 1;

  const mimeStart = cursor;
  while (cursor < bytes.length && bytes[cursor] !== 0) {
    cursor++;
  }
  const mime =
    new TextDecoder('latin1').decode(bytes.slice(mimeStart, cursor)) || 'image/jpeg';
  cursor++;

  if (cursor >= bytes.length) return undefined;
  cursor++;

  if (encoding === 1 || encoding === 2) {
    while (cursor + 1 < bytes.length && (bytes[cursor] !== 0 || bytes[cursor + 1] !== 0)) {
      cursor += 2;
    }
    cursor += 2;
  } else {
    while (cursor < bytes.length && bytes[cursor] !== 0) {
      cursor++;
    }
    cursor++;
  }

  if (cursor >= bytes.length) return undefined;
  const imageBytes = bytes.slice(cursor);
  if (imageBytes.length < 16) return undefined;

  const blob = new Blob([imageBytes], { type: mime });
  return URL.createObjectURL(blob);
}

function readAudioDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 180;
      cleanup();
      resolve(Math.max(1, duration));
    };
    audio.onerror = () => {
      cleanup();
      resolve(180);
    };
    audio.src = objectUrl;
  });
}

export async function parseAudioFileToTrack(
  file: File,
  fallbackCoverUrl: string,
): Promise<AudioTrack> {
  const objectUrl = URL.createObjectURL(file);
  const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  let title = baseName;
  let artist = 'Unknown Artist';
  let album = 'Local Library';
  let albumArtist = '';
  let year = '';
  let genre = '';
  let trackNumber = '';
  let lyrics = '';
  let coverUrl = fallbackCoverUrl;
  let bitrate = 'Unknown';
  let sampleRate = 'Unknown';

  try {
    const headerSlice = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
    const bytes = new Uint8Array(headerSlice);
    let audioDataStart = 0;

    if (
      bytes.length >= 10 &&
      bytes[0] === 0x49 &&
      bytes[1] === 0x44 &&
      bytes[2] === 0x33
    ) {
      const version = bytes[3];
      const tagSize =
        ((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f);

      let offset = 10;
      const limit = Math.min(bytes.length, 10 + tagSize);
      audioDataStart = limit;

      while (offset + 10 < limit) {
        const frameId = String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3],
        );

        if (frameId === '\0\0\0\0' || !/^[A-Z0-9]{4}$/.test(frameId)) {
          break;
        }

        const frameSize =
          version === 4
            ? ((bytes[offset + 4] & 0x7f) << 21) |
              ((bytes[offset + 5] & 0x7f) << 14) |
              ((bytes[offset + 6] & 0x7f) << 7) |
              (bytes[offset + 7] & 0x7f)
            : (bytes[offset + 4] << 24) |
              (bytes[offset + 5] << 16) |
              (bytes[offset + 6] << 8) |
              bytes[offset + 7];

        offset += 10;
        if (frameSize <= 0 || offset + frameSize > limit) break;

        const frameData = bytes.slice(offset, offset + frameSize);
        offset += frameSize;

        switch (frameId) {
          case 'TIT2':
            title = decodeTextFrame(frameData) || title;
            break;
          case 'TPE1':
            artist = decodeTextFrame(frameData) || artist;
            break;
          case 'TALB':
            album = decodeTextFrame(frameData) || album;
            break;
          case 'TPE2':
            albumArtist = decodeTextFrame(frameData);
            break;
          case 'TYER':
          case 'TDRC':
            year = decodeTextFrame(frameData).slice(0, 4);
            break;
          case 'TCON':
            genre = decodeTextFrame(frameData);
            break;
          case 'TRCK':
            trackNumber = decodeTextFrame(frameData);
            break;
          case 'USLT':
            lyrics = decodeTextFrame(frameData);
            break;
          case 'APIC': {
            const extracted = decodeApicFrame(frameData);
            if (extracted) coverUrl = extracted;
            break;
          }
        }
      }
    }

    if (ext === 'MP3') {
      const audioHeader = detectMp3AudioHeader(bytes, audioDataStart);
      bitrate = audioHeader.bitrate;
      sampleRate = audioHeader.sampleRate;
    }
  } catch {
    // fallback cleanly to filename metadata
  }

  const durationSeconds = await readAudioDuration(objectUrl);

  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    artist,
    album,
    albumArtist: albumArtist || artist,
    year,
    genre,
    trackNumber,
    durationSeconds,
    durationMs: durationSeconds * 1000,
    filePath: file.webkitRelativePath || file.name,
    fileSizeBytes: file.size,
    mimeType: file.type || `audio/${ext.toLowerCase()}`,
    bitrate,
    sampleRate,
    format: ext,
    sampleInfo:
      bitrate !== 'Unknown'
        ? `${bitrate} · ${sampleRate}`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    coverUrl,
    fileUrl: objectUrl,
    fileName: file.name,
    lyrics,
    isLocalUpload: true,
  };
}
