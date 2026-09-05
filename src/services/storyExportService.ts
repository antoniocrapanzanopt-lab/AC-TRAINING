import { InstagramStory, InstagramStorySequence } from '../types/story';
import { renderStoryToCanvas } from './storyCanvasRenderer';

/**
 * Trigger download file nel browser
 */
export const triggerFileDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Esporta e scarica una singola story in formato PNG (1080x1920)
 */
export const exportSingleStoryAsPng = async (
  story: InstagramStory,
  sequence: InstagramStorySequence
): Promise<void> => {
  const canvas = document.createElement('canvas');
  const storyIdx = sequence.stories.findIndex((s) => s.id === story.id);
  renderStoryToCanvas(canvas, story, sequence.settings, {
    totalStories: sequence.stories.length,
    currentStoryIndex: storyIdx >= 0 ? storyIdx : story.order - 1,
    showSafeArea: false,
    showIgMockup: false,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const num = String(story.order).padStart(2, '0');
        const filename = `story_${num}.png`;
        triggerFileDownload(blob, filename);
      }
      resolve();
    }, 'image/png', 1.0);
  });
};

/**
 * Calcolo CRC32 standard
 */
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Crea un archivio ZIP puro senza dipendenze esterne
 */
const createSimpleZip = (files: { name: string; data: Uint8Array }[]): Blob => {
  const fileEntries: {
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc32: number;
    offset: number;
  }[] = [];

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = calculateCrc32(file.data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, file.data.length, true);
    view.setUint32(22, file.data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    chunks.push(localHeader);
    chunks.push(file.data);

    fileEntries.push({
      nameBytes,
      data: file.data,
      crc32: crc,
      offset: currentOffset,
    });

    currentOffset += localHeader.length + file.data.length;
  }

  const centralDirStart = currentOffset;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, entry.crc32, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    cdHeader.set(entry.nameBytes, 46);

    chunks.push(cdHeader);
    currentOffset += cdHeader.length;
  }

  const centralDirSize = currentOffset - centralDirStart;

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, fileEntries.length, true);
  eocdView.setUint16(10, fileEntries.length, true);
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, centralDirStart, true);
  eocdView.setUint16(20, 0, true);

  chunks.push(eocd);

  return new Blob(chunks, { type: 'application/zip' });
};

/**
 * Esporta tutte le stories in un archivio ZIP ordinato (story_01.png ... story_0N.png)
 */
export const exportFullStorySequenceZip = async (
  sequence: InstagramStorySequence,
  onProgress?: (current: number, total: number) => void
): Promise<void> => {
  const stories = sequence.stories || [];
  if (stories.length === 0) return;

  const zipFiles: { name: string; data: Uint8Array }[] = [];

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    if (onProgress) {
      onProgress(i + 1, stories.length);
    }

    const canvas = document.createElement('canvas');
    renderStoryToCanvas(canvas, story, sequence.settings, {
      totalStories: stories.length,
      currentStoryIndex: i,
      showSafeArea: false,
      showIgMockup: false,
    });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });

    if (blob) {
      const arrayBuffer = await blob.arrayBuffer();
      const num = String(i + 1).padStart(2, '0');
      zipFiles.push({
        name: `story_${num}.png`,
        data: new Uint8Array(arrayBuffer),
      });
    }
  }

  // File note sequenza
  const encoder = new TextEncoder();
  const summaryText = [
    `=== SEQUENZA INSTAGRAM STORIES (1080x1920) ===`,
    `Titolo: ${sequence.title || 'Senza titolo'}`,
    `Numero Stories: ${stories.length}`,
    `Template: ${sequence.settings.templateId}`,
    `Data export: ${new Date().toLocaleString()}`,
    ``,
    `=== STRUTTURA DELLE STORIES ===`,
    ...stories.map((s, idx) => `Story ${idx + 1} (${s.type}): ${s.headline} ${s.headlineHighlight ? '- ' + s.headlineHighlight : ''}`),
  ].join('\n');

  zipFiles.push({
    name: 'scaletta_stories.txt',
    data: encoder.encode(summaryText),
  });

  const zipBlob = createSimpleZip(zipFiles);
  const cleanTitle = (sequence.title || 'stories_instagram')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 30);
  triggerFileDownload(zipBlob, `${cleanTitle}_stories.zip`);
};
