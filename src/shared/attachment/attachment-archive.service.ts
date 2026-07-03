import { AttachmentBuilder } from 'discord.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);

function isImageFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.has(lower.slice(lower.lastIndexOf('.')));
}

interface ArchiveResult {
  files: AttachmentBuilder[];
  archivedCount: number;
  failedCount: number;
  skippedCount: number;
  firstImageFileName: string | null;
}

interface AttachmentLike {
  url: string;
  name: string;
  size: number;
}

interface ArchiveOptions {
  maxSizeBytes: number;
}

const MB = 1024 * 1024;

export class AttachmentArchiveService {
  static maxSizeBytes(mb: number): number {
    return mb * MB;
  }

  async archive(attachments: ReadonlyMap<string, AttachmentLike>, opts: ArchiveOptions): Promise<ArchiveResult> {
    const files: AttachmentBuilder[] = [];
    let archivedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let firstImageFileName: string | null = null;

    for (const [, attachment] of attachments) {
      if (attachment.size > opts.maxSizeBytes) {
        skippedCount++;
        continue;
      }

      try {
        const response = await globalThis.fetch(attachment.url);
        if (!response.ok) {
          failedCount++;
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const file = new AttachmentBuilder(buffer, { name: attachment.name });

        files.push(file);
        archivedCount++;

        if (!firstImageFileName && isImageFilename(attachment.name)) {
          firstImageFileName = attachment.name;
        }
      } catch {
        failedCount++;
      }
    }

    return { files, archivedCount, failedCount, skippedCount, firstImageFileName };
  }
}
